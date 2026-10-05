import Phaser from 'phaser';
import { ATLAS, PLAYER_H, TILE } from '../config';
import { ENCOUNTER_RATE, rollEncounter } from '../data/encounters';
import { mapKey } from '../data/maps';
import { audio } from '../systems/audio';
import { game, resetAfterDefeat } from '../systems/gameState';
import { DIR_VEC, type Dir } from '../systems/gridMovement';
import { poolsFor } from '../systems/pool';
import { flash, sweepClose, sweepOpen } from '../systems/transition';
import { measure } from '../ui/fontMetrics';
import { PixelText } from '../ui/PixelText';
import type { BattleInit, BattleResult } from './BattleScene';

export interface OverworldInit { mapId: string; x?: number; y?: number; dir?: Dir }

interface Warp { x: number; y: number; toMap: string; toX: number; toY: number; dir: Dir }
type Props = Record<string, string | number | boolean>;
type TiledProps = { name: string; value: string | number | boolean }[] | Props | undefined;

const STEP_MS = 190;      // duración de un paso (≈ 16 frames GBA)
const TURN_MS = 90;       // pausa al girar sin moverse
const WATER_MS = 420;     // cambio de frame del agua

/** Tiled guarda las propiedades como lista {name, value}; Phaser puede entregarlas así o ya como objeto. */
const bag = (p: TiledProps): Props => (Array.isArray(p) ? Object.fromEntries(p.map((e) => [e.name, e.value])) : (p ?? {}));
const playerFrame = (dir: Dir, i: number) => `player_${dir}_${i}`;

/**
 * Escena reutilizable: carga cualquier mapa de Tiled (`maps/<id>.json`) y mueve al jugador por casillas.
 * Capas: ground, objects, collision (oculta) y la capa de objetos "entities" (spawn y warps).
 */
export class OverworldScene extends Phaser.Scene {
  private mapId = 'town';
  private req: OverworldInit = { mapId: 'town' };
  private encounterTable = 'town';
  private tx = 0; private ty = 0;
  private facing: Dir = 'down';
  private moving = false;
  private transitioning = false;
  private stepParity = 1;
  private turnLockUntil = 0;
  private bumping = false;
  private player!: Phaser.GameObjects.Image;
  private grassOverlay!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private warps: Warp[] = [];
  private waterCells: [number, number][] = [];
  private waterGids: number[] = [];
  private waterFrame = 0;

  constructor() { super('Overworld'); }

  init(data: OverworldInit): void {
    this.req = data;
    this.mapId = data.mapId;
    this.moving = false;
    this.transitioning = false;
    this.waterCells = [];
    this.waterGids = [];
  }

