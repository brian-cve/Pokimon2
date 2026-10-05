import Phaser from 'phaser';
import { generateTextures } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    generateTextures(this);
    this.scene.start('Overworld', { mapId: 'town' });
    this.scene.launch('UI');
  }
}
