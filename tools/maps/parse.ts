import { TILE_INDEX } from '../../art/tiles';
import type { MapData, Warp, Dir } from './types';

/**
 * Leyenda del mapa ASCII (cada carácter = una casilla):
 *  .  césped (variante según posición)     f/y  flores roja / amarilla
 *  ,  camino     "  hierba alta     ~  agua
 *  T  árbol suelto (2 casillas de alto)     F  bosque denso (borde del mapa)     R  roca     =  valla
 *  H  esquina sup-izq. de una casa 3x3 (las otras 8 casillas se escriben 'h')
 *  E  igual que H, pero la puerta (centro de la fila de abajo) es transitable y se puede cruzar con un warp
 */

export interface MapSource {
  id: string;
  name: string;
  rows: string[];
  encounterTable: string;
  warps?: Warp[];
  spawn: { x: number; y: number; dir: Dir };
}

const idx = (name: string) => TILE_INDEX[name];

function grassVariant(x: number, y: number): number {
  const h = (x * 73856093) ^ (y * 19349663);
  const r = ((h >>> 0) % 100);
  return r < 70 ? idx('grass0') : r < 85 ? idx('grass1') : idx('grass2');
}

export function parseMap(src: MapSource): MapData {
  const height = src.rows.length;
  const width = src.rows[0].length;
  const matrix = <T,>(v: T) => Array.from({ length: height }, () => Array<T>(width).fill(v));
  const ground = matrix(0), objects = matrix(-1), collision = matrix(0);

  src.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${src.id}: fila ${y} mide ${row.length}, se esperaba ${width}`);
    [...row].forEach((ch, x) => {
      ground[y][x] = grassVariant(x, y);
      switch (ch) {
        case '.': break;
        case 'f': ground[y][x] = idx('flowerRed'); break;
        case 'y': ground[y][x] = idx('flowerYellow'); break;
        case ',': ground[y][x] = idx('path'); break;
        case '"': ground[y][x] = idx('tallGrass'); break;
        case '~': ground[y][x] = idx('water0'); collision[y][x] = 1; break;
        case 'T':
          objects[y][x] = idx('treeBottom'); collision[y][x] = 1;
          if (y > 0 && src.rows[y - 1][x] !== 'T' && src.rows[y - 1][x] !== 'F') { objects[y - 1][x] = idx('treeTop'); collision[y - 1][x] = 1; }
          break;
        case 'F': objects[y][x] = idx('forest'); collision[y][x] = 1; break;
        case 'R': objects[y][x] = idx('rock'); collision[y][x] = 1; break;
        case '=': objects[y][x] = idx('fence'); collision[y][x] = 1; break;
        case 'H':
        case 'E':
          for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
            if (src.rows[y + j]?.[x + i] !== (i === 0 && j === 0 ? ch : 'h')) throw new Error(`${src.id}: casa mal formada en (${x},${y})`);
            objects[y + j][x + i] = idx(`house${j * 3 + i}`); collision[y + j][x + i] = 1;
          }
          if (ch === 'E') collision[y + 2][x + 1] = 0; // puerta
          break;
        case 'h': break; // cubierta por la 'H' de su esquina
        default: throw new Error(`${src.id}: carácter '${ch}' desconocido en (${x},${y})`);
      }
    });
  });
  return { id: src.id, name: src.name, width, height, ground, objects, collision, warps: src.warps ?? [], interacts: [], encounterTable: src.encounterTable, spawn: src.spawn };
}

