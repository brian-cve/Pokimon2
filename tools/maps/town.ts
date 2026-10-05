import { parseMap } from './parse';

// Villa Brasa: dos casas, un estanque al sur y una salida al este hacia la ruta.
export const TOWN = parseMap({
  id: 'town',
  name: 'VILLA BRASA',
  encounterTable: 'town',
  spawn: { x: 4, y: 7, dir: 'down' },
  warps: [
    { tiles: [[23, 8]], toMap: 'route', toX: 1, toY: 8, dir: 'right' },
    { tiles: [[23, 9]], toMap: 'route', toX: 1, toY: 9, dir: 'right' },
  ],
  rows: [
    'FFFFFFFFFFFFFFFFFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFF',
    'F..f..........y......f.F',
    'F..Hhh.....Hhh.........F',
    'F..hhh.....hhh.....R...F',
    'F..hhh.....hhh.........F',
    'F...,.......,..........F',
    'F...,...T...,.......f..F',
    'F,,,,,,,,,,,,,,,,,,,,,,,',
    'F,,,,,,,,,,,,,,,,,,,,,,,',
    'F...,.......""""......yF',
    'F.........""""""....f..F',
    'F.........""""""......RF',
    'F..=======.........y...F',
    'F..................R...F',
    'F~~~~~~~~~~~~~~~~~~~~~~F',
    'F~~~~~~~~~~~~~~~~~~~~~~F',
    'FFFFFFFFFFFFFFFFFFFFFFFF',
  ],
});
