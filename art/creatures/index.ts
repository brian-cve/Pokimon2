import { Grid, type Ramp } from '../grid';
import { validateSprite, type Sprite } from '../pixmap';

export const CREATURE_SIZE = 64;

export interface CreatureArt { front: Sprite; back: Sprite }

const FIRE: Ramp = ['O', 'P', 'T'];
const BELLY: Ramp = ['y', 'l', 'm'];

/** Ojo con brillo: blanco 3x3 con pupila oscura. */
function eye(g: Grid, x: number, y: number, look = 0): void {
  g.rect(x, y, 3, 4, 'W');
  g.rect(x + 1 + look, y + 1, 2, 3, 'K');
  g.set(x + 1 + look, y + 1, 'W');
  g.outlineAll('K');
}

// ---------- Brasito (Fuego): lagartija bípeda con cola llameante ----------
function brasito(back: boolean): Sprite {
  const g = new Grid(64, 64);
  // cola con llama (detrás)
  g.ellipse(48, 50, 5, 8, FIRE);
  g.poly([[55, 22], [47, 36], [51, 44], [60, 40], [62, 30]], ['Y', 'O', 'P']);
  g.poly([[56, 29], [51, 38], [57, 40]], ['W', 'Y', 'Y'], false);
  // piernas
  g.ellipse(24, 56, 7, 4.5, FIRE); g.ellipse(40, 56, 7, 4.5, FIRE);
  for (const x of [20, 24, 28, 36, 40, 44]) g.set(x, 58, 'W');
  // cuerpo
  g.ellipse(32, 41, 14, 15, FIRE);
  if (!back) g.ellipse(32, 44, 8, 10, BELLY);
  else for (const y of [34, 40, 46]) g.hline(28, y, 8, 'T'); // espalda con placas
  // brazos
  g.ellipse(17, 40, 4.5, 7, FIRE); g.ellipse(47, 40, 4.5, 7, FIRE);
  // cabeza
  g.ellipse(32, 20, 13, 11, FIRE);
  // crestas
  g.poly([[24, 11], [27, 2], [31, 10]], ['Y', 'O', 'P']);
  g.poly([[31, 9], [35, 0], [39, 10]], ['Y', 'O', 'P']);
  g.poly([[38, 11], [42, 3], [45, 13]], ['Y', 'O', 'P']);
  if (!back) {
    g.ellipse(32, 25, 8, 5, ['l', 'm', 'n']);
    g.set(30, 25, 'K'); g.set(34, 25, 'K'); // fosas
    eye(g, 22, 15); eye(g, 38, 15);
    g.hline(28, 28, 8, 'K');
  } else {
    g.hline(24, 25, 16, 'T');
  }
  return g.toSprite();
}

// ---------- Gotilla (Agua): renacuajo-babosa redondo, bajo y ancho ----------
function gotilla(back: boolean): Sprite {
  const g = new Grid(64, 64);
  const WATER: Ramp = ['h', 'i', 'j'];
  // cola de renacuajo: elipses decrecientes que suben en curva
  g.ellipse(9, 46, 8, 5, ['i', 'j', 'j']);
  g.ellipse(4, 40, 4, 5, ['h', 'i', 'j']);
  // cuerpo
  g.ellipse(34, 42, 25, 18, WATER);
  // aleta dorsal
  g.poly([[24, 26], [32, 12], [40, 26]], ['i', 'j', 'j']);
  g.poly([[30, 24], [33, 16], [36, 24]], ['h', 'i', 'i'], false);
  if (!back) {
    g.ellipse(36, 48, 15, 9, ['W', 'w', 'w'], false);
    g.outlineAll('K');
    eye(g, 22, 32); eye(g, 40, 32);
    g.hline(30, 43, 8, 'K'); g.set(29, 42, 'K'); g.set(38, 42, 'K'); // sonrisa
    g.set(18, 44, 'R'); g.set(19, 44, 'R'); g.set(47, 44, 'R'); g.set(48, 44, 'R'); // mofletes
  } else {
    for (const [x, y] of [[26, 34], [38, 32], [32, 40]] as const) g.ellipse(x, y, 3, 2.5, ['h', 'h', 'i'], false);
    g.outlineAll('K');
  }
  return g.toSprite();
}

