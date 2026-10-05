import { MOVES, type MoveData } from '../data/moves';
import { SPECIES } from '../data/species';
import { effectiveness, type TypeId } from '../data/types';
import { MAX_LEVEL, computeStats, expForLevel, expProgress, type Creature, type Stats } from './creature';

export type Rng = () => number;
export type Side = 'player' | 'enemy';

export type BattleEvent =
  | { t: 'text'; text: string }
  | { t: 'move'; side: Side; moveType: TypeId }
  | { t: 'hit'; side: Side; hpBefore: number; hpAfter: number; max: number; eff: number }
  | { t: 'faint'; side: Side }
  | { t: 'exp'; amount: number; from: number; to: number }
  | { t: 'levelUp'; level: number; gains: Stats; hp: number; max: number; progress: number }
  | { t: 'end'; result: 'win' | 'lose' | 'run' };

export type Action = { kind: 'fight'; moveIndex: number } | { kind: 'run' };

const FALLBACK: MoveData = MOVES.forcejeo;

export interface DamageResult { damage: number; eff: number; stab: boolean }

/** ((2·N/5+2)·Poder·Ataque/Defensa)/50 + 2, × STAB × efectividad × variación 0.85–1. */
export function calcDamage(attacker: Creature, defender: Creature, move: MoveData, rng: Rng): DamageResult {
  const atkType = SPECIES[attacker.speciesId].type;
  const defType = SPECIES[defender.speciesId].type;
  const eff = effectiveness(move.type, defType);
  const stab = move.type === atkType;
  const base = Math.floor((Math.floor((2 * attacker.level) / 5) + 2) * move.power * attacker.stats.atk / defender.stats.def / 50) + 2;
  const variation = 0.85 + rng() * 0.15;
  let damage = Math.floor(base * (stab ? 1.5 : 1) * eff * variation);
  if (eff > 0) damage = Math.max(1, damage);
  return { damage, eff, stab };
}

/** Probabilidad de huida: F = vel_jugador·32 / (vel_enemigo/4 mod 256) + 30·intentos. */
export function escapeOdds(playerSpd: number, enemySpd: number, attempts: number): number {
  const divisor = Math.floor(enemySpd / 4) % 256;
  if (divisor === 0) return 1;
  const f = Math.floor((playerSpd * 32) / divisor) + 30 * attempts;
  return Math.min(1, f / 256);
}

export const gainedExp = (enemy: Creature): number => Math.floor((SPECIES[enemy.speciesId].expYield * enemy.level) / 5);

const nameOf = (c: Creature) => SPECIES[c.speciesId].name.toUpperCase();

export class Battle {
  runAttempts = 0;
  over = false;

  constructor(readonly player: Creature, readonly enemy: Creature, private rng: Rng = Math.random) {}

  playerMoves(): { id: string; pp: number }[] { return this.player.moves; }
  /** Si no queda PP en ningún movimiento, solo se puede usar Forcejeo. */
  mustStruggle(): boolean { return this.player.moves.every((m) => m.pp <= 0); }

  private chooseEnemyMove(): { move: MoveData; slot?: { id: string; pp: number } } {
    const usable = this.enemy.moves.filter((m) => m.pp > 0);
    if (!usable.length) return { move: FALLBACK };
    const slot = usable[Math.floor(this.rng() * usable.length)];
    return { move: MOVES[slot.id], slot };
  }

