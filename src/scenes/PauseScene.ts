import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { audio } from '../systems/audio';
import { game } from '../systems/gameState';
import { menuText, panel, TextMenu } from '../ui/menu';

/** Menú de pausa por encima del mundo: CONTINUAR, SONIDO y SALIR AL INICIO (con confirmación). */
export class PauseScene extends Phaser.Scene {
  private menu!: TextMenu;
  private caption!: Phaser.GameObjects.Text;
  private closing = false;

  constructor() { super('Pause'); }

  create(): void {
    this.closing = false;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x14101f, 0.6).setOrigin(0);
    const w = 156, h = 84, x = (GAME_W - w) / 2, y = (GAME_H - h) / 2;
    panel(this, x, y, w, h).setDepth(10);
    this.caption = menuText(this, 0, y + 9, 'PAUSA').setDepth(11);
    this.caption.setX(Math.round(GAME_W / 2 - this.caption.width / 2));
    this.menu = new TextMenu(this, x + 22, y + 26, 13, 11, () => this.resume());
    this.showMain();
    audio.sfx('select');
  }

  private showMain(): void {
    this.setCaption('PAUSA');
    this.menu.setItems([
      { label: 'CONTINUAR', run: () => this.resume() },
      { label: 'MOCHILA', run: () => this.openParty() },
      { label: () => (audio.muted ? 'SONIDO: NO' : 'SONIDO: SI'), run: () => { audio.toggleMute(); this.menu.refresh(); } },
      { label: 'SALIR AL INICIO', run: () => this.showConfirm() },
    ]);
  }

  /** Abre la mochila encima de la pausa; al cerrarla se reactiva el menú (con un margen para no reusar la tecla). */
  private openParty(): void {
    this.menu.setEnabled(false);
    this.scene.launch('Party', { onClose: () => { this.time.delayedCall(180, () => this.menu.setEnabled(true)); } });
    this.scene.bringToTop('Party');
    this.scene.bringToTop('UI');
  }

  private showConfirm(): void {
    this.setCaption('¿SALIR?');
    this.menu.setItems([
      { label: 'NO, SEGUIR', run: () => this.showMain() },
      { label: 'SI, SALIR', run: () => this.quit() },
    ]);
  }

  private setCaption(t: string): void {
    this.caption.setText(t).setX(Math.round(GAME_W / 2 - this.caption.width / 2));
  }

  private resume(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.resume('Overworld', { from: 'pause' });
    this.scene.stop();
  }

  private quit(): void {
    if (this.closing) return;
    this.closing = true;
    game.inGame = false;
    this.scene.stop('Overworld');
    this.scene.start('Title');
  }
}
