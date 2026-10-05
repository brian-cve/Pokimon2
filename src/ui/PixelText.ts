import Phaser from 'phaser';
import { measure, toFontText } from '../art/font';
import { PALETTE } from '../art/palette';

const tint = (ch: keyof typeof PALETTE): number => parseInt(PALETTE[ch].slice(1), 16);
export const INK = tint('K');
export const INK_SHADOW = tint('u');

/** Texto con la fuente bitmap procedural y sombra suave de 1 px (como en la GBA). */
export class PixelText {
  private main: Phaser.GameObjects.BitmapText;
  private shadow: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, x: number, y: number, text = '', color = INK, shadow: number | null = INK_SHADOW, lineSpacing = 5) {
    this.shadow = scene.add.bitmapText(x + 1, y + 1, 'pixfont', toFontText(text)).setTint(shadow ?? 0).setLineSpacing(lineSpacing);
    this.shadow.setVisible(shadow !== null);
    this.main = scene.add.bitmapText(x, y, 'pixfont', toFontText(text)).setTint(color).setLineSpacing(lineSpacing);
  }

  setText(text: string): this {
    const t = toFontText(text);
    this.main.setText(t); this.shadow.setText(t);
    return this;
  }
  setColor(color: number): this { this.main.setTint(color); return this; }
  setPosition(x: number, y: number): this { this.main.setPosition(x, y); this.shadow.setPosition(x + 1, y + 1); return this; }
  setDepth(d: number): this { this.main.setDepth(d + 0.01); this.shadow.setDepth(d); return this; }
  setScrollFactor(f: number): this { this.main.setScrollFactor(f); this.shadow.setScrollFactor(f); return this; }
  setVisible(v: boolean): this { this.main.setVisible(v); this.shadow.setVisible(v); return this; }
  destroy(): void { this.main.destroy(); this.shadow.destroy(); }
  get objects(): Phaser.GameObjects.GameObject[] { return [this.shadow, this.main]; }
}

/** Parte `text` en líneas de como mucho `maxPx` píxeles de ancho. */
export function wrap(text: string, maxPx: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of toFontText(text).split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next) > maxPx) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
