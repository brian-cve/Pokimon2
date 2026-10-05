import { Grid } from './grid';
import { validateSprite, type Sprite } from './pixmap';

const T = 16;

/** Tablones de madera; la variante desplaza las juntas para que el suelo no parezca un patrón. */
function floor(variant: number): Sprite {
  const g = new Grid(T, T, 'm');
  [3, 7, 11, 15].forEach((y) => g.hline(0, y, T, 'n'));
  [0, 4, 8, 12].forEach((y) => g.hline(0, y, T, 'l'));
  const joints = variant === 0 ? [[5, 0], [12, 1], [3, 2], [10, 3]] : [[11, 0], [4, 1], [13, 2], [6, 3]];
  for (const [x, row] of joints) g.vline(x, row * 4, 3, 'n');
  return g.toSprite();
}

/** Papel pintado con rayas verticales finas. */
function paper(): Grid {
  const g = new Grid(T, T, 'y');
  for (let x = 1; x < T; x += 4) g.vline(x, 0, T, 'z');
  return g;
}

function wallTop(): Sprite {
  const g = paper();
  g.hline(0, 0, T, 'o'); g.hline(0, 1, T, 'n');
  g.hline(0, T - 1, T, 'z');
  return g.toSprite();
}

/** Pared lateral: papel liso con un filo oscuro hacia el interior (sin zócalo repetido). */
function wallSide(): Sprite {
  const g = paper();
  g.vline(0, 0, T, 'z'); g.vline(T - 1, 0, T, 'z');
  return g.toSprite();
}

function wallBase(): Grid {
  const g = paper();
  g.hline(0, 12, T, 'o'); g.rect(0, 13, T, 2, 'm'); g.hline(0, 15, T, 'n');
  return g;
}

function windowTile(): Sprite {
  const g = wallBase();
  g.rect(2, 0, 12, 12, 'K'); g.rect(3, 1, 10, 10, 'n');
  g.rect(4, 2, 8, 8, 'h'); g.rect(4, 6, 8, 4, 'i');
  g.vline(8, 2, 8, 'n'); g.hline(4, 6, 8, 'n');
  g.set(5, 3, 'W'); g.set(6, 3, 'W'); g.set(5, 4, 'W');
  return g.toSprite();
}

function shelf(): Sprite {
  const g = wallBase();
  g.rect(1, 0, 14, 13, 'K'); g.rect(2, 1, 12, 11, 'o');
  const books = ['R', 'B', 'Y', 'G', 'S', 'C', 'O'];
  [1, 5, 9].forEach((y, row) => {
    g.rect(2, y, 12, 3, 'n');
    for (let x = 2, i = row; x < 14; x += 2, i++) g.rect(x, y, 2, 3, books[(i * 3) % books.length]);
    g.hline(2, y + 3, 12, 'K');
  });
  return g.toSprite();
}

function mat(): Sprite {
  const g = new Grid(T, T, 'm');
  [3, 7, 11, 15].forEach((y) => g.hline(0, y, T, 'n'));
  g.rect(1, 3, 14, 10, 'K'); g.rect(2, 4, 12, 8, 'T'); g.rect(3, 5, 10, 6, 'R');
  g.hline(4, 7, 8, 'Y'); g.hline(4, 9, 8, 'Y');
  return g.toSprite();
}

/** Alfombra sin bordes (se repite sin costuras): rombos rojos con un punto dorado. */
function rug(): Sprite {
  const g = new Grid(T, T, 'R');
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) g.set(x, y, 'S');
  }
  for (const [x, y] of [[4, 0], [12, 0], [0, 4], [8, 4], [4, 8], [12, 8], [0, 12], [8, 12]] as const) g.set(x, y, 'Y');
  return g.toSprite();
}

function bedHead(): Sprite {
  const g = new Grid(T, T);
  g.rect(1, 0, 14, T, 'K'); g.rect(2, 1, 12, 15, 'n');
  g.rect(2, 1, 12, 3, 'm'); g.hline(2, 1, 12, 'l');
  g.rect(4, 4, 8, 6, 'K'); g.rect(5, 5, 6, 4, 'W'); g.hline(5, 8, 6, 'w');
  g.rect(3, 10, 10, 6, 'R'); g.hline(3, 10, 10, 'S');
  return g.toSprite();
}

function bedFoot(): Sprite {
  const g = new Grid(T, T);
  g.rect(1, 0, 14, T, 'K'); g.rect(2, 0, 12, 15, 'n');
  g.rect(3, 0, 10, 9, 'R'); g.hline(3, 4, 10, 'S'); g.hline(3, 8, 10, 'S');
  g.rect(2, 10, 12, 5, 'm'); g.hline(2, 10, 12, 'l'); g.hline(2, 14, 12, 'n');
  return g.toSprite();
}

function table(): Sprite {
  const g = new Grid(T, T);
  g.rect(4, 11, 2, 4, 'o'); g.rect(10, 11, 2, 4, 'o');
  g.ellipse(8, 8, 7.5, 5, ['l', 'm', 'n']);
  g.rect(9, 4, 3, 3, 'K'); g.rect(10, 4, 1, 2, 'W'); // taza
  return g.toSprite();
}

function plant(): Sprite {
  const g = new Grid(T, T);
  g.ellipse(8, 5, 4.5, 4.5, ['a', 'b', 'c']);
  g.ellipse(4.5, 8, 3.5, 3.5, ['a', 'b', 'c']);
  g.ellipse(11.5, 8, 3.5, 3.5, ['b', 'c', 'd']);
  g.box(4, 10, 8, 5, ['m', 'n', 'o']);
  g.hline(4, 10, 8, 'K');
  return g.toSprite();
}

function chest(): Sprite {
  const g = new Grid(T, T);
  g.box(1, 5, 14, 10, ['m', 'n', 'o']);
  g.hline(2, 9, 12, 'K');
  g.rect(7, 8, 2, 3, 'K'); g.rect(7, 8, 2, 2, 'Y');
  g.hline(2, 6, 12, 'l');
  return g.toSprite();
}

/** Tiles de interior: se añaden al final de TILE_DEFS para no mover los índices de los mapas existentes. */
export const INTERIOR_TILE_DEFS: [string, Sprite][] = [
  ['floor', floor(0)], ['floor2', floor(1)], ['wallTop', wallTop()], ['wallBase', wallBase().toSprite()], ['wallSide', wallSide()],
  ['window', windowTile()], ['shelf', shelf()], ['mat', mat()], ['rug', rug()],
  ['bedHead', bedHead()], ['bedFoot', bedFoot()], ['table', table()], ['plant', plant()], ['chest', chest()],
];

for (const [n, s] of INTERIOR_TILE_DEFS) validateSprite(n, s, T, T);
