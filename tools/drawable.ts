import type { SKRSContext2D } from '@napi-rs/canvas';
import { drawSprite, type Sprite } from '../art/pixmap';

/** Algo con tamaño que sabe dibujarse en un canvas: sprites procedurales o recortes de PNG externos. */
export interface Drawable {
  w: number;
  h: number;
  draw(ctx: SKRSContext2D, x: number, y: number): void;
}

export const fromSprite = (s: Sprite): Drawable => ({ w: s[0].length, h: s.length, draw: (ctx, x, y) => drawSprite(ctx, s, x, y) });
