import { Grid } from './grid';
import { validateSprite, type Sprite } from './pixmap';

export type Dir = 'down' | 'up' | 'left' | 'right';
export const PLAYER_W = 16;
export const PLAYER_H = 24;
/** Frames de caminata: 0 = parado, 1 = paso pierna izq., 2 = paso pierna der. */
export const WALK_FRAMES = 3;

const SKIN = ['k', 'q'];
const SHIRT = ['B', 'C'];
const CAP = ['R', 'S', 'T'];

function legs(g: Grid, dir: Dir, frame: number): void {
  // piernas (pantalón azul oscuro + zapatos); en el paso una sube y otra baja
  const lift = frame === 1 ? [1, 0] : frame === 2 ? [0, 1] : [0, 0];
  if (dir === 'left' || dir === 'right') {
    const a = frame === 0 ? 0 : frame === 1 ? -2 : 2;
    g.box(6 + a, 17, 4, 4, ['C', 'x'], 'K');
    g.box(6 - a, 17, 4, 4, ['C', 'x'], 'K');
    g.rect(6 + a + (dir === 'left' ? -1 : 1), 20, 4, 2, 'o');
    g.rect(6 - a + (dir === 'left' ? -1 : 1), 20, 4, 2, 'o');
    return;
  }
  g.box(4, 17 - lift[0], 4, 5 + lift[0], ['C', 'x'], 'K');
  g.box(8, 17 - lift[1], 4, 5 + lift[1], ['C', 'x'], 'K');
  g.rect(4, 21 - lift[0], 4, 1, 'o'); g.rect(8, 21 - lift[1], 4, 1, 'o');
}

export function playerFrame(dir: Dir, frame: number): Sprite {
  const g = new Grid(PLAYER_W, PLAYER_H);
  const g2 = new Grid(PLAYER_W, PLAYER_H);

  legs(g2, dir, frame);
  // torso
  if (dir === 'left' || dir === 'right') {
    g2.box(5, 10, 6, 8, SHIRT, 'K');
    // brazo que se balancea al caminar
    const ax = 6 + (frame === 1 ? -1 : frame === 2 ? 1 : 0);
    g2.box(ax, 11, 4, 6, ['C', 'C'], 'K');
    g2.rect(ax + 1, 16, 2, 2, 'k');
  } else {
    g2.box(3, 10, 10, 8, SHIRT, 'K');
    g2.rect(7, 11, 2, 6, 'W'); // cremallera clara
    g2.vline(7, 11, 6, 'W');
    g2.box(1, 11, 3, 6, ['B', 'C'], 'K'); g2.box(12, 11, 3, 6, ['C', 'C'], 'K');
    g2.rect(2, 16, 2, 2, 'k'); g2.rect(12, 16, 2, 2, 'q');
  }
  g.blit(g2, 0, 0);

  // cabeza
  const hy = 1;
  g.ellipse(8, hy + 6.5, 5.5, 5.5, SKIN);
  if (dir === 'down') {
    // pelo bajo gorra + ojos
    g.rect(3, hy + 4, 10, 2, 'o');
    g.set(5, hy + 7, 'K'); g.set(5, hy + 8, 'K'); g.set(10, hy + 7, 'K'); g.set(10, hy + 8, 'K');
    g.set(8, hy + 9, 'q');
    // gorra
    g.ellipse(8, hy + 3, 6, 3.5, CAP);
    g.hline(3, hy + 5, 10, 'T');
    g.set(8, hy + 1, 'W'); g.set(7, hy + 1, 'W');
  } else if (dir === 'up') {
    g.ellipse(8, hy + 6.5, 5.5, 5.5, ['o', 'o', 'K'], 'K');
    g.ellipse(8, hy + 3.5, 6, 4, CAP);
    g.hline(5, hy + 8, 6, 'o');
  } else {
    const f = dir === 'left' ? -1 : 1;
    g.rect(dir === 'left' ? 9 : 3, hy + 3, 4, 6, 'o'); // pelo trasero
    g.set(8 + f * 2, hy + 7, 'K'); g.set(8 + f * 2, hy + 8, 'K');
    g.ellipse(8, hy + 3, 6, 3.5, CAP);
    // visera hacia delante
    g.hline(dir === 'left' ? 1 : 10, hy + 4, 5, 'T');
    g.hline(dir === 'left' ? 1 : 10, hy + 5, 5, 'K');
  }
  // contorno exterior final
  g.outlineAll('K');
  return g.toSprite();
}

export const PLAYER_FRAMES: Record<string, Sprite> = {};
for (const d of ['down', 'up', 'left', 'right'] as Dir[])
  for (let f = 0; f < WALK_FRAMES; f++) {
    const s = playerFrame(d, f);
    validateSprite(`player_${d}_${f}`, s, PLAYER_W, PLAYER_H);
    PLAYER_FRAMES[`player_${d}_${f}`] = s;
  }
