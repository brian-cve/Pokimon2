import Phaser from 'phaser';
import { SPECIES } from '../data/species';
import { expProgress, type Creature } from '../systems/creature';
import { poolsFor } from '../systems/pool';
import { COLOR } from './colors';
import { measure } from './fontMetrics';
import { PixelText } from './PixelText';

const BAR_W = 48;

/**
 * Caja de nombre / nivel / barra de PS (y PS numéricos + EXP para el jugador).
 * Se construye una vez y se reutiliza entre combates con `setCreature`.
 */
export class StatusBox {
  readonly container: Phaser.GameObjects.Container;
  private name: PixelText;
  private level: PixelText;
  private nums?: PixelText;
  private fill: Phaser.GameObjects.Image;
  private expFill?: Phaser.GameObjects.Image;
  private creature!: Creature;
  private hp = 0;
  private expW = 0;
  private readonly w: number;
  private readonly left: number;
  private readonly right: number;

  constructor(private scene: Phaser.Scene, x: number, y: number, readonly isPlayer: boolean) {
    const pools = poolsFor(scene);
    this.w = isPlayer ? 112 : 104;
    // el lado de la pestaña oscura reduce el área útil
    this.left = isPlayer ? 8 : 12;
    this.right = this.w - (isPlayer ? 12 : 8);
    const left = this.left;
    const bg = pools.image(isPlayer ? 'ui_hpbox_player' : 'ui_hpbox_enemy');
    this.name = new PixelText(scene, left, 5, '');
    this.level = new PixelText(scene, 0, 5, '');
    const label = pools.image('ui_hplabel', left, 17);
    const barX = left + 15;
    const track = pools.rect(barX - 1, 18, BAR_W + 2, 5, COLOR.K);
    const inner = pools.rect(barX, 19, BAR_W, 3, COLOR.x);
    this.fill = pools.rect(barX, 19, BAR_W, 3, COLOR.b);
    const parts: Phaser.GameObjects.GameObject[] = [bg, ...this.name.objects, ...this.level.objects, label, track, inner, this.fill];
    if (isPlayer) {
      this.nums = new PixelText(scene, 0, 25, '');
      const w = this.right - left;
      this.expFill = pools.rect(left + 1, 37, 1, 2, COLOR.B);
      this.expW = w - 2;
      parts.push(...this.nums.objects, pools.rect(left, 36, w, 4, COLOR.K), pools.rect(left + 1, 37, w - 2, 2, COLOR.x), this.expFill);
    }
    this.container = scene.add.container(x, y, parts).setDepth(50);
  }

  /** Vincula la caja a una criatura (nombre, nivel, PS y EXP). */
  setCreature(c: Creature): void {
    this.creature = c;
    this.name.setText(SPECIES[c.speciesId].name);
    this.setLevel(c.level);
    this.setHp(c.hp);
    if (this.isPlayer) this.setExp(expProgress(c));
  }

  setLevel(level: number): void {
    const t = `NV${level}`;
    this.level.setText(t).setPosition(this.right - measure(t), 5);
  }

  /** Dibuja la barra con un valor de PS (puede ser fraccionario durante la animación). */
  setHp(v: number): void {
    this.hp = v;
    const max = this.creature.stats.hp;
    const ratio = Math.max(0, Math.min(1, v / max));
    this.fill.setDisplaySize(v > 0 ? Math.max(1, Math.round(ratio * BAR_W)) : 0, 3);
    this.fill.setTint(ratio > 0.5 ? COLOR.b : ratio > 0.2 ? COLOR.Y : COLOR.R);
    if (this.nums) {
      const t = `${Math.ceil(v)}/${max}`;
      this.nums.setText(t).setPosition(this.right - measure(t), 25);
    }
  }
  get shownHp(): number { return this.hp; }

  setExp(ratio: number): void {
    this.expFill?.setDisplaySize(Math.round(Math.max(0, Math.min(1, ratio)) * this.expW) || (ratio > 0 ? 1 : 0), 2);
  }

  /** Anima la barra de PS de `from` a `to` (ms proporcional al cambio). */
  tweenHp(from: number, to: number): Promise<void> {
    const max = this.creature.stats.hp;
    const duration = 250 + 700 * (Math.abs(from - to) / max);
    const o = { v: from };
    return new Promise((res) => this.scene.tweens.add({
      targets: o, v: to, duration, ease: 'Linear',
      onUpdate: () => this.setHp(o.v), onComplete: () => { this.setHp(to); res(); },
    }));
  }

  tweenExp(from: number, to: number): Promise<void> {
    const o = { v: from };
    return new Promise((res) => this.scene.tweens.add({
      targets: o, v: to, duration: 200 + 900 * Math.abs(to - from), ease: 'Linear',
      onUpdate: () => this.setExp(o.v), onComplete: () => { this.setExp(to); res(); },
    }));
  }
}
