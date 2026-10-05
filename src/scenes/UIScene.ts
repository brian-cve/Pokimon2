import Phaser from 'phaser';
import { measure } from '../art/font';
import { audio } from '../systems/audio';
import { PixelText } from '../ui/PixelText';

/** Capa fija por encima de todo: botón de silencio (clic o tecla M) y su aviso. */
export class UIScene extends Phaser.Scene {
  private icon!: Phaser.GameObjects.Image;
  private toast!: PixelText;
  private toastTimer?: Phaser.Time.TimerEvent;

  constructor() { super('UI'); }

  create(): void {
    this.icon = this.add.image(236, 3, 'ui_sound_on').setOrigin(1, 0).setAlpha(0.85).setInteractive({ useHandCursor: true });
    this.toast = new PixelText(this, 0, 17, '', 0xf8f8f0, 0x1f1a2e).setVisible(false);
    this.icon.on('pointerdown', () => this.toggle());
    this.input.keyboard!.on('keydown-M', () => this.toggle());
    this.refresh();
  }

  private refresh(): void {
    this.icon.setTexture(audio.muted ? 'ui_sound_off' : 'ui_sound_on');
  }

  private toggle(): void {
    audio.unlock();
    const muted = audio.toggleMute();
    this.refresh();
    const t = muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
    this.toast.setText(t).setPosition(236 - measure(t), 17).setVisible(true);
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(1200, () => this.toast.setVisible(false));
    if (!muted) audio.sfx('confirm');
  }
}
