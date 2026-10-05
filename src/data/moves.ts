import type { TypeId } from './types';

export interface MoveData {
  id: string;
  name: string;
  type: TypeId;
  power: number;
  accuracy: number;
  pp: number;
}

const list: MoveData[] = [
  { id: 'placaje', name: 'Placaje', type: 'normal', power: 40, accuracy: 100, pp: 35 },
  { id: 'aranazo', name: 'Arañazo', type: 'normal', power: 40, accuracy: 100, pp: 35 },
  { id: 'ataqueRapido', name: 'Carrera', type: 'normal', power: 40, accuracy: 100, pp: 30 },
  { id: 'picotazo', name: 'Picotazo', type: 'normal', power: 35, accuracy: 100, pp: 35 },
  { id: 'mordisco', name: 'Mordisco', type: 'normal', power: 60, accuracy: 100, pp: 25 },
  { id: 'ataqueAla', name: 'Ataque Ala', type: 'normal', power: 60, accuracy: 100, pp: 35 },
  { id: 'ascuas', name: 'Ascuas', type: 'fire', power: 40, accuracy: 100, pp: 25 },
  { id: 'lanzallamas', name: 'Lanzallamas', type: 'fire', power: 70, accuracy: 90, pp: 15 },
  { id: 'pistolaAgua', name: 'Pistola Agua', type: 'water', power: 40, accuracy: 100, pp: 25 },
  { id: 'hidropulso', name: 'Hidropulso', type: 'water', power: 60, accuracy: 100, pp: 20 },
  { id: 'latigoCepa', name: 'Látigo Cepa', type: 'grass', power: 45, accuracy: 100, pp: 25 },
  { id: 'hojaAfilada', name: 'Hoja Afilada', type: 'grass', power: 55, accuracy: 95, pp: 25 },
  // Se usa cuando a una criatura no le queda PP en ningún movimiento.
  { id: 'forcejeo', name: 'Forcejeo', type: 'normal', power: 40, accuracy: 100, pp: 1 },
];

export const MOVES: Record<string, MoveData> = Object.fromEntries(list.map((m) => [m.id, m]));
