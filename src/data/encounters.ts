export interface EncounterEntry { species: string; minLevel: number; maxLevel: number; weight: number }

/** Probabilidad de combate por casilla de hierba alta. */
export const ENCOUNTER_RATE = 0.12;

/** Una tabla por mapa; las especies no se repiten entre tablas. */
export const ENCOUNTERS: Record<string, EncounterEntry[]> = {
  town: [
    { species: 'peluson', minLevel: 3, maxLevel: 5, weight: 45 },
    { species: 'hojin', minLevel: 3, maxLevel: 5, weight: 35 },
    { species: 'gotilla', minLevel: 3, maxLevel: 4, weight: 20 },
  ],
  route: [
    { species: 'aleteo', minLevel: 5, maxLevel: 7, weight: 40 },
    { species: 'cangrejete', minLevel: 5, maxLevel: 8, weight: 30 },
    { species: 'brasito', minLevel: 5, maxLevel: 6, weight: 30 },
  ],
};

export function rollEncounter(table: string, rng: () => number = Math.random): { species: string; level: number } {
  const entries = ENCOUNTERS[table];
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  const pick = entries.find((e) => (r -= e.weight) < 0) ?? entries[entries.length - 1];
  const level = pick.minLevel + Math.floor(rng() * (pick.maxLevel - pick.minLevel + 1));
  return { species: pick.species, level };
}
