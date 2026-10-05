export type Dir = 'down' | 'up' | 'left' | 'right';

export interface Warp {
  /** Casillas de origen que activan el cambio de mapa. */
  tiles: [number, number][];
  toMap: string;
  toX: number;
  toY: number;
  /** Dirección en la que aparece el jugador. */
  dir: Dir;
}

/** Mapa ya expandido: una matriz por capa, indexada [y][x]. */
export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Índices de TILE_DEFS. */
  ground: number[][];
  /** Índices de TILE_DEFS, -1 = vacío. Se dibuja sobre el suelo. */
  objects: number[][];
  /** 1 = bloqueado. */
  collision: number[][];
  warps: Warp[];
  /** Tabla de encuentros (id de tabla en data/encounters.ts). */
  encounterTable: string;
  spawn: { x: number; y: number; dir: Dir };
}
