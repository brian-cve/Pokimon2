import { Grid } from './grid';
import type { Sprite } from './pixmap';

/**
 * Fuente bitmap procedural (5×7, mayúsculas). Cada glifo es una matriz de strings ('#' = píxel).
 * Los glifos son de ancho variable; el atlas los empaqueta en una tira con altura fija.
 * El texto del juego se escribe en MAYÚSCULAS (estilo GBA); `toFontText` lo normaliza.
 */
const G: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '.', '.', '#', '#', '#'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '¡': ['#', '.', '#', '#', '#', '#', '#'],
  '¿': ['..#..', '.....', '..#..', '.#...', '#....', '#...#', '.###.'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
  ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

// Acentos: se dibujan en las filas 0–1 sobre la letra base (que ocupa las filas 2–8).
const ACUTE = ['...#.', '..#..'];
const GLYPH_TOP = 2;
export const FONT_CELL_H = 10;
export const FONT_LINE_H = 11;

const ACCENTED: Record<string, [string, string[]]> = {
  Á: ['A', ACUTE], É: ['E', ACUTE], Í: ['I', ['..#', '.#.']], Ó: ['O', ACUTE], Ú: ['U', ACUTE],
  Ñ: ['N', ['.##.#', '#.##.']], Ü: ['U', ['.....', '.#.#.']],
};

interface Placed { w: number; rows: string[] }
function build(): Record<string, Placed> {
  const out: Record<string, Placed> = {};
  for (const [ch, rows] of Object.entries(G)) {
    const w = Math.max(...rows.map((r) => r.length));
    out[ch] = { w, rows: [...Array<string>(GLYPH_TOP).fill('.'.repeat(w)), ...rows.map((r) => r.padEnd(w, '.'))] };
  }
  for (const [ch, [base, mark]] of Object.entries(ACCENTED)) {
    const b = out[base];
    const rows = [...b.rows];
    mark.forEach((m, i) => (rows[i] = m.padEnd(b.w, '.').slice(0, b.w)));
    out[ch] = { w: b.w, rows };
  }
  return out;
}

export const GLYPHS = build();
export const CHARS = Object.keys(GLYPHS);
/** Avance horizontal = ancho del glifo + 1 px de separación. */
export const advance = (ch: string): number => (GLYPHS[ch]?.w ?? GLYPHS['?'].w) + 1;

export function toFontText(s: string): string {
  return s.toUpperCase();
}
export function measure(text: string): number {
  return [...toFontText(text)].reduce((w, c) => w + advance(c), 0) - 1;
}

/** Atlas: una tira horizontal con todos los glifos en blanco (se tiñe en runtime). */
export function buildFontAtlas(): { sprite: Sprite; frames: Record<string, { x: number; w: number }> } {
  const frames: Record<string, { x: number; w: number }> = {};
  let x = 0;
  for (const ch of CHARS) { frames[ch] = { x, w: GLYPHS[ch].w }; x += GLYPHS[ch].w + 1; }
  const g = new Grid(x, FONT_CELL_H);
  for (const ch of CHARS) {
    GLYPHS[ch].rows.forEach((row, j) => [...row].forEach((c, i) => c === '#' && g.set(frames[ch].x + i, j, 'W')));
  }
  return { sprite: g.toSprite(), frames };
}

/** Texto ya rasterizado (para la hoja de verificación). */
export function renderText(text: string, color = 'K'): Sprite {
  const t = toFontText(text);
  const g = new Grid(Math.max(1, measure(t)), FONT_CELL_H);
  let x = 0;
  for (const ch of t) {
    const gl = GLYPHS[ch] ?? GLYPHS['?'];
    gl.rows.forEach((row, j) => [...row].forEach((c, i) => c === '#' && g.set(x + i, j, color)));
    x += gl.w + 1;
  }
  return g.toSprite();
}
