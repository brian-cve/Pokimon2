import Phaser from 'phaser';
import { drawSprite, type Sprite } from './pixmap';
import { TILE, TILE_DEFS } from './tiles';
import { PLAYER_FRAMES } from './player';
import { CREATURE_ART } from './creatures';
import { PALETTE } from './palette';
import { SPEC } from './ui';
import { CHARS, FONT_CELL_H, FONT_LINE_H, advance, buildFontAtlas } from './font';

function addSprite(scene: Phaser.Scene, key: string, sprite: Sprite): void {
  const canvas = scene.textures.createCanvas(key, sprite[0].length, sprite.length);
  if (!canvas) throw new Error(`No se pudo crear la textura ${key}`);
  drawSprite(canvas.context, sprite);
  canvas.refresh();
}

/** Tileset: tira horizontal de tiles 16x16, en el orden de TILE_DEFS. */
function addTileset(scene: Phaser.Scene, key: string): void {
  const canvas = scene.textures.createCanvas(key, TILE_DEFS.length * TILE, TILE);
  if (!canvas) throw new Error(`No se pudo crear el tileset ${key}`);
  TILE_DEFS.forEach(([, sprite], i) => drawSprite(canvas.context, sprite, i * TILE, 0));
  // un frame por tile, para poder pintarlos sueltos (vista previa / depuración)
  TILE_DEFS.forEach((_, i) => canvas.add(i, 0, i * TILE, 0, TILE, TILE));
  canvas.refresh();
}

/** Texturas 1×1 por color de paleta: se escalan para barras y cortinas (nunca son sprites). */
function addPixelTextures(scene: Phaser.Scene): void {
  for (const [ch, color] of Object.entries(PALETTE)) {
    const c = scene.textures.createCanvas(`px_${ch}`, 1, 1);
    if (!c) continue;
    c.context.fillStyle = color; c.context.fillRect(0, 0, 1, 1); c.refresh();
  }
}

/** Fuente bitmap procedural → BitmapFont de Phaser ('pixfont'). Se tiñe con setTint. */
function addFont(scene: Phaser.Scene): void {
  const { sprite, frames } = buildFontAtlas();
  addSprite(scene, 'font_atlas', sprite);
  const atlasW = sprite[0].length, atlasH = sprite.length;
  const chars: Record<number, unknown> = {};
  for (const ch of CHARS) {
    const f = frames[ch];
    chars[ch.charCodeAt(0)] = {
      x: f.x, y: 0, width: f.w, height: FONT_CELL_H, centerX: f.w / 2, centerY: FONT_CELL_H / 2,
      xOffset: 0, yOffset: 0, xAdvance: advance(ch), data: {}, kerning: {},
      // Phaser 4 dibuja con UVs precalculadas (v invertida), como en ParseXMLBitmapFont
      u0: f.x / atlasW, v0: 1, u1: (f.x + f.w) / atlasW, v1: 1 - FONT_CELL_H / atlasH,
    };
  }
  scene.cache.bitmapFont.add('pixfont', {
    data: { font: 'pixfont', size: FONT_CELL_H, lineHeight: FONT_LINE_H, retroFont: false, chars },
    texture: 'font_atlas',
    frame: null,
  } as never);
}

export function generateTextures(scene: Phaser.Scene): void {
  addPixelTextures(scene);
  addFont(scene);
  for (const [name, sprite] of SPEC) addSprite(scene, name, sprite);
  addTileset(scene, 'tileset');
  for (const [key, sprite] of Object.entries(PLAYER_FRAMES)) addSprite(scene, key, sprite);
  for (const [id, art] of Object.entries(CREATURE_ART)) {
    addSprite(scene, `${id}_front`, art.front);
    addSprite(scene, `${id}_back`, art.back);
  }
}

