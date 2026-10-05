import Phaser from 'phaser';
import { ATLAS, GAME_W } from '../config';
import { audio } from '../systems/audio';
import { game, PARTY_MAX } from '../systems/gameState';
import { COLOR } from '../ui/colors';
import { measure } from '../ui/fontMetrics';
import { PixelText } from '../ui/PixelText';

/** Capa fija por encima de todo: contador de equipo (pokéballs), botón de silencio (clic o tecla M) y su aviso. */
export class UIScene extends Phaser.Scene {
  private icon!: Phaser.GameObjects.Image;
  private toast!: PixelText;
  private toastTimer?: Phaser.Time.TimerEvent;
  private hud!: Phaser.GameObjects.Container;
  private balls: Phaser.GameObjects.Image[] = [];

  constructor() { super('UI'); }

  create(): void {
    this.icon = this.add.image(GAME_W - 4, 3, ATLAS, 'ui_sound_on').setOrigin(1, 0).setAlpha(0.85).setInteractive({ useHandCursor: true });
    this.toast = new PixelText(this, 0, 17, '', COLOR.W, COLOR.K).setVisible(false);
    this.icon.on('pointerdown', () => this.toggle());
    this.input.keyboard!.on('keydown-M', () => this.toggle());
    this.createHud();
    this.refresh();
  }

  /** Una pokéball por hueco del equipo: llena si hay criatura, apagada si está libre. */
  private createHud(): void {
    const step = 11, w = PARTY_MAX * step + 5;
    const bg = this.add.graphics().fillStyle(0x1f1a2e, 0.78).fillRoundedRect(0, 0, w, 15, 4).lineStyle(1, 0xc8d0d8, 0.9).strokeRoundedRect(0.5, 0.5, w - 1, 14, 4);
    this.balls = Array.from({ length: PARTY_MAX }, (_, i) => this.add.image(4 + i * step, 3, 'ball_empty').setOrigin(0));
    this.hud = this.add.container(3, 3, [bg, ...this.balls]).setVisible(false);
  }

  update(): void {
    // fuera de partida (título) y durante el combate el contador no se muestra
    this.hud.setVisible(game.inGame && !this.scene.isActive('Battle') && !this.scene.isActive('Party'));
    if (!this.hud.visible) return;
    this.balls.forEach((b, i) => { const t = i < game.party.length ? 'ball_full' : 'ball_empty'; if (b.texture.key !== t) b.setTexture(t); });
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
