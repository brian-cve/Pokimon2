import { describe, expect, it } from 'vitest';
import { MAPS } from './index';

describe('mapas', () => {
  for (const m of Object.values(MAPS)) {
    it(`${m.id}: capas con las mismas dimensiones`, () => {
      for (const layer of [m.ground, m.objects, m.collision]) {
        expect(layer).toHaveLength(m.height);
        layer.forEach((row) => expect(row).toHaveLength(m.width));
      }
    });
    it(`${m.id}: el spawn es transitable`, () => {
      expect(m.collision[m.spawn.y][m.spawn.x]).toBe(0);
    });
  }
});

describe('warps', () => {
  for (const m of Object.values(MAPS)) {
    for (const w of m.warps) {
      it(`${m.id} → ${w.toMap}: destino existente y transitable`, () => {
        const dest = MAPS[w.toMap];
        expect(dest).toBeDefined();
        expect(dest.collision[w.toY][w.toX]).toBe(0);
        // el destino no puede ser a su vez un warp (evita bucles de cambio de mapa)
        const loops = dest.warps.some((d) => d.tiles.some(([x, y]) => x === w.toX && y === w.toY));
        expect(loops).toBe(false);
      });
      it(`${m.id}: las casillas de warp son transitables`, () => {
        for (const [x, y] of w.tiles) expect(m.collision[y][x]).toBe(0);
      });
    }
  }
});
