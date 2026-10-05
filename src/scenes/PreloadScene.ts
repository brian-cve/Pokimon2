import Phaser from 'phaser';
import { ATLAS } from '../config';
import { MAP_IDS, mapKey } from '../data/maps';
import { initFontMetrics } from '../ui/fontMetrics';
import { createHudTextures } from '../ui/hudTextures';

/** Carga todos los assets de `public/assets/` (atlas, tileset, fuente y mapas de Tiled) y crea las texturas procedurales del HUD. */
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload(): void {
    this.load.setPath('assets');
    this.load.atlas(ATLAS, 'atlas.png', 'atlas.json');
    this.load.image('tileset', 'tileset.png');
    this.load.bitmapFont('pixfont', 'font.png', 'font.fnt');
    for (const id of MAP_IDS) this.load.tilemapTiledJSON(mapKey(id), `maps/${id}.json`);
  }

  create(): void {
    initFontMetrics(this.cache);
    createHudTextures(this);
    this.scene.start('Title');
    this.scene.launch('UI');
  }
}
