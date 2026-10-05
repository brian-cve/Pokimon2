import type Phaser from 'phaser';
import { poolsFor } from '../systems/pool';
import { COLOR } from './colors';
import { FONT_KEY, measure, toFontText } from './fontMetrics';

export const INK = COLOR.K;
export const INK_SHADOW = COLOR.u;
export { FONT_KEY };

/** Texto con la fuente bitmap procedural y sombra suave de 1 px (como en la GBA). Usa objetos del pool. */
export class PixelText {
  private main: Phaser.GameObjects.BitmapText;
  private shadow: Phaser.GameObjects.BitmapText;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, text = '', color = INK, shadow: number | null = INK_SHADOW, lineSpacing = 5) {
    this.scene = scene;
    const pool = poolsFor(scene).texts;
    this.shadow = pool.acquire().setLineSpacing(lineSpacing).setPosition(x + 1, y + 1).setTint(shadow ?? 0).setVisible(shadow !== null);
    this.main = pool.acquire().setLineSpacing(lineSpacing).setPosition(x, y).setTint(color);
    this.setText(text);
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
  setVisible(v: boolean): this { this.main.setVisible(v); this.shadow.setVisible(v && this.shadow.tintTopLeft !== 0); return this; }
  /** Devuelve los dos objetos de texto al pool (los saca antes de cualquier contenedor). */
  release(): void {
    const pool = poolsFor(this.scene).texts;
    for (const o of this.objects) { o.parentContainer?.remove(o); pool.release(o); }
  }
  get objects(): Phaser.GameObjects.BitmapText[] { return [this.shadow, this.main]; }
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