  resolveTurn(action: Action): BattleEvent[] {
    if (this.over) return [];
    const ev: BattleEvent[] = [];

    if (action.kind === 'run') {
      this.runAttempts++;
      const odds = escapeOdds(this.player.stats.spd, this.enemy.stats.spd, this.runAttempts - 1);
      if (this.rng() < odds) {
        ev.push({ t: 'text', text: '¡Escapaste sin problemas!' }, { t: 'end', result: 'run' });
        this.over = true;
        return ev;
      }
      ev.push({ t: 'text', text: '¡No puedes escapar!' });
      this.attack('enemy', this.chooseEnemyMove(), ev);
      return ev;
    }

    const slot = this.player.moves[action.moveIndex];
    const playerChoice = this.mustStruggle() || !slot ? { move: FALLBACK } : { move: MOVES[slot.id], slot };
    const enemyChoice = this.chooseEnemyMove();

    const spdP = this.player.stats.spd, spdE = this.enemy.stats.spd;
    const playerFirst = spdP === spdE ? this.rng() < 0.5 : spdP > spdE;
    const order: [Side, typeof playerChoice][] = playerFirst
      ? [['player', playerChoice], ['enemy', enemyChoice]]
      : [['enemy', enemyChoice], ['player', playerChoice]];

    for (const [side, choice] of order) {
      if (this.over) break;
      const attacker = side === 'player' ? this.player : this.enemy;
      if (attacker.hp <= 0) continue;
      this.attack(side, choice, ev);
    }
    return ev;
  }

  private attack(side: Side, choice: { move: MoveData; slot?: { id: string; pp: number } }, ev: BattleEvent[]): void {
    const attacker = side === 'player' ? this.player : this.enemy;
    const defender = side === 'player' ? this.enemy : this.player;
    const defSide: Side = side === 'player' ? 'enemy' : 'player';
    const { move, slot } = choice;
    if (slot) slot.pp = Math.max(0, slot.pp - 1);

    const who = side === 'player' ? nameOf(attacker) : `${nameOf(attacker)} salvaje`;
    ev.push({ t: 'text', text: `¡${who} usó ${move.name.toUpperCase()}!` });
    ev.push({ t: 'move', side, moveType: move.type });

    if (this.rng() * 100 >= move.accuracy) {
      ev.push({ t: 'text', text: `¡El ataque de ${nameOf(attacker)} falló!` });
      return;
    }
    const { damage, eff } = calcDamage(attacker, defender, move, this.rng);
    const before = defender.hp;
    defender.hp = Math.max(0, defender.hp - damage);
    ev.push({ t: 'hit', side: defSide, hpBefore: before, hpAfter: defender.hp, max: defender.stats.hp, eff });
    if (eff >= 2) ev.push({ t: 'text', text: '¡Es muy eficaz!' });
    else if (eff > 0 && eff < 1) ev.push({ t: 'text', text: 'No es muy eficaz...' });

    if (defender.hp > 0) return;
    this.over = true;
    ev.push({ t: 'faint', side: defSide });
    if (defSide === 'enemy') {
      ev.push({ t: 'text', text: `¡${nameOf(defender)} salvaje se debilitó!` });
      this.awardExp(ev);
      ev.push({ t: 'end', result: 'win' });
    } else {
      ev.push({ t: 'text', text: `¡${nameOf(defender)} se debilitó!` });
      ev.push({ t: 'text', text: '¡Te has quedado sin criaturas!' });
      ev.push({ t: 'end', result: 'lose' });
    }
  }

  private awardExp(ev: BattleEvent[]): void {
    const p = this.player;
    const amount = gainedExp(this.enemy);
    const from = expProgress(p);
    p.exp += amount;
    const to = Math.min(1, (p.exp - expForLevel(p.level)) / (expForLevel(p.level + 1) - expForLevel(p.level)));
    ev.push({ t: 'text', text: `¡${nameOf(p)} ganó ${amount} puntos de experiencia!` }, { t: 'exp', amount, from, to });
    while (p.level < MAX_LEVEL && p.exp >= expForLevel(p.level + 1)) {
      const old = p.stats;
      p.level++;
      p.stats = computeStats(SPECIES[p.speciesId], p.level);
      p.hp += p.stats.hp - old.hp; // la vida actual sube lo mismo que la máxima
      const gains = { hp: p.stats.hp - old.hp, atk: p.stats.atk - old.atk, def: p.stats.def - old.def, spd: p.stats.spd - old.spd };
      ev.push({ t: 'levelUp', level: p.level, gains, hp: p.hp, max: p.stats.hp, progress: expProgress(p) });
    }
  }
}
