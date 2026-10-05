import Phaser from 'phaser';
import { ATLAS, GAME_H, GAME_W } from '../config';
import { MOVES } from '../data/moves';
import { SPECIES } from '../data/species';
import { TYPE_NAMES, type TypeId } from '../data/types';
import { audio } from '../systems/audio';
import { expProgress, type Creature } from '../systems/creature';
import { game, makeLead, PARTY_MAX } from '../systems/gameState';
import { COLOR } from '../ui/colors';
import { menuText } from '../ui/menu';
import { INK, PixelText } from '../ui/PixelText';

/** `canSwap`: permite elegir el líder del equipo (en la pausa sí; en combate no, el combate ya está en marcha). */
export interface PartyInit { onClose?: () => void; canSwap?: boolean }

const TYPE_COLOR: Record<TypeId, number> = { normal: COLOR.x, fire: COLOR.P, water: COLOR.j, grass: COLOR.c };
const LIST = { x: 4, y: 22, w: 80, rowH: 20 };
const DETAIL = { x: 88, y: 22, w: 148, h: 132 };

/**
 * MOCHILA: lista de las criaturas del equipo (6 huecos) y ficha de la seleccionada con sprite, tipo,
 * PS, estadísticas, experiencia y movimientos. Es un overlay: se abre desde la pausa y desde el combate.
 */
export class PartyScene extends Phaser.Scene {
  private onClose?: () => void;
  private canSwap = true;
  private ballsText?: PixelText;
  private index = 0;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private texts: PixelText[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private closing = false;

  constructor() { super('Party'); }

  init(data: PartyInit): void { this.onClose = data.onClose; this.canSwap = data.canSwap ?? true; this.index = 0; this.closing = false; }

  create(): void {
    this.rows = []; this.detail = []; this.texts = [];
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x2a2140, 1).setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, GAME_W, 16, 0x1f1a2e, 1).setOrigin(0).setDepth(1);
    menuText(this, 6, 4, 'MOCHILA', '#f8f8f0').setDepth(2);
    this.hint(this.canSwap ? 'Z: LIDER   X: VOLVER' : 'Z / X: VOLVER', 96, 5);
    this.ballsText = new PixelText(this, 6, 145, '', COLOR.Y, COLOR.K).setDepth(2);
    this.texts.push(this.ballsText);
    this.cursor = this.add.image(0, 0, ATLAS, 'ui_cursor').setOrigin(0, 0.5).setDepth(5);

