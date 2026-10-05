import { PALETTE, TRANSPARENT } from './palette';

/** Un sprite es una matriz de strings: un carácter por píxel (ver palette.ts). */
export type Sprite = string[];

/** Contexto 2D mínimo: sirve tanto para el canvas del navegador como para @napi-rs/canvas. */
export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

export function drawSprite(ctx: Ctx2D, sprite: Sprite, ox = 0, oy = 0): void {
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === TRANSPARENT || ch === ' ') continue;
      const color = (PALETTE as Record<string, string>)[ch];
      if (!color) throw new Error(`Carácter fuera de paleta '${ch}' en (${x},${y})`);
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function flipH(sprite: Sprite): Sprite {
  return sprite.map((r) => [...r].reverse().join(''));
}

/** Recorta una región w×h de un sprite grande. */
export function slice(sprite: Sprite, x: number, y: number, w: number, h: number): Sprite {
  return sprite.slice(y, y + h).map((r) => r.slice(x, x + w));
}

export function validateSprite(name: string, sprite: Sprite, w: number, h: number): void {
  if (sprite.length !== h) throw new Error(`${name}: alto ${sprite.length} != ${h}`);
  sprite.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: fila ${i} mide ${r.length} != ${w}`);
    for (const ch of r) {
      if (ch !== TRANSPARENT && !(ch in PALETTE)) throw new Error(`${name}: char '${ch}' fuera de paleta`);
    }
  });
}
