import { TILE, TILE_DEFS, TILE_INDEX } from '../../art/tiles';
import type { MapData } from './types';

type Prop = { name: string; type: 'string' | 'int' | 'bool'; value: string | number | boolean };
const prop = (name: string, value: string | number | boolean): Prop => ({
  name, value, type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'int' : 'string',
});

/** Propiedades de tile del tileset (en Tiled se editan en el panel "Tile Properties"). */
const TILE_PROPS: Record<string, Record<string, string | number | boolean>> = {
  tallGrass: { tallGrass: true },
  water0: { water: true, waterFrame: 0 },
  water1: { water: true, waterFrame: 1 },
  water2: { water: true, waterFrame: 2 },
};

export const TILESET_FILE = 'tileset.png';

/** Convierte un MapData a un mapa de Tiled (JSON, formato 1.10) listo para `load.tilemapTiledJSON`. */
export function toTiled(m: MapData) {
  const gid = (i: number) => (i < 0 ? 0 : i + 1);
  const layer = (id: number, name: string, grid: number[][], visible = true) => ({
    id, name, type: 'tilelayer', x: 0, y: 0, width: m.width, height: m.height, opacity: 1, visible,
    data: grid.flat().map(gid),
  });
  const solid = TILE_INDEX.solid;
  const warpObjects = m.warps.flatMap((w, wi) => w.tiles.map(([x, y], ti) => ({
    id: 10 + wi * 10 + ti, name: `warp_${w.toMap}`, type: 'warp', x: x * TILE, y: y * TILE, width: TILE, height: TILE, rotation: 0, visible: true,
    properties: [prop('toMap', w.toMap), prop('toX', w.toX), prop('toY', w.toY), prop('dir', w.dir)],
  })));
  const interactObjects = m.interacts.map((it, i) => ({
    id: 60 + i, name: it.kind, type: 'interact', x: it.x * TILE, y: it.y * TILE, width: TILE, height: TILE, rotation: 0, visible: true,
    properties: [prop('kind', it.kind)],
  }));
  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    compressionlevel: -1, width: m.width, height: m.height, tilewidth: TILE, tileheight: TILE, nextlayerid: 5, nextobjectid: 100,
    properties: [prop('displayName', m.name), prop('encounterTable', m.encounterTable)],
    layers: [
      layer(1, 'ground', m.ground),
      layer(2, 'objects', m.objects),
      layer(3, 'collision', m.collision.map((r) => r.map((v) => (v ? solid : -1))), false),
      {
        id: 4, name: 'entities', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown',
        objects: [
          { id: 1, name: 'spawn', type: 'spawn', x: m.spawn.x * TILE, y: m.spawn.y * TILE, width: TILE, height: TILE, rotation: 0, visible: true, properties: [prop('dir', m.spawn.dir)] },
          ...warpObjects,
          ...interactObjects,
        ],
      },
    ],
    tilesets: [{
      firstgid: 1, name: 'tileset', image: TILESET_FILE, imagewidth: TILE_DEFS.length * TILE, imageheight: TILE,
      tilewidth: TILE, tileheight: TILE, tilecount: TILE_DEFS.length, columns: TILE_DEFS.length, margin: 0, spacing: 0,
      tiles: Object.entries(TILE_PROPS).map(([name, p]) => ({ id: TILE_INDEX[name], properties: Object.entries(p).map(([k, v]) => prop(k, v)) })),
    }],
  };
}
