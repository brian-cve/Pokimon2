import Phaser from 'phaser';
import { ATLAS, GAME_W } from '../config';
import { audio } from '../systems/audio';
import { newGame } from '../systems/gameState';
import { ensureLogo, LOGO_KEY } from '../ui/logo';
import { menuText, panel, TextMenu } from '../ui/menu';

const CONTROLS: [string, string][] = [
  ['MOVER', 'FLECHAS / WASD'], ['CONFIRMAR', 'Z / ENTER'], ['VOLVER', 'X / ESC'], ['PAUSA', 'ESC / P'], ['SONIDO', 'M'],
];

/** Pantalla de título: logo procedural, fondo del atlas y menú JUGAR / CONTROLES / SONIDO. */
export class TitleScene extends Phaser.Scene {
  private menu!: TextMenu;
  private help: Phaser.GameObjects.GameObject[] = [];
  private starting = false;

  constructor() { super('Title'); }

  create(): void {
    this.starting = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.image(0, 0, ATLAS, 'battle_bg').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, 112, 0x1f1a2e, 0.18).setOrigin(0);

    // logo: rubí + palabra, con un balanceo suave
    ensureLogo(this);
    const logo = this.add.container(GAME_W / 2, 0);
    const gem = this.add.image(0, 16, 'ruby').setOrigin(0.5, 0);
    const word = this.add.image(0, 16 + 22 + 2, LOGO_KEY).setOrigin(0.5, 0);
    logo.add([gem, word]);
    this.tweens.add({ targets: logo, y: 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: gem, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // caja del menú
    this.add.image(0, 112, ATLAS, 'ui_dialog').setOrigin(0);
    this.menu = new TextMenu(this, 78, 121, 12, 100);
    this.showMain();

    this.scene.bringToTop('UI');
    audio.playMusic('title');
  }

  private showMain(): void {
    this.menu.setItems([
      { label: 'JUGAR', run: () => this.play() },
      { label: 'CONTROLES', run: () => this.showHelp() },
      { label: () => (audio.muted ? 'SONIDO: NO' : 'SONIDO: SI'), run: () => { audio.toggleMute(); this.menu.refresh(); } },
    ]);
  }

  private play(): void {
    if (this.starting) return;
    this.starting = true;
    this.menu.setEnabled(false);
    audio.sfx('encounter');
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      newGame();
      this.scene.start('Overworld', { mapId: 'town' });
    });
  }

  private showHelp(): void {
    const x = 8, y = 16, w = GAME_W - 16, h = 84;
    const objs: Phaser.GameObjects.GameObject[] = [panel(this, x, y, w, h).setDepth(200)];
    objs.push(menuText(this, x + 10, y + 9, 'CONTROLES').setDepth(201));
    CONTROLS.forEach(([k, v], i) => {
      objs.push(menuText(this, x + 10, y + 26 + i * 11, k).setDepth(201));
      objs.push(menuText(this, x + 90, y + 26 + i * 11, v).setDepth(201));
    });
    this.help = objs;
    this.menu.setVisible(false);
    // cualquier tecla de confirmar/volver cierra la ayuda
    const close = (e: KeyboardEvent) => {
      if (!['Enter', 'Space', 'KeyZ', 'KeyX', 'Escape', 'Backspace'].includes(e.code)) return;
      this.input.keyboard!.off('keydown', close);
      this.help.forEach((o) => o.destroy());
      this.help = [];
      this.menu.setVisible(true);
      this.menu.refresh();
      audio.sfx('cancel');
    };
    // se registra en el siguiente ciclo para no cerrarse con la misma pulsación que la abrió
    this.time.delayedCall(0, () => this.input.keyboard!.on('keydown', close));
  }
}
