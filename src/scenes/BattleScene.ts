import Phaser from 'phaser';
import { MOVES } from '../data/moves';
import { SPECIES } from '../data/species';
import { TYPE_NAMES, type TypeId } from '../data/types';
import { Battle, type Action, type BattleEvent, type Side } from '../systems/battleEngine';
import { createCreature, type Creature } from '../systems/creature';
import { game } from '../systems/gameState';
import { sweepOpen, sleep } from '../systems/transition';
import { INK, PixelText, wrap } from '../ui/PixelText';
import { StatusBox } from '../ui/StatusBox';
import { PALETTE } from '../art/palette';
import { audio } from '../systems/audio';

export interface BattleInit { species: string; level: number }
export type BattleResult = 'win' | 'lose' | 'run';
type Act = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back';
type Phase = 'intro' | 'message' | 'actions' | 'moves' | 'result' | 'exit';

const KEYMAP: Record<string, Act> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', KeyZ: 'ok', Enter: 'ok', Space: 'ok', KeyX: 'back', Backspace: 'back', Escape: 'back',
};
const hex = (ch: keyof typeof PALETTE) => parseInt(PALETTE[ch].slice(1), 16);
const DISABLED = hex('v');
const TYPE_COLOR: Record<TypeId, number> = { normal: hex('x'), fire: hex('P'), water: hex('j'), grass: hex('c') };

const ENEMY_POS = { x: 172, y: 70 };
const PLAYER_POS = { x: 62, y: 112 };
const TYPE_SPEED_MS = 20;

export class BattleScene extends Phaser.Scene {
  private battle!: Battle;
  private enemyC!: Creature;
  private playerC!: Creature;
  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyBox!: StatusBox;
  private playerBox!: StatusBox;
  private dialogBg!: Phaser.GameObjects.Image;
  private dialogText!: PixelText;
  private moreArrow!: Phaser.GameObjects.Image;
  private menu: Phaser.GameObjects.GameObject[] = [];
  private listeners = new Set<(a: Act) => void>();
  private phase: Phase = 'intro';
  private result: BattleResult | null = null;
  private expGained = 0;
  private cursor = 0;
  private startLevel = 0;

  constructor() { super('Battle'); }

  init(data: BattleInit): void {
    this.playerC = game.player;
    this.enemyC = createCreature(data.species, data.level);
    this.battle = new Battle(this.playerC, this.enemyC);
    this.listeners.clear();
    this.menu = [];
    this.result = null;
    this.expGained = 0;
    this.phase = 'intro';
    this.cursor = 0;
    this.startLevel = this.playerC.level;
  }

