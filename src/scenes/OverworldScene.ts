import Phaser from 'phaser';
import { MAPS } from '../data/maps';
import type { Dir, MapData } from '../data/maps/types';
import { DIR_VEC } from '../systems/gridMovement';
import { TILE, TILE_INDEX } from '../art/tiles';
import { PLAYER_H } from '../art/player';
import { ENCOUNTER_RATE, rollEncounter } from '../data/encounters';
import { game, resetAfterDefeat } from '../systems/gameState';
import { flash, sweepClose, sweepOpen } from '../systems/transition';
import { audio } from '../systems/audio';
import { PixelText } from '../ui/PixelText';
import { measure } from '../art/font';
import type { BattleResult } from './BattleScene';

export interface OverworldInit { mapId: string; x?: number; y?: number; dir?: Dir }

const STEP_MS = 190;      // duración de un paso (≈ 16 frames GBA)
const TURN_MS = 90;       // pausa al girar sin moverse
const WATER_MS = 420;     // cambio de frame del agua
const WATER = ['water0', 'water1', 'water2'].map((n) => TILE_INDEX[n]);

/** Escena reutilizable: carga cualquier MapData y mueve al jugador por casillas de 16x16. */
export class OverworldScene extends Phaser.Scene {
  private map!: MapData;
  private tx = 0; private ty = 0;
  private facing: Dir = 'down';
  private moving = false;
  private stepParity = 1;
  private turnLockUntil = 0;
  private player!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private waterCells: [number, number][] = [];
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private waterFrame = 0;
  private transitioning = false;
  private grassOverlay!: Phaser.GameObjects.Image;
  private bumping = false;

  constructor() { super('Overworld'); }

  init(data: OverworldInit): void {
    this.map = MAPS[data.mapId];
    const s = this.map.spawn;
    this.tx = data.x ?? s.x; this.ty = data.y ?? s.y;
    this.facing = data.dir ?? s.dir;
    this.moving = false;
    this.transitioning = false;
    this.waterCells = [];
  }

  create(): void {
    const m = this.map;
    const tm = this.make.tilemap({ data: m.ground, tileWidth: TILE, tileHeight: TILE });
    const tileset = tm.addTilesetImage('tileset', 'tileset', TILE, TILE, 0, 0)!;
    this.groundLayer = tm.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    const objects = tm.createBlankLayer('objects', tileset, 0, 0, m.width, m.height)!;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      if (m.objects[y][x] >= 0) objects.putTileAt(m.objects[y][x], x, y);
      if (WATER.includes(m.ground[y][x])) this.waterCells.push([x, y]);
    }
    this.time.addEvent({ delay: WATER_MS, loop: true, callback: () => this.animateWater() });

