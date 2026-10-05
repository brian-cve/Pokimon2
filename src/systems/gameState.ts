import { createCreature, healCreature, type Creature } from './creature';

/** Estado de partida en memoria (no hay guardado en este MVP). */
export const game: { player: Creature; safeSteps: number } = {
  player: createCreature('brasito', 5),
  safeSteps: 0,
};

export function resetAfterDefeat(): void {
  healCreature(game.player);
  game.safeSteps = 0;
}
