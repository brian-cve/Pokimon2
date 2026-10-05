import type Phaser from 'phaser';
import { PALETTE } from '../../art/palette';
import { FONT } from '../config';

export const LOGO_KEY = 'logo';
const TEXT = 'RUBYMON';
const FS = 24;       // 3x la cuadrícula de 8 px de la fuente: los píxeles del logo salen cuadrados y nítidos
const O = 4;         // grosor del contorno
const SHADOW = 4;    // desplazamiento de la sombra
const HI = '#ffb4aa'; // brillo del rubí (un tono por encima de R)

/**
 * Logo "RUBYMON" generado por código: se rasteriza el texto, se umbraliza a una máscara de píxeles y
 * se pinta pixel a pixel con bisel de gema (borde claro arriba/izquierda, oscuro abajo), contorno y sombra.
 */
export function ensureLogo(scene: Phaser.Scene): { w: number; h: number } {
  const tw = TEXT.length * FS, th = FS;
  const W = tw + O * 2, H = th + O * 2 + SHADOW;
  if (scene.textures.exists(LOGO_KEY)) return { w: W, h: H };

  const m = document.createElement('canvas');
  m.width = tw; m.height = th;
  const mc = m.getContext('2d', { willReadFrequently: true })!;
  mc.font = `${FS}px ${FONT}`; mc.textBaseline = 'top'; mc.fillStyle = '#fff';
  mc.fillText(TEXT, 0, 0);
  const a = mc.getImageData(0, 0, tw, th).data;
  const glyph = (x: number, y: number) => x >= 0 && y >= 0 && x < tw && y < th && a[(y * tw + x) * 4 + 3] > 110;
  const near = (x: number, y: number, dy: number) => {
    for (let j = -O; j <= O; j++) for (let i = -O; i <= O; i++) if (glyph(x + i, y - dy + j)) return true;
    return false;
  };

  const tex = scene.textures.createCanvas(LOGO_KEY, W, H)!;
  const ctx = tex.context;
  const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gx = x - O, gy = y - O;
      if (glyph(gx, gy)) {
        const bandY = gy / th;
        let c: string = bandY < 0.42 ? PALETTE.R : bandY < 0.72 ? PALETTE.S : PALETTE.T;
        if (!glyph(gx, gy - 3)) c = HI;                       // borde superior de cada bloque
        else if (!glyph(gx - 3, gy)) c = bandY < 0.72 ? PALETTE.R : PALETTE.S; // borde izquierdo
        else if (!glyph(gx, gy + 3) || !glyph(gx + 3, gy)) c = PALETTE.T;       // bordes abajo/derecha
        px(x, y, c);
      } else if (near(gx, gy, 0)) px(x, y, PALETTE.K);
      else if ([1, 2, 3, 4].some((k) => near(gx, gy, k * (SHADOW / 4)))) px(x, y, PALETTE.x); // sombra continua hacia abajo
    }
  }
  // destellos de gema
  for (const [sx, sy] of [[W - 30, 3], [34, H - 10]] as const) {
    for (let i = -3; i <= 3; i++) { px(sx + i, sy, PALETTE.W); px(sx, sy + i, PALETTE.W); }
    px(sx + 1, sy + 1, PALETTE.W); px(sx - 1, sy - 1, PALETTE.W);
  }
  tex.refresh();
  return { w: W, h: H };
}
