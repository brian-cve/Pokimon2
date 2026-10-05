import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from './data/encounters';
import { SPECIES } from './data/species';
import { MAP_IDS } from './data/maps';

// Estos tests validan los assets GENERADOS (public/assets): lo que realmente carga el juego.
const read = (f: string) => JSON.parse(readFileSync(`public/assets/${f}`, 'utf8'));
const atlas = read('atlas.json') as { frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>; meta: { size: { w: number; h: number } } };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

describe('atlas', () => {
  it('tiene frontal y trasera de cada especie', () => {
    for (const id of Object.keys(SPECIES)) {
      expect(atlas.frames, id).toHaveProperty(`${id}_front`);
      expect(atlas.frames, id).toHaveProperty(`${id}_back`);
    }
  });
  it('tiene 4 direcciones × 3 frames del jugador', () => {
    for (const d of ['down', 'up', 'left', 'right']) for (let i = 0; i < 3; i++) expect(atlas.frames).toHaveProperty(`player_${d}_${i}`);
  });
  it('los frames no se solapan y caben en la textura', () => {
    const fs = Object.entries(atlas.frames).map(([n, f]) => ({ n, ...f.frame }));
    for (const f of fs) {
      expect(f.x + f.w).toBeLessThanOrEqual(atlas.meta.size.w);
      expect(f.y + f.h).toBeLessThanOrEqual(atlas.meta.size.h);
    }
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      const a = fs[i], b = fs[j];
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap, `${a.n} solapa con ${b.n}`).toBe(false);
    }
  });
  it('todos los frames que el código pide por nombre existen en el atlas', () => {
    const wanted = new Set<string>();
    for (const file of walk('src').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/(['"])((?:ui_|fx_|battle_bg|grass_overlay|px)[\w]*)\1/g)) wanted.add(m[2]);
    }
    expect(wanted.size).toBeGreaterThan(10);
    for (const name of wanted) expect(atlas.frames, `frame '${name}' usado en el código`).toHaveProperty(name);
  });
});

describe.each(MAP_IDS)('mapa de Tiled: %s', (id) => {
  const map = read(`maps/${id}.json`);
  const layer = (n: string) => map.layers.find((l: { name: string }) => l.name === n);
  const solid = (x: number, y: number) => layer('collision').data[y * map.width + x] !== 0;
  const props = Object.fromEntries(map.properties.map((p: { name: string; value: unknown }) => [p.name, p.value]));

  it('las 3 capas de tiles tienen width×height celdas', () => {
    for (const n of ['ground', 'objects', 'collision']) expect(layer(n).data).toHaveLength(map.width * map.height);
  });
  it('declara una tabla de encuentros existente', () => {
    expect(ENCOUNTERS[props.encounterTable]).toBeDefined();
  });
  it('el spawn existe y es transitable', () => {
    const s = layer('entities').objects.find((o: { type: string }) => o.type === 'spawn');
    expect(s).toBeDefined();
    expect(solid(s.x / 16, s.y / 16)).toBe(false);
  });
  it('los warps llevan a un mapa existente, a una casilla transitable que no es otro warp', () => {
    const warps = layer('entities').objects.filter((o: { type: string }) => o.type === 'warp');
    expect(warps.length).toBeGreaterThan(0);
    for (const w of warps) {
      const p = Object.fromEntries(w.properties.map((q: { name: string; value: unknown }) => [q.name, q.value]));
      const dest = read(`maps/${p.toMap}.json`);
      const dl = (n: string) => dest.layers.find((l: { name: string }) => l.name === n);
      expect(dl('collision').data[p.toY * dest.width + p.toX], `${id}→${p.toMap}`).toBe(0);
      const isWarp = dl('entities').objects.some((o: { type: string; x: number; y: number }) => o.type === 'warp' && o.x / 16 === p.toX && o.y / 16 === p.toY);
      expect(isWarp).toBe(false);
    }
  });
  it('el tileset define las propiedades que usa el motor (tallGrass, water)', () => {
    const tiles = map.tilesets[0].tiles as { properties: { name: string }[] }[];
    const names = new Set(tiles.flatMap((t) => t.properties.map((p) => p.name)));
    expect(names.has('tallGrass')).toBe(true);
    expect(names.has('water')).toBe(true);
  });
});
