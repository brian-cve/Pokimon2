import type { TypeId } from './types';

export interface SpeciesData {
  id: string;
  name: string;
  type: TypeId;
  base: { hp: number; atk: number; def: number; spd: number };
  /** Experiencia base que da al ser derrotada. */
  expYield: number;
  moves: string[];
}

const list: SpeciesData[] = [
  { id: 'brasito', name: 'Brasito', type: 'fire', base: { hp: 45, atk: 52, def: 43, spd: 65 }, expYield: 62, moves: ['aranazo', 'ascuas', 'lanzallamas', 'placaje'] },
  { id: 'gotilla', name: 'Gotilla', type: 'water', base: { hp: 50, atk: 48, def: 60, spd: 43 }, expYield: 60, moves: ['placaje', 'pistolaAgua', 'hidropulso', 'aranazo'] },
  { id: 'hojin', name: 'Hojín', type: 'grass', base: { hp: 45, atk: 49, def: 49, spd: 45 }, expYield: 60, moves: ['placaje', 'latigoCepa', 'hojaAfilada', 'aranazo'] },
  { id: 'peluson', name: 'Pelusón', type: 'normal', base: { hp: 55, atk: 50, def: 45, spd: 55 }, expYield: 56, moves: ['placaje', 'aranazo', 'mordisco', 'ataqueRapido'] },
  { id: 'aleteo', name: 'Aleteo', type: 'normal', base: { hp: 40, atk: 45, def: 40, spd: 70 }, expYield: 55, moves: ['picotazo', 'ataqueAla', 'ataqueRapido', 'placaje'] },
  { id: 'cangrejete', name: 'Cangrejete', type: 'water', base: { hp: 40, atk: 60, def: 65, spd: 30 }, expYield: 65, moves: ['pistolaAgua', 'mordisco', 'hidropulso', 'placaje'] },
];

export const SPECIES: Record<string, SpeciesData> = Object.fromEntries(list.map((s) => [s.id, s]));