// ---------- Hojín (Planta): brote con dos hojas grandes y patitas ----------
function hojin(back: boolean): Sprite {
  const g = new Grid(64, 64);
  const LEAF: Ramp = ['a', 'b', 'c', 'd'];
  // patitas
  g.ellipse(22, 58, 6, 4, LEAF); g.ellipse(42, 58, 6, 4, LEAF);
  // hojas: nacen del cuerpo y se abren hacia arriba y afuera
  g.poly([[27, 30], [20, 14], [4, 6], [2, 22], [12, 34]], LEAF);
  g.poly([[37, 30], [44, 14], [60, 6], [62, 22], [52, 34]], LEAF);
  g.line(26, 30, 8, 12, 'd'); g.line(38, 30, 56, 12, 'd');
  // cuerpo grande y redondo
  g.ellipse(32, 44, 17, 15, LEAF);
  // capullo directamente sobre el cuerpo
  g.ellipse(32, 25, 7, 8, ['R', 'S', 'T']);
  g.poly([[32, 15], [26, 25], [38, 25]], ['W', 'R', 'S'], false);
  g.poly([[24, 31], [32, 26], [40, 31], [32, 33]], ['b', 'c', 'd']);
  if (!back) {
    g.ellipse(32, 49, 10, 8, ['y', 'l', 'm'], false);
    g.outlineAll('K');
    eye(g, 22, 38); eye(g, 39, 38);
    g.hline(29, 46, 6, 'K');
  } else {
    g.line(32, 36, 32, 56, 'd');
    g.line(24, 42, 40, 42, 'd');
    g.outlineAll('K');
  }
  return g.toSprite();
}

// ---------- Pelusón (Normal): bola de pelo con orejas altas ----------
function peluson(back: boolean): Sprite {
  const g = new Grid(64, 64);
  const FUR: Ramp = ['l', 'm', 'n'];
  // orejas altas
  g.ellipse(19, 14, 6, 13, FUR); g.ellipse(45, 14, 6, 13, FUR);
  if (!back) { g.ellipse(19, 15, 3, 8, ['R', 'S', 'S'], false); g.ellipse(45, 15, 3, 8, ['R', 'S', 'S'], false); g.outlineAll('K'); }
  // patitas
  g.ellipse(22, 59, 7, 3.5, FUR); g.ellipse(42, 59, 7, 3.5, FUR);
  // cuerpo peludo: elipse + mechones en el borde
  for (const [x, y] of [[10, 36], [8, 46], [14, 54], [54, 36], [56, 46], [50, 54]] as const) g.ellipse(x, y, 5, 5, FUR);
  g.ellipse(32, 41, 22, 19, FUR);
  if (!back) {
    g.ellipse(32, 48, 13, 9, ['y', 'l', 'm'], false);
    g.outlineAll('K');
    eye(g, 20, 32); eye(g, 41, 32);
    g.rect(31, 40, 3, 2, 'K'); g.set(32, 40, 'W'); // nariz
    g.hline(28, 44, 3, 'K'); g.hline(33, 44, 3, 'K'); g.set(31, 43, 'K'); g.set(33, 43, 'K');
  } else {
    // colita
    g.ellipse(32, 50, 6, 5, ['y', 'l', 'm']);
    for (const x of [14, 24, 40, 50]) g.set(x, 30, 'n');
  }
  return g.toSprite();
}

