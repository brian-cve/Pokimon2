import { createCreature, healCreature, type Creature } from './creature';

/** Máximo de criaturas en el equipo (como en la GBA). */
export const PARTY_MAX = 6;

/** Estado de partida en memoria (no hay guardado en este MVP). `party[0]` es la criatura que combate. */
export const game: { player: Creature; party: Creature[]; safeSteps: number; inGame: boolean } = {
  player: createCreature('brasito', 5),
  party: [],
  safeSteps: 0,
  inGame: false,
};
game.party = [game.player];

/** Empieza una partida nueva desde el título. */
export function newGame(): void {
  game.player = createCreature('brasito', 5);
  game.party = [game.player];
  game.safeSteps = 0;
  game.inGame = true;
}

export function resetAfterDefeat(): void {
  healCreature(game.player);
  game.safeSteps = 0;
}
