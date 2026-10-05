import { Grid, rng } from './grid';
import { INTERIOR_TILE_DEFS } from './interior';
import { slice, validateSprite, type Sprite } from './pixmap';

export const TILE = 16;

// ---------- suelo ----------
function grass(variant: number): Sprite {
  const g = new Grid(TILE, TILE, 'b');
  const r = rng(100 + variant * 31);
  // motas claras y oscuras dispersas (sin repetir patrón obvio entre variantes)
  for (let i = 0; i < 9; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.45 ? 'a' : 'c');
  if (variant === 1) {
    // pequeños manojos de hierba
    for (const [x, y] of [[3, 4], [11, 11]] as const) {
      g.set(x, y, 'c'); g.set(x + 1, y - 1, 'c'); g.set(x + 2, y, 'c'); g.set(x + 1, y, 'a');
    }
  }
  if (variant === 2) {
    for (const [x, y] of [[9, 3], [2, 12]] as const) { g.hline(x, y, 3, 'a'); g.set(x + 1, y + 1, 'c'); }
  }
  return g.toSprite();
}

function flowers(kind: 'red' | 'yellow'): Sprite {
  const g = new Grid(TILE, TILE, 'b');
  const r = rng(kind === 'red' ? 7 : 8);
  for (let i = 0; i < 6; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? 'a' : 'c');
  const petal = kind === 'red' ? 'R' : 'Y';
  for (const [x, y] of [[3, 3], [10, 6], [5, 11], [12, 12]] as const) {
    g.set(x, y - 1, petal); g.set(x - 1, y, petal); g.set(x + 1, y, petal); g.set(x, y + 1, petal);
    g.set(x, y, kind === 'red' ? 'Y' : 'W');
    g.set(x, y + 2, 'c');
  }
  return g.toSprite();
}

function tallGrass(): Sprite {
  const g = new Grid(TILE, TILE, 'c');
  const blade = ['a...a', 'b.a.b', 'bbabb', 'dbbbd', '.dbd.', '..d..'];
  for (const [bx, by] of [[-1, 0], [5, 1], [11, 0], [2, 8], [8, 9], [14, 8], [-2, 13], [11, 14]] as const) g.blit(blade, bx, by);
  // base oscura para dar densidad
  g.hline(0, 15, 16, 'd');
  return g.toSprite();
}

function path(): Sprite {
  const g = new Grid(TILE, TILE, 'l');
  const r = rng(55);
  for (let i = 0; i < 12; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? 'm' : 'y');
  for (const [x, y] of [[4, 5], [12, 10]] as const) { g.hline(x, y, 2, 'm'); g.set(x, y + 1, 'n'); }
  return g.toSprite();
}

function water(frame: number): Sprite {
  const g = new Grid(TILE, TILE, 'i');
  // 3 filas de olas que se desplazan por frame
  const rows = [3, 8, 13];
  rows.forEach((y, k) => {
    const x = (k * 5 + frame * 4) % 16;
    for (let i = 0; i < 4; i++) {
      g.set((x + i) % 16, y, 'h');
      g.set((x + i + 1) % 16, y + 1, 'j');
    }
  });
  if (frame === 1) { g.set(1, 6, 'h'); g.set(10, 1, 'h'); }
  if (frame === 2) { g.set(13, 6, 'h'); g.set(6, 11, 'h'); }
  return g.toSprite();
}

// ---------- objetos ----------
function tree(): { top: Sprite; bottom: Sprite } {
  const g = new Grid(TILE, TILE * 2);
  g.rect(5, 22, 6, 10, 'n'); g.rect(5, 22, 2, 10, 'm'); g.rect(9, 22, 2, 10, 'o');
  g.vline(4, 22, 10, 'K'); g.vline(11, 22, 10, 'K'); g.hline(4, 31, 8, 'K');
  const leaves = ['b', 'G', 'H'];
  g.ellipse(8, 14, 7.5, 12.5, leaves);
  // racimos de hojas para romper la silueta de huevo
  g.ellipse(4.5, 19, 4.5, 4.5, leaves); g.ellipse(11.5, 19, 4.5, 4.5, leaves);
  g.ellipse(8, 11, 6, 8, leaves, false);
  // brillos y sombras puntuales
  for (const [x, y] of [[5, 6], [6, 5], [4, 10], [7, 9]] as const) g.set(x, y, 'a');
  for (const [x, y] of [[11, 12], [9, 16], [12, 18]] as const) g.set(x, y, 'H');
  const s = g.toSprite();
  return { top: slice(s, 0, 0, 16, 16), bottom: slice(s, 0, 16, 16, 16) };
}

