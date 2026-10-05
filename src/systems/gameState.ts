import { createCreature, healCreature, type Creature } from './creature';

/** Máximo de criaturas en el equipo (como en la GBA). */
export const PARTY_MAX = 6;

/** Poké Balls al empezar y máximo que se puede llevar (el cofre de la casa repone hasta el máximo). */
export const BALLS_MAX = 10;

/** Estado de partida en memoria (no hay guardado en este MVP). `party[0]` es la criatura que combate. */
export const game: { player: Creature; party: Creature[]; balls: number; safeSteps: number; inGame: boolean } = {
  player: createCreature('brasito', 5),
  party: [],
  balls: BALLS_MAX,
  safeSteps: 0,
  inGame: false,
};
game.party = [game.player];

/** Empieza una partida nueva desde el título. */
export function newGame(): void {
  game.player = createCreature('brasito', 5);
  game.party = [game.player];
  game.balls = BALLS_MAX;
  game.safeSteps = 0;
  game.inGame = true;
}

/** Cura a todo el equipo (derrota o descanso en la cama). */
export function healParty(): void {
  game.party.forEach(healCreature);
}

/** Añade una criatura capturada al equipo; devuelve false si ya hay 6. */
export function addToParty(c: Creature): boolean {
  if (game.party.length >= PARTY_MAX) return false;
  game.party.push(c);
  return true;
}

/** Pone a la criatura `index` como líder (la que combate). */
export function makeLead(index: number): void {
  const [c] = game.party.splice(index, 1);
  game.party.unshift(c);
  game.player = c;
}

export function resetAfterDefeat(): void {
  healParty();
  game.safeSteps = 0;
}
