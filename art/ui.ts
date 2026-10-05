import { Grid } from './grid';
import { validateSprite, type Sprite } from './pixmap';

/** Caja con borde pixel art: contorno K, anillo de color y relleno; esquinas recortadas. */
export function box(w: number, h: number, ring = 'B', fill = 'W'): Sprite {
  const g = new Grid(w, h);
  g.rect(1, 0, w - 2, h, 'K'); g.rect(0, 1, w, h - 2, 'K');
  g.rect(1, 1, w - 2, h - 2, ring);
  g.rect(2, 2, w - 4, h - 4, fill);
  g.set(1, 1, 'K'); g.set(w - 2, 1, 'K'); g.set(1, h - 2, 'K'); g.set(w - 2, h - 2, 'K');
  // sombra interior (luz arriba-izquierda): borde inferior y derecho del relleno en gris
  g.hline(2, h - 3, w - 4, 'w'); g.vline(w - 3, 2, h - 4, 'w');
  return g.toSprite();
}

/** Caja de estado de combate: más clara, con una "pestaña" oscura a un lado. */
export function hpBox(w: number, h: number, tabSide: 'left' | 'right'): Sprite {
  const g = new Grid(w, h);
  g.blit(box(w, h, 'u', 'W'), 0, 0);
  const x = tabSide === 'left' ? 0 : w - 3;
  g.rect(x, 3, 3, h - 6, 'C');
  g.vline(x + (tabSide === 'left' ? 3 : -1), 3, h - 6, 'K');
  return g.toSprite();
}

export const CURSOR: Sprite = new Grid(5, 7)
  .blit(['K....', 'KK...', 'KKK..', 'KKKK.', 'KKK..', 'KK...', 'K....'], 0, 0).toSprite();

/** Marca ▼ que indica "pulsa para continuar". */
export const MORE_ARROW: Sprite = new Grid(7, 4)
  .blit(['KKKKKKK', '.KKKKK.', '..KKK..', '...K...'], 0, 0).toSprite();

/** Etiqueta "PS" para la barra de vida (naranja con contorno). */
export const HP_LABEL: Sprite = new Grid(11, 7).blit([
  '...........', '.KKK.KKK...', '.K.K.K.....', '.KKK.KKK...', '.K.....K...', '.K...KKK...', '...........',
], 0, 0).toSprite();

/** Fondo de combate 240×112 con cielo, horizonte, césped y las dos plataformas. */
export function battleBackground(): Sprite {
  const W = 240, H = 112, HORIZON = 46;
  const g = new Grid(W, H);
  // cielo: azul arriba, tramado en la transición y claro cerca del horizonte
  for (let y = 0; y < HORIZON; y++)
    for (let x = 0; x < W; x++) g.set(x, y, y < 12 ? 'i' : y < 18 ? ((x + y) % 2 === 0 ? 'i' : 'h') : 'h');
  // nubes
  for (const [cx, cy] of [[40, 14], [130, 8], [200, 22]] as const) {
    g.ellipse(cx, cy, 14, 4, ['W', 'W', 'w'], false);
    g.ellipse(cx + 9, cy - 3, 8, 4, ['W', 'W', 'w'], false);
  }
  // colinas lejanas
  for (let x = 0; x < W; x++) {
    const hy = HORIZON - 5 - Math.round(3 * Math.sin(x / 17) + 2 * Math.sin(x / 7 + 1));
    for (let y = hy; y < HORIZON; y++) g.set(x, y, 'c');
  }
  // césped por bandas con motas
  for (let y = HORIZON; y < H; y++) {
    const ch = y < HORIZON + 22 ? 'b' : y < HORIZON + 44 ? 'a' : 'b';
    for (let x = 0; x < W; x++) g.set(x, y, ch);
  }
  for (let y = HORIZON + 1; y < H; y += 1) {
    for (let x = (y * 7) % 11; x < W; x += 11) g.set(x, y, y % 2 ? 'c' : 'a');
  }
  g.hline(0, HORIZON, W, 'd');
  // plataforma enemiga (arriba a la derecha) y del jugador (abajo a la izquierda)
  g.ellipse(172, 66, 38, 9, ['a', 'b', 'c'], 'd');
  g.ellipse(172, 64, 32, 6, ['a', 'a', 'b'], false);
  g.ellipse(62, 110, 60, 12, ['a', 'b', 'c'], 'd');
  g.ellipse(62, 108, 52, 8, ['a', 'a', 'b'], false);
  return g.toSprite();
}

