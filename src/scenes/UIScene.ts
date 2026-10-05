import Phaser from 'phaser';
import { ATLAS, GAME_W } from '../config';
import { audio } from '../systems/audio';
import { COLOR } from '../ui/colors';
import { measure } from '../ui/fontMetrics';
import { PixelText } from '../ui/PixelText';

/** Capa fija por encima de todo: botón de silencio (clic o tecla M) y su aviso. */
export class UIScene extends Phaser.Scene {
  private icon!: Phaser.GameObjects.Image;
  private toast!: PixelText;
  private toastTimer?: Phaser.Time.TimerEvent;

  constructor() { super('UI'); }

  create(): void {
    this.icon = this.add.image(GAME_W - 4, 3, ATLAS, 'ui_sound_on').setOrigin(1, 0).setAlpha(0.85).setInteractive({ useHandCursor: true });
    this.toast = new PixelText(this, 0, 17, '', COLOR.W, COLOR.K).setVisible(false);
    this.icon.on('pointerdown', () => this.toggle());
    this.input.keyboard!.on('keydown-M', () => this.toggle());
    this.refresh();
  }

  private refresh(): void {
    this.icon.setFrame(audio.muted ? 'ui_sound_off' : 'ui_sound_on');
  }

  private toggle(): void {
    audio.unlock();
    const muted = audio.toggleMute();
    this.refresh();
    const t = muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
    this.toast.setText(t).setPosition(GAME_W - 4 - measure(t), 17).setVisible(true);
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(1200, () => this.toast.setVisible(false));
    if (!muted) audio.sfx('confirm');
  }
}
