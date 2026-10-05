import { TILE_INDEX } from '../../art/tiles';
import type { Dir, MapData, Warp } from './types';

/**
 * Interior de una casa en ASCII (cada carácter = una casilla). Leyenda:
 *  #  pared superior   _  pared   |  pared lateral   o  ventana     k  estantería   (pared: bloquean)
 *  .  suelo            r  alfombra    M  felpudo de salida (transitable; aquí va el warp)
 *  B/b  cabecera/pie de la cama (interactuable: descansar)   t mesa   p planta   c cofre (interactuable)
 */
export interface InteriorSource {
  id: string;
  name: string;
  rows: string[];
  warps: Warp[];
  spawn: { x: number; y: number; dir: Dir };
}

const idx = (n: string) => TILE_INDEX[n];
const WALL_GROUND: Record<string, string> = { '#': 'wallTop', _: 'wallBase', '|': 'wallSide', o: 'window', k: 'shelf' };
const OBJECT: Record<string, string> = { B: 'bedHead', b: 'bedFoot', t: 'table', p: 'plant', c: 'chest' };

export function parseInterior(src: InteriorSource): MapData {
  const height = src.rows.length, width = src.rows[0].length;
  const ground = Array.from({ length: height }, () => Array<number>(width).fill(0));
  const objects = Array.from({ length: height }, () => Array<number>(width).fill(-1));
  const collision = Array.from({ length: height }, () => Array<number>(width).fill(0));
  const interacts: MapData['interacts'] = [];

  src.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${src.id}: fila ${y} mide ${row.length}, se esperaba ${width}`);
    [...row].forEach((ch, x) => {
      ground[y][x] = idx((x + y) % 2 ? 'floor2' : 'floor');
      if (WALL_GROUND[ch]) { ground[y][x] = idx(WALL_GROUND[ch]); collision[y][x] = 1; }
      else if (OBJECT[ch]) {
        objects[y][x] = idx(OBJECT[ch]); collision[y][x] = 1;
        if (ch === 'B' || ch === 'b') interacts.push({ x, y, kind: 'bed' });
        if (ch === 'c') interacts.push({ x, y, kind: 'chest' });
      } else if (ch === 'r') ground[y][x] = idx('rug');
      else if (ch === 'M') ground[y][x] = idx('mat');
      else if (ch !== '.') throw new Error(`${src.id}: carácter '${ch}' desconocido en (${x},${y})`);
    });
  });
  return { id: src.id, name: src.name, width, height, ground, objects, collision, warps: src.warps, interacts, encounterTable: 'town', spawn: src.spawn };
}