/** Destellos de impacto 16×16, uno por tipo. */
export function impact(kind: 'normal' | 'fire' | 'water' | 'grass'): Sprite {
  const g = new Grid(16, 16);
  if (kind === 'normal') {
    g.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], ['W', 'Y', 'O']);
  } else if (kind === 'fire') {
    g.ellipse(8, 10, 5, 5, ['Y', 'O', 'P']);
    g.poly([[8, 0], [4, 8], [12, 8]], ['Y', 'O', 'P']);
    g.poly([[2, 4], [4, 10], [0, 10]], ['O', 'P', 'P']); g.poly([[14, 4], [16, 10], [12, 10]], ['O', 'P', 'P']);
  } else if (kind === 'water') {
    // tres gotas: punta arriba + panza redonda
    for (const [x, y, r] of [[8, 11, 4], [3, 5, 2.5], [13, 5, 2.5]] as const) {
      g.poly([[x, y - r * 1.9], [x - r * 0.9, y - 0.5], [x + r * 0.9, y - 0.5]], ['h', 'i', 'j']);
      g.ellipse(x, y, r, r, ['h', 'i', 'j']);
    }
  } else {
    g.poly([[8, 0], [12, 6], [8, 12], [4, 6]], ['a', 'b', 'c']);
    g.poly([[0, 10], [7, 8], [6, 15]], ['a', 'b', 'c']); g.poly([[16, 10], [9, 8], [10, 15]], ['a', 'b', 'c']);
  }
  return g.toSprite();
}

/** Icono de altavoz 12×11 (con contorno blanco para leerse sobre cualquier fondo). */
function speakerIcon(on: boolean): Sprite {
  const g = new Grid(14, 11);
  g.rect(2, 4, 3, 3, 'K');
  g.poly([[5, 4], [8, 1], [8, 10], [5, 7]], ['K'], false);
  if (on) {
    for (const [x, y] of [[10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8]] as const) g.set(x, y, 'K');
  } else {
    g.line(10, 3, 13, 7, 'R'); g.line(13, 3, 10, 7, 'R');
  }
  g.outlineAll('W');
  return g.toSprite();
}

/** Hierba alta que cubre los pies del jugador: solo las puntas de las hojas, sin fondo. */
function grassOverlay(): Sprite {
  const g = new Grid(16, 8);
  const blade = ['a...a', 'b.a.b', 'bbabb', 'dbbbd', '.dbd.'];
  for (const bx of [-1, 5, 11]) g.blit(blade, bx, 0);
  for (const bx of [2, 8, 14]) g.blit(blade, bx, 3);
  return g.toSprite();
}

export const SPEC: [string, Sprite, number, number][] = [
  ['ui_cursor', CURSOR, 5, 7], ['ui_more', MORE_ARROW, 7, 4], ['ui_hplabel', HP_LABEL, 11, 7],
  ['ui_dialog', box(240, 48), 240, 48], ['ui_menu', box(104, 48), 104, 48], ['ui_prompt', box(136, 48), 136, 48],
  ['ui_moves', box(168, 48), 168, 48], ['ui_moveinfo', box(72, 48), 72, 48],
  ['ui_hpbox_enemy', hpBox(104, 32, 'left'), 104, 32], ['ui_hpbox_player', hpBox(112, 42, 'right'), 112, 42],
  ['ui_sound_on', speakerIcon(true), 14, 11], ['ui_sound_off', speakerIcon(false), 14, 11],
  ['ui_banner', box(96, 20), 96, 20], ['grass_overlay', grassOverlay(), 16, 8],
  ['ui_panel', box(160, 56, 'O', 'W'), 160, 56],
  ['battle_bg', battleBackground(), 240, 112],
  ['fx_normal', impact('normal'), 16, 16], ['fx_fire', impact('fire'), 16, 16],
  ['fx_water', impact('water'), 16, 16], ['fx_grass', impact('grass'), 16, 16],
];
for (const [n, s, w, h] of SPEC) validateSprite(n, s, w, h);
