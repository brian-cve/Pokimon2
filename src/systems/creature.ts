import { MOVES } from '../data/moves';
import { SPECIES, type SpeciesData } from '../data/species';

export interface Stats { hp: number; atk: number; def: number; spd: number }
export interface MoveSlot { id: string; pp: number }

export interface Creature {
  speciesId: string;
  level: number;
  exp: number;
  stats: Stats;
  hp: number;
  moves: MoveSlot[];
}

export const MAX_LEVEL = 100;

export function computeStats(sp: SpeciesData, level: number): Stats {
  const core = (b: number) => Math.floor((2 * b * level) / 100) + 5;
  return { hp: Math.floor((2 * sp.base.hp * level) / 100) + level + 10, atk: core(sp.base.atk), def: core(sp.base.def), spd: core(sp.base.spd) };
}

/** Curva de experiencia cúbica. */
export const expForLevel = (level: number): number => level ** 3;

export function createCreature(speciesId: string, level: number): Creature {
  const sp = SPECIES[speciesId];
  const stats = computeStats(sp, level);
  return {
    speciesId, level, exp: expForLevel(level), stats, hp: stats.hp,
    moves: sp.moves.map((id) => ({ id, pp: MOVES[id].pp })),
  };
}

export function healCreature(c: Creature): void {
  c.hp = c.stats.hp;
  c.moves.forEach((m) => (m.pp = MOVES[m.id].pp));
}

/** Fracción de la barra de EXP dentro del nivel actual (0..1). */
export function expProgress(c: Creature): number {
  const lo = expForLevel(c.level), hi = expForLevel(c.level + 1);
  return c.level >= MAX_LEVEL ? 0 : Math.min(1, Math.max(0, (c.exp - lo) / (hi - lo)));
}
