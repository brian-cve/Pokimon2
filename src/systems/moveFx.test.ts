import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOVES } from '../data/moves';

// moveFx.ts importa Phaser (necesita navegador): se comprueba su texto en vez de importarlo.
describe('animaciones de movimientos', () => {
  const src = readFileSync('src/systems/moveFx.ts', 'utf8');
  it('cada movimiento del juego tiene su animación propia', () => {
    for (const id of Object.keys(MOVES)) expect(src, id).toMatch(new RegExp(`^  ${id}: `, 'm'));
  });
});
