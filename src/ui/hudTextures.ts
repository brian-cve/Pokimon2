import type Phaser from 'phaser';
import { BALL_EMPTY, BALL_FULL, ruby } from '../../art/hud';
import { FX_SPRITES } from '../../art/fx';
import { drawSprite, type Sprite } from '../../art/pixmap';

/** Convierte un sprite de la paleta en una textura de Phaser. */
function spriteTexture(scene: Phaser.Scene, key: string, sprite: Sprite): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, sprite[0].length, sprite.length)!;
  drawSprite(tex.context, sprite);
  tex.refresh();
}

/** Texturas procedurales de HUD, título y partículas de combate (pokéballs, rubí, llamas, gotas...). */
export function createHudTextures(scene: Phaser.Scene): void {
  spriteTexture(scene, 'ball_full', BALL_FULL);
  spriteTexture(scene, 'ball_empty', BALL_EMPTY);
  spriteTexture(scene, 'ruby', ruby());
  for (const [key, sprite] of Object.entries(FX_SPRITES)) spriteTexture(scene, key, sprite);
}