  create(): void {
    this.add.image(0, 0, 'battle_bg').setOrigin(0);
    this.enemySprite = this.add.image(330, ENEMY_POS.y, `${this.enemyC.speciesId}_front`).setOrigin(0.5, 1).setDepth(10);
    this.playerSprite = this.add.image(-60, PLAYER_POS.y, `${this.playerC.speciesId}_back`).setOrigin(0.5, 1).setDepth(11);

    this.enemyBox = new StatusBox(this, 4, 10, this.enemyC, false);
    this.playerBox = new StatusBox(this, 124, 68, this.playerC, true);
    this.enemyBox.container.setX(-120);
    this.playerBox.container.setX(250);

    this.dialogBg = this.add.image(0, 112, 'ui_dialog').setOrigin(0).setDepth(100);
    this.dialogText = new PixelText(this, 10, 121, '').setDepth(101);
    this.moreArrow = this.add.image(224, 146, 'ui_more').setOrigin(0).setDepth(102).setVisible(false);
    this.tweens.add({ targets: this.moreArrow, y: 148, duration: 350, yoyo: true, repeat: -1 });

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const a = KEYMAP[e.code];
      if (a) [...this.listeners].forEach((l) => l(a));
    });
    this.events.once('shutdown', () => this.input.keyboard!.removeAllListeners('keydown'));

    this.scene.bringToTop('UI');
    audio.playMusic('battle');
    void this.run();
  }

  /** Estado observable (capturas automáticas y depuración). */
  getState() {
    return {
      phase: this.phase, result: this.result, cursor: this.cursor,
      playerHp: this.playerC.hp, enemyHp: this.enemyC.hp, playerLevel: this.playerC.level, enemy: this.enemyC.speciesId,
    };
  }

  // ---------------------------------------------------------------- flujo

  private async run(): Promise<void> {
    const ename = SPECIES[this.enemyC.speciesId].name.toUpperCase();
    const pname = SPECIES[this.playerC.speciesId].name.toUpperCase();
    await sweepOpen(this);
    await this.slide(this.enemySprite, ENEMY_POS.x, 650);
    await this.slide(this.enemyBox.container, 4, 400);
    await this.say(`¡Un ${ename} salvaje apareció!`);
    await this.say(`¡Adelante, ${pname}!`);
    await Promise.all([this.slide(this.playerSprite, PLAYER_POS.x, 550), this.slide(this.playerBox.container, 124, 400)]);

    while (!this.battle.over) {
      const act = await this.chooseAction();
      let action: Action;
      if (act === 'run') action = { kind: 'run' };
      else if (this.battle.mustStruggle()) {
        await this.say('¡No quedan PP en ningún movimiento!');
        action = { kind: 'fight', moveIndex: 0 };
      } else {
        const mi = await this.chooseMove();
        if (mi === null) continue;
        action = { kind: 'fight', moveIndex: mi };
      }
      await this.playEvents(this.battle.resolveTurn(action));
    }
    await this.finish();
  }

  private async playEvents(events: BattleEvent[]): Promise<void> {
    let lastType: TypeId = 'normal';
    for (const e of events) {
      switch (e.t) {
        case 'text':
          if (e.text.includes('falló')) audio.sfx('miss');
          else if (e.text.includes('Escapaste')) audio.sfx('run');
          await this.say(e.text, e.text.includes('experiencia'));
          break;
        case 'move': lastType = e.moveType; await this.lunge(e.side); break;
        case 'hit': await this.hit(e, lastType); break;
        case 'faint': await this.faint(e.side); break;
        case 'exp': this.expGained += e.amount; await this.playerBox.tweenExp(e.from, e.to); break;
        case 'levelUp': await this.levelUp(e); break;
        case 'end': this.result = e.result; break;
      }
    }
  }

  private async finish(): Promise<void> {
    const result = this.result ?? 'run';
    this.phase = 'result';
    if (result !== 'run') await this.showResultPanel(result);
    this.phase = 'exit';
    await new Promise<void>((res) => { this.cameras.main.fadeOut(250, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => res()); });
    this.scene.resume('Overworld', { result });
    this.scene.stop();
  }

  // ---------------------------------------------------------------- diálogo

  private waitAct(accept: (a: Act) => boolean): { promise: Promise<Act>; cancel: () => void } {
    let handler!: (a: Act) => void;
    const promise = new Promise<Act>((res) => { handler = (a) => { if (accept(a)) { this.listeners.delete(handler); res(a); } }; this.listeners.add(handler); });
    return { promise, cancel: () => this.listeners.delete(handler) };
  }

  private clearMenu(): void {
    this.menu.forEach((o) => o.destroy());
    this.menu = [];
  }

  /** Muestra un mensaje con efecto máquina de escribir. `hold` espera una pulsación; si no, avanza solo. */
  private async say(text: string, hold = false): Promise<void> {
    this.phase = 'message';
    this.clearMenu();
    this.dialogBg.setTexture('ui_dialog').setVisible(true);
    this.dialogText.setVisible(true);
    this.moreArrow.setVisible(false);
    const lines = text.split('\n').flatMap((l) => wrap(l, 218)).slice(0, 2);
    const full = lines.join('\n');
    const total = full.length;
    this.dialogText.setText('');

    let i = 0;
    await new Promise<void>((res) => {
      const skip = this.waitAct((a) => a === 'ok');
      const timer = this.time.addEvent({
        delay: TYPE_SPEED_MS, loop: true,
        callback: () => { i++; this.dialogText.setText(full.slice(0, i)); if (i >= total) { timer.remove(); skip.cancel(); res(); } },
      });
      void skip.promise.then(() => { if (i < total) { i = total; this.dialogText.setText(full); timer.remove(); res(); } });
    });

    if (hold) {
      this.moreArrow.setVisible(true);
      await this.waitAct((a) => a === 'ok').promise;
      this.moreArrow.setVisible(false);
    } else {
      const w = this.waitAct((a) => a === 'ok');
      await Promise.race([sleep(this, 650), w.promise]);
      w.cancel();
    }
  }

  // ---------------------------------------------------------------- menús

  private async chooseAction(): Promise<'fight' | 'run'> {
    this.phase = 'actions';
    this.clearMenu();
    this.dialogText.setVisible(false);
    this.moreArrow.setVisible(false);
    const pname = SPECIES[this.playerC.speciesId].name.toUpperCase();
    const prompt = this.add.image(0, 112, 'ui_prompt').setOrigin(0).setDepth(110);
    const promptText = new PixelText(this, 10, 121, `¿Qué debería hacer\n${pname}?`).setDepth(111);
    const box = this.add.image(136, 112, 'ui_menu').setOrigin(0).setDepth(110);
    const options: [string, boolean][] = [['LUCHAR', true], ['MOCHILA', false], ['EQUIPO', false], ['HUIR', true]];
    const pos = (i: number) => ({ x: 150 + (i % 2) * 42, y: 124 + Math.floor(i / 2) * 16 });
    const labels = options.map(([t, on], i) => new PixelText(this, pos(i).x, pos(i).y, t, on ? INK : DISABLED, on ? undefined : null).setDepth(111));
    const cursor = this.add.image(0, 0, 'ui_cursor').setOrigin(0).setDepth(112);
    this.menu = [prompt, box, cursor, ...promptText.objects, ...labels.flatMap((l) => l.objects)];

    const place = () => cursor.setPosition(pos(this.cursor).x - 8, pos(this.cursor).y + 1);
    place();
    for (;;) {
      const a = await this.waitAct(() => true).promise;
      if (a === 'left' || a === 'right') { this.cursor ^= 1; audio.sfx('select'); }
      else if (a === 'up' || a === 'down') { this.cursor ^= 2; audio.sfx('select'); }
      else if (a === 'ok' && options[this.cursor][1]) {
        audio.sfx('confirm');
        const choice = this.cursor === 0 ? 'fight' : 'run';
        this.clearMenu();
        return choice;
      }
      place();
    }
  }

  private async chooseMove(): Promise<number | null> {
    this.phase = 'moves';
    this.clearMenu();
    const left = this.add.image(0, 112, 'ui_moves').setOrigin(0).setDepth(110);
    const right = this.add.image(168, 112, 'ui_moveinfo').setOrigin(0).setDepth(110);
    const slots = this.battle.playerMoves();
    const pos = (i: number) => ({ x: 14 + (i % 2) * 78, y: 124 + Math.floor(i / 2) * 16 });
    const names = slots.map((s, i) => new PixelText(this, pos(i).x, pos(i).y, MOVES[s.id].name, s.pp > 0 ? INK : DISABLED).setDepth(111));
    const ppText = new PixelText(this, 176, 121, '').setDepth(111);
    const typeText = new PixelText(this, 176, 137, '').setDepth(111);
    const cursor = this.add.image(0, 0, 'ui_cursor').setOrigin(0).setDepth(112);
    this.menu = [left, right, cursor, ...ppText.objects, ...typeText.objects, ...names.flatMap((n) => n.objects)];

    const refresh = () => {
      const s = slots[this.cursor], m = MOVES[s.id];
      cursor.setPosition(pos(this.cursor).x - 8, pos(this.cursor).y + 1);
      ppText.setText(`PP ${s.pp}/${m.pp}`).setColor(s.pp > 0 ? INK : hex('R'));
      typeText.setText(`TIPO/${TYPE_NAMES[m.type]}`).setColor(TYPE_COLOR[m.type]);
    };
    this.cursor = 0;
    refresh();
    for (;;) {
      const a = await this.waitAct(() => true).promise;
      if (a === 'left' || a === 'right') { this.cursor ^= 1; audio.sfx('select'); }
      else if (a === 'up' || a === 'down') { this.cursor ^= 2; audio.sfx('select'); }
      else if (a === 'back') { audio.sfx('cancel'); this.cursor = 0; this.clearMenu(); return null; }
      else if (a === 'ok') {
        if (slots[this.cursor].pp > 0) { audio.sfx('confirm'); const i = this.cursor; this.clearMenu(); this.cursor = 0; return i; }
        typeText.setText('SIN PP').setColor(hex('R'));
      }
      if (this.cursor < slots.length) refresh();
    }
  }

  // ---------------------------------------------------------------- animaciones

  private slide(target: Phaser.GameObjects.Components.Transform, x: number, duration: number): Promise<void> {
    return new Promise((res) => this.tweens.add({ targets: target, x, duration, ease: 'Sine.easeOut', onComplete: () => res() }));
  }

  private sprite(side: Side): Phaser.GameObjects.Image { return side === 'player' ? this.playerSprite : this.enemySprite; }

  private lunge(side: Side): Promise<void> {
    const s = this.sprite(side);
    const dx = side === 'player' ? 14 : -14, dy = side === 'player' ? -8 : 8;
    const x = s.x, y = s.y;
    return new Promise((res) => this.tweens.add({
      targets: s, x: x + dx, y: y + dy, duration: 110, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { s.setPosition(x, y); res(); },
    }));
  }

  private async hit(e: Extract<BattleEvent, { t: 'hit' }>, type: TypeId): Promise<void> {
    audio.sfx(e.eff >= 2 ? 'hitSuper' : e.eff < 1 ? 'hitWeak' : 'hit');
    const target = this.sprite(e.side);
    const fx = this.add.image(target.x, target.y - 28, `fx_${type}`).setDepth(60).setScale(0.5);
    this.tweens.add({ targets: fx, scale: 2, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
    // parpadeo al recibir daño + barra de PS
    const blink = new Promise<void>((res) => this.tweens.add({ targets: target, alpha: 0, duration: 60, yoyo: true, repeat: 4, onComplete: () => { target.setAlpha(1); res(); } }));
    const box = e.side === 'enemy' ? this.enemyBox : this.playerBox;
    await Promise.all([blink, box.tweenHp(e.hpBefore, e.hpAfter)]);
  }

  private faint(side: Side): Promise<void> {
    audio.sfx('faint');
    const s = this.sprite(side);
    return new Promise((res) => this.tweens.add({ targets: s, y: s.y + 28, alpha: 0, duration: 520, ease: 'Quad.easeIn', onComplete: () => res() }));
  }

  private async levelUp(e: Extract<BattleEvent, { t: 'levelUp' }>): Promise<void> {
    const name = SPECIES[this.playerC.speciesId].name.toUpperCase();
    audio.sfx('levelUp');
    audio.duck(1800);
    this.playerBox.setLevel(e.level);
    this.playerBox.setHp(e.hp);
    this.playerBox.setExp(0);
    await this.say(`¡${name} subió al nivel ${e.level}!`, true);
    const g = e.gains;
    await this.say(`PS +${g.hp}  ATAQUE +${g.atk}\nDEFENSA +${g.def}  VELOC. +${g.spd}`, true);
    await this.playerBox.tweenExp(0, e.progress);
  }

  private async showResultPanel(result: 'win' | 'lose'): Promise<void> {
    this.phase = 'result';
    this.clearMenu();
    const dim = this.add.image(0, 0, 'px_K').setOrigin(0).setDisplaySize(240, 160).setAlpha(0).setDepth(200);
    this.tweens.add({ targets: dim, alpha: 0.55, duration: 250 });
    const panel = this.add.image(40, 40, 'ui_panel').setOrigin(0).setDepth(201);
    const win = result === 'win';
    audio.sfx(win ? 'win' : 'lose');
    audio.duck(2200);
    const title = new PixelText(this, 52, 48, win ? '¡Victoria!' : '¡Derrota!', win ? hex('P') : hex('S')).setDepth(202);
    const lines = win
      ? `EXP +${this.expGained}   NIVEL ${this.playerC.level}${this.playerC.level > this.startLevel ? '\n¡Has subido de nivel!' : ''}`
      : 'Perdiste el combate.\nVuelves al pueblo.';
    const body = new PixelText(this, 52, 62, lines).setDepth(202);
    this.menu = [panel, ...title.objects, ...body.objects, dim];
    const w = this.waitAct((a) => a === 'ok');
    await Promise.race([sleep(this, 2600), w.promise]);
    w.cancel();
  }
}
