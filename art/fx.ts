import { validateSprite, type Sprite } from './pixmap';

/** Sprites de efectos de combate (partículas). Se tiñen o se usan tal cual con la paleta del juego. */
export const FLAME: Sprite = [
  '...Y...',
  '..OYO..',
  '..OYO..',
  '.OOYOO.',
  'OOYYYOO',
  'OPYYYPO',
  '.PPYPP.',
  '..PPP..',
];

export const DROP: Sprite = [
  '..h..',
  '.hii.',
  '.iii.',
  'hiiij',
  'iiiij',
  '.ijj.',
  '..j..',
];

export const LEAF: Sprite = [
  '..GGG..',
  '.GaabG.',
  'GabbbbG',
  '.GbbGG.',
  '..GG...',
];

export const DOT: Sprite = ['.WW.', 'WWWW', 'WWWW', '.WW.'];

/** Destello de impacto de 4 puntas (blanco con núcleo amarillo). */
export function star(size = 11): Sprite {
  const c = (size - 1) / 2;
  return Array.from({ length: size }, (_, y) => [...Array(size)].map((_, x) => {
    const dx = Math.abs(x - c), dy = Math.abs(y - c);
    if (dx * dy > 2 || dx + dy > c) return '.';
    return dx + dy <= 1 ? 'Y' : 'W';
  }).join(''));
}

/** Anillo de `size` px, 1 px de grosor (se usa para ondas de agua). */
export function ring(size = 25): Sprite {
  const c = (size - 1) / 2, r = c - 0.5;
  return Array.from({ length: size }, (_, y) => [...Array(size)].map((_, x) => {
    const d = Math.hypot(x - c, y - c);
    return Math.abs(d - r) < 0.75 ? 'W' : '.';
  }).join(''));
}

export const FX_SPRITES: Record<string, Sprite> = {
  fxp_flame: FLAME, fxp_drop: DROP, fxp_leaf: LEAF, fxp_dot: DOT, fxp_star: star(), fxp_ring: ring(),
};
for (const [n, s] of Object.entries(FX_SPRITES)) validateSprite(n, s, s[0].length, s.length);
