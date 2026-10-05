export type TypeId = 'normal' | 'fire' | 'water' | 'grass';

export const TYPE_NAMES: Record<TypeId, string> = {
  normal: 'NORMAL', fire: 'FUEGO', water: 'AGUA', grass: 'PLANTA',
};

/** CHART[atacante][defensor] = multiplicador. Lo no listado vale 1. */
const CHART: Partial<Record<TypeId, Partial<Record<TypeId, number>>>> = {
  fire: { grass: 2, water: 0.5, fire: 0.5 },
  water: { fire: 2, grass: 0.5, water: 0.5 },
  grass: { water: 2, fire: 0.5, grass: 0.5 },
};

export function effectiveness(attack: TypeId, defend: TypeId): number {
  return CHART[attack]?.[defend] ?? 1;
}