/** Copa de bosque denso: se repite sin costuras (bordes del mapa). */
function forest(): Sprite {
  const g = new Grid(TILE, TILE, 'H');
  const leaves = ['b', 'G', 'H'];
  for (const [x, y] of [[4, 4], [12, 4], [4, 12], [12, 12]] as const) g.ellipse(x, y, 4.5, 4.5, leaves, 'H');
  for (const [x, y] of [[8, 8], [0, 8], [16, 8], [8, 0], [8, 16]] as const) g.ellipse(x, y, 3.5, 3.5, leaves, 'H');
  // el último trazo: bordes sin hueco, muestra ligeramente más oscura abajo
  g.hline(0, 15, 16, 'H');
  return g.toSprite();
}

function rock(): Sprite {
  const g = new Grid(TILE, TILE);
  g.ellipse(8, 10.5, 6.5, 5, ['u', 'v', 'x']);
  g.hline(5, 7, 3, 'W'); g.set(4, 8, 'u'); g.set(8, 8, 'W');
  g.hline(7, 13, 3, 'x');
  g.set(11, 9, 'x'); g.set(12, 10, 'x'); g.set(10, 11, 'x');
  return g.toSprite();
}

function fence(): Sprite {
  const g = new Grid(TILE, TILE);
  g.box(0, 5, 16, 3, ['m', 'n'], 'K');
  g.box(0, 10, 16, 3, ['m', 'n'], 'K');
  g.box(5, 2, 6, 13, ['l', 'm', 'n'], 'K');
  g.hline(6, 3, 2, 'y');
  return g.toSprite();
}

function house(): Sprite[] {
  const g = new Grid(48, 48);
  // chimenea
  g.box(33, 0, 7, 10, ['u', 'v', 'x']);
  // pared
  g.box(2, 29, 44, 18, ['y', 'y', 'z']);
  g.hline(3, 45, 42, 'z');
  // tejado: base + hileras de tejas (claro arriba, oscuro abajo) con juntas alternas
  g.poly([[0, 31], [7, 5], [41, 5], [48, 31]], ['S']);
  for (let y = 6; y < 30; y++) {
    const row = (y - 5) % 4, course = Math.floor((y - 5) / 4);
    for (let x = 0; x < 48; x++) {
      if (g.get(x, y) !== 'S') continue;
      let ch = row === 0 ? 'R' : row === 3 ? 'T' : 'S';
      if ((row === 1 || row === 2) && (x + (course % 2) * 3) % 6 === 0) ch = 'T';
      g.set(x, y, ch);
    }
  }
  g.hline(1, 29, 46, 'T');
  g.hline(2, 30, 44, 'K');
  g.hline(2, 31, 44, 'z');
  // ventanas
  for (const x of [6, 34]) {
    g.box(x, 34, 9, 8, ['h', 'i', 'j']);
    g.vline(x + 4, 34, 8, 'K'); g.hline(x, 37, 9, 'K');
    g.set(x + 1, 35, 'W');
  }
  g.box(5, 41, 11, 2, ['n', 'o'], 'K'); g.box(33, 41, 11, 2, ['n', 'o'], 'K');
  // puerta
  g.box(20, 33, 9, 14, ['m', 'n', 'o']);
  g.set(26, 40, 'Y'); g.set(26, 41, 'O');
  g.hline(20, 33, 9, 'K');
  const out: Sprite[] = [];
  const s = g.toSprite();
  for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) out.push(slice(s, tx * 16, ty * 16, 16, 16));
  return out;
}

/** Marca para la capa de colisión en Tiled (la capa va oculta en el juego). */
function solidMarker(): Sprite {
  const g = new Grid(TILE, TILE);
  g.rect(0, 0, TILE, TILE, 'R');
  g.rect(1, 1, TILE - 2, TILE - 2, '.');
  g.line(1, 1, 14, 14, 'R'); g.line(14, 1, 1, 14, 'R');
  return g.toSprite();
}

// ---------- registro ----------
const t = tree();
const h = house();
export const WATER_FRAMES: Sprite[] = [water(0), water(1), water(2)];

/** Orden = índice en el tileset de Phaser. El agua anima cambiando entre water0..2. */
export const TILE_DEFS: [string, Sprite][] = [
  ['grass0', grass(0)], ['grass1', grass(1)], ['grass2', grass(2)],
  ['flowerRed', flowers('red')], ['flowerYellow', flowers('yellow')],
  ['tallGrass', tallGrass()], ['path', path()],
  ['water0', WATER_FRAMES[0]], ['water1', WATER_FRAMES[1]], ['water2', WATER_FRAMES[2]],
  ['treeTop', t.top], ['treeBottom', t.bottom], ['forest', forest()], ['rock', rock()], ['fence', fence()],
  ...h.map((s, i) => [`house${i}`, s] as [string, Sprite]),
  ['solid', solidMarker()],
  ...INTERIOR_TILE_DEFS,
];

export const TILE_INDEX: Record<string, number> = Object.fromEntries(TILE_DEFS.map(([n], i) => [n, i]));

for (const [n, s] of TILE_DEFS) validateSprite(n, s, TILE, TILE);
WATER_FRAMES.forEach((s, i) => validateSprite(`water${i}`, s, TILE, TILE));
