import { describe, expect, it } from 'vitest';
import { TILE_DEFS } from '../../art/tiles';
import { SPECIES } from '../../src/data/species';
import { CREATURES, HERO, TILES } from './kenney';

// Las hojas de Kenney (tilemap_packed.png) miden 12 columnas × 11 filas de 16×16.
const ROWS = 11, COLS = 12;
const inside = (r: { row: number; col: number }) => r.row >= 0 && r.row < ROWS && r.col >= 0 && r.col < COLS;

describe('mapeo del pack de Kenney', () => {
  it('todas las casillas están dentro de la hoja', () => {
    for (const [n, r] of Object.entries({ ...TILES, ...CREATURES, hero: HERO })) expect(inside(r), n).toBe(true);
  });
  it('solo mapea tiles que el juego conoce', () => {
    const known = new Set(TILE_DEFS.map(([n]) => n));
    for (const n of Object.keys(TILES)) expect(known.has(n), n).toBe(true);
  });
  it('solo mapea especies que existen', () => {
    for (const id of Object.keys(CREATURES)) expect(SPECIES[id], id).toBeDefined();
  });
  it('cubre las 6 especies', () => {
    expect(Object.keys(CREATURES).sort()).toEqual(Object.keys(SPECIES).sort());
  });
});