    const keys = this.input.keyboard!;
    keys.on('keydown', this.onKey);
    this.events.once('shutdown', () => keys.off('keydown', this.onKey));
    this.render();
  }

  private hint(text: string, x: number, y: number): void {
    this.texts.push(new PixelText(this, x, y, text, COLOR.w, COLOR.K).setDepth(2));
  }

  private onKey = (e: KeyboardEvent): void => {
    const n = game.party.length;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1, n);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1, n);
    else if (['Enter', 'KeyZ', 'Space'].includes(e.code) && this.canSwap) {
      if (this.index > 0) { makeLead(this.index); this.index = 0; audio.sfx('confirm'); this.render(); }
    } else if (['KeyX', 'Escape', 'Backspace', 'Enter', 'KeyZ', 'Space'].includes(e.code)) this.close();
  };

  private move(d: number, n: number): void {
    if (n < 2) return;
    this.index = (this.index + d + n) % n;
    audio.sfx('select');
    this.render();
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    audio.sfx('cancel');
    const cb = this.onClose;
    this.scene.stop();
    cb?.();
  }

  /** Redibuja lista y ficha (son pocos objetos: más simple que actualizarlos uno a uno). */
  private render(): void {
    [...this.rows, ...this.detail].forEach((o) => o.destroy());
    this.rows = []; this.detail = [];
    const party = game.party;
    this.ballsText?.setText(`POKÉ BALL x${game.balls}`);

    for (let i = 0; i < PARTY_MAX; i++) {
      const y = LIST.y + i * LIST.rowH;
      const c = party[i];
      const sel = i === this.index && !!c;
      this.rows.push(this.add.rectangle(LIST.x, y, LIST.w, LIST.rowH - 2, sel ? 0xf8f8f0 : 0x3a2f55, c ? 1 : 0.6).setOrigin(0).setDepth(2));
      this.rows.push(this.add.image(LIST.x + 5, y + 5, c ? 'ball_full' : 'ball_empty').setOrigin(0).setDepth(3));
      if (!c) { this.text(this.rows, LIST.x + 20, y + 6, 'LIBRE', COLOR.v, null); continue; }
      this.text(this.rows, LIST.x + 20, y + 2, SPECIES[c.speciesId].name, sel ? INK : COLOR.W, sel ? null : COLOR.K);
      if (i === 0) this.text(this.rows, LIST.x + 68, y + 2, '*', sel ? COLOR.P : COLOR.Y, null);
      this.hpBar(this.rows, LIST.x + 20, y + 11, 32, c);
      this.text(this.rows, LIST.x + 57, y + 9, `NV${c.level}`, sel ? INK : COLOR.W, sel ? null : COLOR.K);
    }
    const sel = party[this.index];
    this.cursor.setVisible(!!sel).setPosition(LIST.x - 1, LIST.y + this.index * LIST.rowH + LIST.rowH / 2 - 1);
    this.cursor.setX(0).setTint(COLOR.W);
    if (sel) this.drawDetail(sel);
  }

  private text(bucket: Phaser.GameObjects.GameObject[], x: number, y: number, t: string, color = INK, shadow: number | null = null): PixelText {
    const p = new PixelText(this, x, y, t, color, shadow).setDepth(4);
    this.texts.push(p);
    bucket.push(...p.objects);
    return p;
  }

  private hpBar(bucket: Phaser.GameObjects.GameObject[], x: number, y: number, w: number, c: Creature): void {
    const ratio = Math.max(0, Math.min(1, c.hp / c.stats.hp));
    const color = ratio > 0.5 ? COLOR.b : ratio > 0.2 ? COLOR.Y : COLOR.R;
    bucket.push(this.add.rectangle(x, y, w + 2, 5, COLOR.K).setOrigin(0).setDepth(3));
    bucket.push(this.add.rectangle(x + 1, y + 1, w, 3, COLOR.x).setOrigin(0).setDepth(3));
    bucket.push(this.add.rectangle(x + 1, y + 1, Math.max(ratio > 0 ? 1 : 0, Math.round(ratio * w)), 3, color).setOrigin(0).setDepth(3));
  }

  private drawDetail(c: Creature): void {
    const sp = SPECIES[c.speciesId];
    const { x, y, w, h } = DETAIL;
    const d = this.detail;
    d.push(this.add.rectangle(x, y, w, h, 0x1f1a2e, 1).setOrigin(0).setDepth(2));
    d.push(this.add.rectangle(x + 2, y + 2, w - 4, h - 4, 0xf8f8f0, 1).setOrigin(0).setDepth(2));
    // retrato sobre un óvalo suave de suelo
    d.push(this.add.ellipse(x + 38, y + 62, 56, 12, 0xc8d0d8, 1).setDepth(3));
    d.push(this.add.image(x + 38, y + 64, ATLAS, `${c.speciesId}_front`).setOrigin(0.5, 1).setDepth(4));
    // nombre, nivel, tipo
    this.text(d, x + 78, y + 7, sp.name);
    this.text(d, x + 78, y + 18, `NV ${c.level}`);
    this.text(d, x + 78, y + 29, TYPE_NAMES[sp.type], TYPE_COLOR[sp.type]);
    // PS y EXP
    this.text(d, x + 78, y + 42, 'PS', COLOR.P);
    this.hpBar(d, x + 92, y + 43, 44, c);
    this.text(d, x + 78, y + 51, `${c.hp}/${c.stats.hp}`);
    d.push(this.add.rectangle(x + 78, y + 61, 62, 3, COLOR.K).setOrigin(0).setDepth(3));
    d.push(this.add.rectangle(x + 79, y + 62, 60, 1, COLOR.x).setOrigin(0).setDepth(3));
    d.push(this.add.rectangle(x + 79, y + 62, Math.round(60 * expProgress(c)), 1, COLOR.B).setOrigin(0).setDepth(3));
    // estadísticas
    const s = c.stats;
    this.text(d, x + 8, y + 70, `ATAQUE ${s.atk}`);
    this.text(d, x + 78, y + 70, `DEFENSA ${s.def}`);
    this.text(d, x + 8, y + 80, `VELOC.  ${s.spd}`);
    this.text(d, x + 78, y + 80, `EXP ${c.exp}`);
    // movimientos
    this.text(d, x + 8, y + 94, 'MOVIMIENTOS', COLOR.v);
    c.moves.forEach((m, i) => {
      const data = MOVES[m.id];
      const mx = x + 6 + (i % 2) * 68, my = y + 105 + Math.floor(i / 2) * 12;
      d.push(this.add.rectangle(mx - 2, my + 1, 2, 7, TYPE_COLOR[data.type], 1).setOrigin(0).setDepth(3));
      this.text(d, mx + 2, my, data.name, INK);
    });
  }
}
