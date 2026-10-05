import { parseMap } from './parse';

// Ruta 1: camino largo hacia el este con hierba alta, un estanque y rocas.
export const ROUTE = parseMap({
  id: 'route',
  name: 'RUTA 1',
  encounterTable: 'route',
  spawn: { x: 1, y: 8, dir: 'right' },
  warps: [
    { tiles: [[0, 8]], toMap: 'town', toX: 22, toY: 8, dir: 'left' },
    { tiles: [[0, 9]], toMap: 'town', toX: 22, toY: 9, dir: 'left' },
  ],
  rows: [
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'F......f.......................F',
    'F.yT.""""""""".T.."""".~~~~~~.TF',
    'F...."""""""""...."""".~~~~~~..F',
    'F...."""""""""R..."""".~~~~~~.yF',
    'F.T..""""""""".T.."""".........F',
    'F............................R.F',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.F',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.F',
    'F.........=====.....T....f.....F',
    'F.."""""""......""""""""""""...F',
    'F..""""""".T..T.""""""""""""...F',
    'F.."""""""......""""""""""""..TF',
    'F.."""""""......""""""""""""...F',
    'F...........R...y....f.........F',
    'F.........................R....F',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  ],
});
