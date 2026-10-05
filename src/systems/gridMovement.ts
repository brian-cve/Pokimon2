import type { Dir } from '../data/maps/types';

export const DIR_VEC: Record<Dir, [number, number]> = {
  down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0],
};
