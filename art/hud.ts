import { Grid } from './grid';
import { validateSprite, type Sprite } from './pixmap';

/** Pokéball de 9x9 para el contador de equipo: llena (con color) y vacía (apagada). */
export const BALL_FULL: Sprite = [
  '..KKKKK..',
  '.KRRRRRK.',
  'KRWWRRRRK',
  'KRRRRRRRK',
  'KKKKWKKKK',
  'KwwwwwwwK',
  'KwwwwwwwK',
  '.KwwwwwK.',
  '..KKKKK..',
];
export const BALL_EMPTY: Sprite = [
  '..KKKKK..',
  '.KvvvvvK.',
  'KvvvvvvvK',
  'KvvvvvvvK',
  'KKKKwKKKK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  '.KuuuuuK.',
  '..KKKKK..',
];

/** Rubí tallado (corona + pabellón) para el logo; cada faceta lleva su propio tono y contorno. */
export function ruby(): Sprite {
  const g = new Grid(25, 22);
  const pavilion = (pts: [number, number][], ramp: string[]) => g.poly(pts, ramp, 'K');
  pavilion([[0, 7], [6, 0], [8, 7]], ['R', 'S']);
  pavilion([[6, 0], [18, 0], [16, 7], [8, 7]], ['R', 'R', 'S']);
  pavilion([[18, 0], [24, 7], [16, 7]], ['S', 'T']);
  pavilion([[0, 7], [8, 7], [12, 21]], ['S', 'T']);
  pavilion([[8, 7], [16, 7], [12, 21]], ['S', 'T']);
  pavilion([[16, 7], [24, 7], [12, 21]], ['T', 'T']);
  // brillos
  for (const [x, y] of [[8, 2], [9, 2], [8, 3], [3, 7], [10, 9]] as const) g.set(x, y, 'W');
  return g.toSprite();
}

validateSprite('ball_full', BALL_FULL, 9, 9);
validateSprite('ball_empty', BALL_EMPTY, 9, 9);
