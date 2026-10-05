import Phaser from 'phaser';
import { measure } from '../art/font';
import { SPECIES } from '../data/species';
import { expProgress, type Creature } from '../systems/creature';
import { PixelText } from './PixelText';

const BAR_W = 48;

/** Caja de nombre / nivel / barra de PS (y PS numéricos + EXP para el jugador). */
export class StatusBox {
  readonly container: Phaser.GameObjects.Container;
  private level: PixelText;
  private nums?: PixelText;
  private fill: Phaser.GameObjects.Image;
  private expFill?: Phaser.GameObjects.Image;
  private hp: number;
  private readonly w: number;

  constructor(private scene: Phaser.Scene, x: number, y: number, private creature: Creature, readonly isPlayer: boolean) {
    this.w = isPlayer ? 112 : 104;
    const tab = isPlayer ? 'ui_hpbox_player' : 'ui_hpbox_enemy';
    const bg = scene.add.image(0, 0, tab).setOrigin(0);
    // el lado de la pestaña oscura reduce el área útil
    const left = isPlayer ? 8 : 12;
    const right = this.w - (isPlayer ? 12 : 8);
    const name = new PixelText(scene, left, 5, SPECIES[creature.speciesId].name);
    this.level = new PixelText(scene, 0, 5, '');
    const label = scene.add.image(left, 17, 'ui_hplabel').setOrigin(0);
    const barX = left + 15;
    const track = scene.add.image(barX - 1, 18, 'px_K').setOrigin(0).setDisplaySize(BAR_W + 2, 5);
    const inner = scene.add.image(barX, 19, 'px_x').setOrigin(0).setDisplaySize(BAR_W, 3);
    this.fill = scene.add.image(barX, 19, 'px_b').setOrigin(0).setDisplaySize(BAR_W, 3);
    const parts: Phaser.GameObjects.GameObject[] = [bg, ...name.objects, ...this.level.objects, label, track, inner, this.fill];
    if (isPlayer) {
      this.nums = new PixelText(scene, 0, 25, '');
      parts.push(...this.nums.objects);
      const w = right - left;
      parts.push(scene.add.image(left, 36, 'px_K').setOrigin(0).setDisplaySize(w, 4));
      parts.push(scene.add.image(left + 1, 37, 'px_x').setOrigin(0).setDisplaySize(w - 2, 2));
      this.expFill = scene.add.image(left + 1, 37, 'px_B').setOrigin(0).setDisplaySize(1, 2);
      parts.push(this.expFill);
      this.expW = w - 2;
    }
    this.right = right;
    this.container = scene.add.container(x, y, parts).setDepth(50);
    this.hp = creature.hp;
    this.setLevel(creature.level);
    this.setHp(creature.hp);
    if (isPlayer) this.setExp(expProgress(creature));
  }

  private expW = 0;
  private right = 0;

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
    this.fill.setTexture(ratio > 0.5 ? 'px_b' : ratio > 0.2 ? 'px_Y' : 'px_R');
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