  create(): void {
    const tm = this.make.tilemap({ key: mapKey(this.mapId) });
    const tileset = tm.addTilesetImage('tileset', 'tileset', TILE, TILE, 0, 0)!;
    this.ground = tm.createLayer('ground', tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    tm.createLayer('objects', tileset, 0, 0);
    this.collision = (tm.createLayer('collision', tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer).setVisible(false);

    const mapProps = bag(tm.properties as TiledProps);
    this.encounterTable = String(mapProps.encounterTable);

    // entidades: punto de aparición y warps (Tiled → capa de objetos "entities")
    const entities = tm.getObjectLayer('entities')?.objects ?? [];
    this.warps = [];
    let spawn = { x: 0, y: 0, dir: 'down' as Dir };
    for (const o of entities) {
      const p = bag(o.properties as TiledProps);
      const x = Math.floor((o.x ?? 0) / TILE), y = Math.floor((o.y ?? 0) / TILE);
      if (o.type === 'spawn') spawn = { x, y, dir: p.dir as Dir };
      else if (o.type === 'warp') this.warps.push({ x, y, toMap: String(p.toMap), toX: Number(p.toX), toY: Number(p.toY), dir: p.dir as Dir });
    }
    this.tx = this.req.x ?? spawn.x; this.ty = this.req.y ?? spawn.y;
    this.facing = this.req.dir ?? spawn.dir;

    // agua animada: los tiles con la propiedad `water` de Tiled y sus 3 frames (`waterFrame`)
    for (const [id, props] of Object.entries(tileset.tileProperties as Record<string, Props>)) {
      if (props.water) this.waterGids[Number(props.waterFrame)] = tileset.firstgid + Number(id);
    }
    this.ground.forEachTile((t) => { if (t.properties?.water) this.waterCells.push([t.x, t.y]); });
    this.time.addEvent({ delay: WATER_MS, loop: true, callback: () => this.animateWater() });

    this.player = this.add.image(0, 0, ATLAS, playerFrame(this.facing, 0)).setOrigin(0, 0).setDepth(10);
    this.player.setPosition(this.tx * TILE, this.ty * TILE - (PLAYER_H - TILE));
    this.grassOverlay = this.add.image(0, 0, ATLAS, 'grass_overlay').setOrigin(0).setDepth(11).setVisible(false);
    this.updateGrassOverlay(this.tx, this.ty);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, tm.widthInPixels, tm.heightInPixels);
    cam.startFollow(this.player, true, 1, 1, -TILE / 2 + 8, -(PLAYER_H - TILE) / 2 + 4);
    cam.roundPixels = true;
    cam.fadeIn(250, 0, 0, 0);

    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    // Los eventos de escena sobreviven al restart: se registra una vez y se retira al apagar.
    this.events.on('resume', this.onResume);
    this.events.once('shutdown', () => this.events.off('resume', this.onResume));

    this.input.keyboard!.on('keydown-ESC', this.openPause);
    this.input.keyboard!.on('keydown-P', this.openPause);

    this.scene.bringToTop('UI');
    audio.playMusic('overworld');
    this.showBanner(String(mapProps.displayName));
  }

  // ---------------------------------------------------------------- estado / depuración

  /** Estado observable (lo usan las capturas automáticas). */
  getState(): { map: string; x: number; y: number; moving: boolean } {
    return { map: this.mapId, x: this.tx, y: this.ty, moving: this.moving || this.transitioning };
  }

  /** Solo depuración: coloca al jugador en una casilla de un mapa. */
  debugTeleport(mapId: string, x: number, y: number, dir: Dir): void {
    this.scene.restart({ mapId, x, y, dir } satisfies OverworldInit);
  }

  /** Solo depuración: fuerza un combate con una especie y nivel concretos. */
  debugEncounter(species: string, level: number): void {
    void this.startEncounter({ species, level });
  }

  // ---------------------------------------------------------------- bucle

  private animateWater(): void {
    this.waterFrame = (this.waterFrame + 1) % this.waterGids.length;
    for (const [x, y] of this.waterCells) this.ground.putTileAt(this.waterGids[this.waterFrame], x, y);
  }

  private heldDir(): Dir | null {
    const k = this.keys;
    if (k.UP.isDown || k.W.isDown) return 'up';
    if (k.DOWN.isDown || k.S.isDown) return 'down';
    if (k.LEFT.isDown || k.A.isDown) return 'left';
    if (k.RIGHT.isDown || k.D.isDown) return 'right';
    return null;
  }

  /** Fuera del mapa o con una casilla en la capa de colisión → no se puede pisar. */
  private walkable(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.collision.tilemap.width && y < this.collision.tilemap.height && !this.collision.hasTileAt(x, y);
  }

  update(time: number): void {
    if (this.moving || this.transitioning) return;
    const dir = this.heldDir();
    if (!dir) { this.player.setFrame(playerFrame(this.facing, 0)); this.bumping = false; return; }

    if (dir !== this.facing) {
      // primero se gira; si la tecla sigue pulsada tras una pausa breve, camina
      this.facing = dir;
      this.player.setFrame(playerFrame(dir, 0));
      this.turnLockUntil = time + TURN_MS;
      return;
    }
    if (time < this.turnLockUntil) return;

    const [dx, dy] = DIR_VEC[dir];
    const nx = this.tx + dx, ny = this.ty + dy;
    if (!this.walkable(nx, ny)) {
      // choque: se queda mirando hacia la pared con el frame de caminata
      this.player.setFrame(playerFrame(dir, this.stepParity));
      if (!this.bumping) { this.bumping = true; audio.sfx('bump'); }
      return;
    }
    this.bumping = false;
    this.step(nx, ny);
  }

  private step(nx: number, ny: number): void {
    this.moving = true;
    this.player.setFrame(playerFrame(this.facing, this.stepParity));
    this.stepParity = this.stepParity === 1 ? 2 : 1;
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: ny * TILE - (PLAYER_H - TILE),
      duration: STEP_MS,
      ease: 'Linear',
      onUpdate: (tw) => {
        if (tw.progress > 0.5) this.player.setFrame(playerFrame(this.facing, 0));
        this.updateGrassOverlay(tw.progress > 0.5 ? nx : this.tx, tw.progress > 0.5 ? ny : this.ty);
      },
      onComplete: () => {
        this.tx = nx; this.ty = ny;
        this.moving = false;
        this.updateGrassOverlay(nx, ny);
        this.onStepEnd();
      },
    });
  }

  /** Tras cada casilla: cambio de mapa si hay warp; si no, posible combate en hierba alta. */
  private onStepEnd(): void {
    const warp = this.warps.find((w) => w.x === this.tx && w.y === this.ty);
    if (warp) {
      this.transitioning = true;
      audio.sfx('warp');
      const cam = this.cameras.main;
      cam.fadeOut(250, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.restart({ mapId: warp.toMap, x: warp.toX, y: warp.toY, dir: warp.dir } satisfies OverworldInit));
      return;
    }
    if (!this.ground.getTileAt(this.tx, this.ty)?.properties?.tallGrass) return;
    if (game.safeSteps > 0) { game.safeSteps--; return; }
    if (Math.random() < ENCOUNTER_RATE) void this.startEncounter(rollEncounter(this.encounterTable));
  }

  // ---------------------------------------------------------------- combate

  /** Destello + barrido y salto a la escena de combate (esta escena queda en pausa). */
  private async startEncounter(enc: BattleInit): Promise<void> {
    this.transitioning = true;
    audio.sfx('encounter');
    await flash(this);
    await sweepClose(this);
    this.scene.pause();
    // La escena de combate es única y persistente: se duerme al terminar y se despierta aquí (sus pools sobreviven).
    if (this.scene.isSleeping('Battle')) this.scene.wake('Battle', enc);
    else this.scene.launch('Battle', enc);
    this.scene.bringToTop('Battle');
    this.scene.bringToTop('UI');
  }

  /** Menú de pausa: solo con el jugador quieto y sin transiciones en curso. */
  private lastResume = 0;
  private openPause = (): void => {
    // el margen evita reabrir la pausa con la misma pulsación de Esc que la cerró
    if (!this.scene.isActive() || this.moving || this.transitioning || performance.now() - this.lastResume < 250) return;
    audio.sfx('select');
    this.scene.pause();
    this.scene.launch('Pause');
    this.scene.bringToTop('Pause');
    this.scene.bringToTop('UI');
  };

  private onResume = (_sys: unknown, data?: { result?: BattleResult }): void => {
    this.lastResume = performance.now();
    if (!data?.result) { this.input.keyboard!.resetKeys(); return; } // vuelta de la pausa
    void this.afterBattle(data.result);
  };

  private async afterBattle(result?: BattleResult): Promise<void> {
    this.input.keyboard!.resetKeys();
    if (result === 'lose') {
      resetAfterDefeat();
      this.scene.restart({ mapId: 'town' } satisfies OverworldInit);
      return;
    }
    game.safeSteps = 3;
    audio.playMusic('overworld');
    await sweepOpen(this);
    this.transitioning = false;
  }

  // ---------------------------------------------------------------- detalles visuales

  /** La hierba alta cubre los pies mientras el jugador está (o entra) en una casilla de hierba. */
  private updateGrassOverlay(tx: number, ty: number): void {
    const inGrass = Boolean(this.ground.getTileAt(tx, ty)?.properties?.tallGrass);
    this.grassOverlay.setVisible(inGrass);
    if (inGrass) this.grassOverlay.setPosition(this.player.x, this.player.y + PLAYER_H - 8);
  }

  /** Cartel con el nombre del mapa que baja desde arriba y se retira solo. */
  private showBanner(name: string): void {
    const pools = poolsFor(this);
    const bg = pools.image('ui_banner');
    const text = new PixelText(this, 48 - Math.floor(measure(name) / 2), 6, name);
    const box = this.add.container(72, -24, [bg, ...text.objects]).setScrollFactor(0).setDepth(900);
    this.tweens.add({
      targets: box, y: 4, duration: 260, ease: 'Sine.easeOut', hold: 1500, yoyo: true,
      onComplete: () => { text.release(); pools.releaseImage(bg); box.destroy(); },
    });
  }
}