// ---------- Aleteo (Normal): ave de alas anchas desplegadas ----------
function aleteo(back: boolean): Sprite {
  const g = new Grid(64, 64);
  const WING: Ramp = ['m', 'n', 'o'];
  // alas desplegadas en forma de V
  g.poly([[24, 30], [2, 14], [0, 28], [6, 40], [24, 44]], WING);
  g.poly([[40, 30], [62, 14], [64, 28], [58, 40], [40, 44]], WING);
  for (const [x0, y0, x1, y1] of [[22, 33, 5, 20], [22, 38, 6, 30], [42, 33, 59, 20], [42, 38, 58, 30]] as const) g.line(x0, y0, x1, y1, 'o');
  // cola
  g.poly([[26, 48], [38, 48], [42, 62], [32, 58], [22, 62]], ['l', 'm', 'n']);
  // patas
  g.line(28, 52, 27, 59, 'O'); g.line(36, 52, 37, 59, 'O');
  g.hline(24, 59, 5, 'O'); g.hline(35, 59, 5, 'O');
  // cuerpo y cabeza
  g.ellipse(32, 40, 10, 13, ['y', 'l', 'm']);
  g.ellipse(32, 20, 9, 9, ['y', 'l', 'm']);
  // cresta
  g.poly([[28, 12], [32, 1], [36, 12]], ['R', 'S', 'T']);
  if (!back) {
    g.poly([[28, 22], [36, 22], [32, 29]], ['Y', 'O', 'P']); // pico
    g.hline(29, 22, 6, 'K');
    eye(g, 24, 15); eye(g, 37, 15);
  } else {
    g.hline(24, 26, 16, 'm');
    g.line(32, 28, 32, 46, 'n');
  }
  return g.toSprite();
}

// ---------- Cangrejete (Agua): cangrejo ancho y bajo, pinzas grandes ----------
function cangrejete(back: boolean): Sprite {
  const g = new Grid(64, 64);
  const SHELL: Ramp = ['R', 'S', 'T'];
  // patas
  for (const [x0, y0, x1, y1] of [[14, 48, 4, 58], [18, 52, 10, 62], [50, 48, 60, 58], [46, 52, 54, 62], [24, 54, 20, 62], [40, 54, 44, 62]] as const) {
    g.line(x0, y0, x1, y1, 'K'); g.line(x0 + 1, y0, x1 + 1, y1, 'S');
  }
  // brazos hacia las pinzas
  g.line(14, 40, 9, 30, 'K'); g.line(15, 40, 10, 30, 'S'); g.line(50, 40, 55, 30, 'K'); g.line(49, 40, 54, 30, 'S');
  // pinzas (abiertas, con muesca)
  g.ellipse(10, 20, 9, 10, SHELL); g.ellipse(54, 20, 9, 10, SHELL);
  // muesca en V: se borra el interior y el contorno se recalcula
  for (const [cx, dir] of [[11, -1], [53, 1]] as const)
    for (let y = 8; y <= 17; y++) for (let x = cx - Math.floor((y - 8) / 3) - 0; x <= cx + Math.floor((y - 8) / 3); x++) if (y < 16) g.set(x + dir * 0, y, '.');
  g.outlineAll('K');
  // caparazón
  g.ellipse(32, 44, 19, 12, SHELL);
  if (!back) {
    g.ellipse(32, 49, 11, 6, ['y', 'l', 'm'], false);
    g.outlineAll('K');
    // ojos sobre tallos
    g.rect(24, 28, 2, 7, 'S'); g.rect(38, 28, 2, 7, 'S');
    g.ellipse(25, 27, 3.5, 3.5, ['W', 'w', 'w']); g.ellipse(39, 27, 3.5, 3.5, ['W', 'w', 'w']);
    g.rect(25, 27, 2, 3, 'K'); g.rect(39, 27, 2, 3, 'K');
    g.hline(29, 47, 7, 'K'); g.set(28, 46, 'K'); g.set(36, 46, 'K');
  } else {
    for (const [x, y] of [[26, 40], [34, 38], [40, 44], [24, 46]] as const) g.set(x, y, 'R');
    g.hline(22, 50, 20, 'T');
  }
  return g.toSprite();
}

export const CREATURE_ART: Record<string, CreatureArt> = {
  brasito: { front: brasito(false), back: brasito(true) },
  gotilla: { front: gotilla(false), back: gotilla(true) },
  hojin: { front: hojin(false), back: hojin(true) },
  peluson: { front: peluson(false), back: peluson(true) },
  aleteo: { front: aleteo(false), back: aleteo(true) },
  cangrejete: { front: cangrejete(false), back: cangrejete(true) },
};

for (const [id, art] of Object.entries(CREATURE_ART)) {
  validateSprite(`${id}.front`, art.front, 64, 64);
  validateSprite(`${id}.back`, art.back, 64, 64);
}
