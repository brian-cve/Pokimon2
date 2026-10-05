import Phaser from 'phaser';
import { ATLAS } from '../config';
import { MAP_IDS, mapKey } from '../data/maps';
import { initFontMetrics } from '../ui/fontMetrics';

/** Carga todos los assets generados por `npm run assets` (atlas, tileset, fuente y mapas de Tiled). */
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
    this.scene.start('Overworld', { mapId: 'town' });
    this.scene.launch('UI');
  }
}
