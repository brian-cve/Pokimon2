import Phaser from 'phaser';
import { ATLAS, FONT, INK_CSS } from '../config';
import { audio } from '../systems/audio';

export interface MenuItem { label: string | (() => string); run: () => void }

/** Texto de la fuente de menús (Press Start 2P, 8 px: un píxel de fuente = un píxel del juego). */
export function menuText(scene: Phaser.Scene, x: number, y: number, text: string, color = INK_CSS): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: '8px', color }).setResolution(1);
}

/** Panel liso con borde oscuro y filo interior, para menús y pantallas de ayuda. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  return scene.add.graphics()
    .fillStyle(0x1f1a2e, 1).fillRect(x, y, w, h)
    .fillStyle(0xf8f8f0, 1).fillRect(x + 2, y + 2, w - 4, h - 4)
    .lineStyle(1, 0xc8d0d8, 1).strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
}

/** Menú vertical de texto con cursor del atlas; flechas/WASD, Z/Enter/Espacio, X/Esc y ratón. */
export class TextMenu {
  private texts: Phaser.GameObjects.Text[] = [];
  private cursor: Phaser.GameObjects.Image;
  private items: MenuItem[] = [];
  private index = 0;
  private enabled = true;
  private readonly onKey = (e: KeyboardEvent) => this.handle(e.code);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly spacing = 12,
    private readonly depth = 100,
    private readonly onBack?: () => void,
    private readonly color = INK_CSS,
  ) {
    this.cursor = scene.add.image(0, 0, ATLAS, 'ui_cursor').setOrigin(0, 0.5).setDepth(depth);
    scene.input.keyboard!.on('keydown', this.onKey);
    scene.events.once('shutdown', () => this.destroy());
  }

  setItems(items: MenuItem[], index = 0): void {
    this.texts.forEach((t) => t.destroy());
    this.items = items;
    this.index = index;
    this.texts = items.map((_, i) => {
      const t = menuText(this.scene, this.x, this.y + i * this.spacing, '', this.color).setDepth(this.depth).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { if (this.enabled && this.index !== i) { this.index = i; audio.sfx('select'); this.refresh(); } });
      t.on('pointerdown', () => { if (this.enabled) { this.index = i; this.refresh(); this.choose(); } });
      return t;
    });
    this.refresh();
  }

  /** Vuelve a leer las etiquetas (por ejemplo "SONIDO: SÍ/NO") y recoloca el cursor. */
  refresh(): void {
    this.items.forEach((it, i) => this.texts[i].setText(typeof it.label === 'function' ? it.label() : it.label));
    this.cursor.setPosition(this.x - 9, this.y + this.index * this.spacing + 4).setVisible(this.items.length > 0);
  }

  setEnabled(on: boolean): void { this.enabled = on; }
  setVisible(on: boolean): void { this.texts.forEach((t) => t.setVisible(on)); this.cursor.setVisible(on); this.enabled = on; }

  private choose(): void {
    audio.sfx('confirm');
    this.items[this.index]?.run();
  }

  private handle(code: string): void {
    if (!this.enabled || !this.items.length) return;
    const n = this.items.length;
    if (code === 'ArrowUp' || code === 'KeyW') { this.index = (this.index + n - 1) % n; audio.sfx('select'); this.refresh(); }
    else if (code === 'ArrowDown' || code === 'KeyS') { this.index = (this.index + 1) % n; audio.sfx('select'); this.refresh(); }
    else if (code === 'Enter' || code === 'Space' || code === 'KeyZ') this.choose();
    else if ((code === 'Escape' || code === 'KeyX' || code === 'Backspace') && this.onBack) { audio.sfx('cancel'); this.onBack(); }
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
  }
}