    this.player = this.add.image(0, 0, `player_${this.facing}_0`).setOrigin(0, 0).setDepth(10);
    this.placePlayer();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, m.width * TILE, m.height * TILE);
    cam.startFollow(this.player, true, 1, 1, -TILE / 2 + 8, -(PLAYER_H - TILE) / 2 + 4);
    cam.roundPixels = true;

    cam.fadeIn(250, 0, 0, 0);
    this.grassOverlay = this.add.image(0, 0, 'grass_overlay').setOrigin(0).setDepth(11).setVisible(false);
    this.updateGrassOverlay(this.tx, this.ty);
    this.scene.bringToTop('UI');
    audio.playMusic('overworld');
    this.showBanner(m.name);
    this.events.on('resume', (_sys: unknown, data?: { result?: BattleResult }) => this.afterBattle(data?.result));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  /** Estado observable (lo usan las capturas automáticas). */
  getState(): { map: string; x: number; y: number; moving: boolean } {
    return { map: this.map.id, x: this.tx, y: this.ty, moving: this.moving || this.transitioning };
  }

  /** Solo depuración: coloca al jugador en una casilla de un mapa. */
  debugTeleport(mapId: string, x: number, y: number, dir: Dir): void {
    this.scene.restart({ mapId, x, y, dir } satisfies OverworldInit);
  }

  private animateWater(): void {
    this.waterFrame = (this.waterFrame + 1) % WATER.length;
    for (const [x, y] of this.waterCells) this.groundLayer.putTileAt(WATER[this.waterFrame], x, y);
  }

  private placePlayer(): void {
    this.player.setPosition(this.tx * TILE, this.ty * TILE - (PLAYER_H - TILE));
    this.player.setTexture(`player_${this.facing}_0`);
  }

  private heldDir(): Dir | null {
    const k = this.keys;
    if (k.UP.isDown || k.W.isDown) return 'up';
    if (k.DOWN.isDown || k.S.isDown) return 'down';
    if (k.LEFT.isDown || k.A.isDown) return 'left';
    if (k.RIGHT.isDown || k.D.isDown) return 'right';
    return null;
  }

  private walkable(x: number, y: number): boolean {
    const m = this.map;
    return x >= 0 && y >= 0 && x < m.width && y < m.height && m.collision[y][x] === 0;
  }

  update(time: number): void {
    if (this.moving || this.transitioning) return;
    const dir = this.heldDir();
    if (!dir) { this.player.setTexture(`player_${this.facing}_0`); this.bumping = false; return; }

    if (dir !== this.facing) {
      // primero se gira; si la tecla sigue pulsada tras una pausa breve, camina
      this.facing = dir;
      this.player.setTexture(`player_${dir}_0`);
      this.turnLockUntil = time + TURN_MS;
      return;
    }
    if (time < this.turnLockUntil) return;

    const [dx, dy] = DIR_VEC[dir];
    const nx = this.tx + dx, ny = this.ty + dy;
    if (!this.walkable(nx, ny)) {
      // choque: se queda mirando hacia la pared con el frame de caminata
      this.player.setTexture(`player_${dir}_${this.stepParity}`);
      if (!this.bumping) { this.bumping = true; audio.sfx('bump'); }
      return;
    }
    this.bumping = false;
    this.step(nx, ny);
  }

  private step(nx: number, ny: number): void {
    this.moving = true;
    this.player.setTexture(`player_${this.facing}_${this.stepParity}`);
    this.stepParity = this.stepParity === 1 ? 2 : 1;
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: ny * TILE - (PLAYER_H - TILE),
      duration: STEP_MS,
      ease: 'Linear',
      onUpdate: (tw) => {
        if (tw.progress > 0.5) this.player.setTexture(`player_${this.facing}_0`);
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
    const warp = this.map.warps.find((w) => w.tiles.some(([x, y]) => x === this.tx && y === this.ty));
    if (warp) {
      this.transitioning = true;
      audio.sfx('warp');
      const cam = this.cameras.main;
      cam.fadeOut(250, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.restart({ mapId: warp.toMap, x: warp.toX, y: warp.toY, dir: warp.dir } satisfies OverworldInit));
      return;
    }
    const tile = this.map.ground[this.ty][this.tx];
    if (tile !== TILE_INDEX.tallGrass) return;
    if (game.safeSteps > 0) { game.safeSteps--; return; }
    if (Math.random() < ENCOUNTER_RATE) void this.startEncounter(rollEncounter(this.map.encounterTable));
  }

  /** Destello + barrido y salto a la escena de combate (esta escena queda en pausa). */
  private async startEncounter(enc: { species: string; level: number }): Promise<void> {
    this.transitioning = true;
    audio.sfx('encounter');
    await flash(this);
    await sweepClose(this);
    this.scene.pause();
    this.scene.launch('Battle', enc);
  }

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

  /** La hierba alta cubre los pies mientras el jugador está (o entra) en una casilla de hierba. */
  private updateGrassOverlay(tx: number, ty: number): void {
    const inGrass = this.map.ground[ty]?.[tx] === TILE_INDEX.tallGrass;
    this.grassOverlay.setVisible(inGrass);
    if (inGrass) this.grassOverlay.setPosition(this.player.x, this.player.y + PLAYER_H - 8);
  }

  /** Cartel con el nombre del mapa que baja desde arriba y se retira solo. */
  private showBanner(name: string): void {
    const bg = this.add.image(0, 0, 'ui_banner').setOrigin(0);
    const text = new PixelText(this, 48 - Math.floor(measure(name) / 2), 6, name);
    const box = this.add.container(72, -24, [bg, ...text.objects]).setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: box, y: 4, duration: 260, ease: 'Sine.easeOut', hold: 1500, yoyo: true, onComplete: () => box.destroy() });
  }

  /** Solo depuración: fuerza un combate con una especie y nivel concretos. */
  debugEncounter(species: string, level: number): void {
    void this.startEncounter({ species, level });
  }
}

