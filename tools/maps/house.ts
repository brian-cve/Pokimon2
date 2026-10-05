import { parseInterior } from './interior';

// Casa de Villa Brasa: cama (descansar), cofre (repone Poké Balls), mesa, plantas y estanterías.
export const HOUSE = parseInterior({
  id: 'house',
  name: 'CASA',
  spawn: { x: 4, y: 6, dir: 'up' },
  warps: [{ tiles: [[4, 7]], toMap: 'town', toX: 4, toY: 6, dir: 'down' }],
  rows: [
    '##########',
    '_k_o__o_k_',
    '|B.....c.|',
    '|b......p|',
    '|..trrr.p|',
    '|...rrr..|',
    '|........|',
    '____M_____',
  ],
});
