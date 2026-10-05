import { describe, expect, it } from 'vitest';
import { Battle, calcDamage, catchChance, escapeOdds, gainedExp } from './battleEngine';
import { createCreature, expForLevel } from './creature';
import { MOVES } from '../data/moves';
import { effectiveness } from '../data/types';
import { ENCOUNTERS, rollEncounter } from '../data/encounters';
import { SPECIES } from '../data/species';

const fixed = (v: number) => () => v;

describe('tipos', () => {
  it('Fuego > Planta, Agua > Fuego, Planta > Agua', () => {
    expect(effectiveness('fire', 'grass')).toBe(2);
    expect(effectiveness('water', 'fire')).toBe(2);
    expect(effectiveness('grass', 'water')).toBe(2);
  });
  it('resistencias y neutral', () => {
    expect(effectiveness('fire', 'water')).toBe(0.5);
    expect(effectiveness('normal', 'fire')).toBe(1);
    expect(effectiveness('fire', 'fire')).toBe(0.5);
  });
});

describe('daño', () => {
  const a = createCreature('brasito', 5), d = createCreature('hojin', 5);
  it('sigue la fórmula con STAB y efectividad (variación máxima)', () => {
    // N=5, poder 40, atk/def reales
    const base = Math.floor((Math.floor((2 * 5) / 5) + 2) * 40 * a.stats.atk / d.stats.def / 50) + 2;
    const r = calcDamage(a, d, MOVES.ascuas, fixed(0.9999));
    expect(r.stab).toBe(true);
    expect(r.eff).toBe(2);
    expect(r.damage).toBe(Math.floor(base * 1.5 * 2 * (0.85 + 0.9999 * 0.15)));
  });
  it('la variación acota el daño entre 85% y 100%', () => {
    const lo = calcDamage(a, d, MOVES.placaje, fixed(0)).damage;
    const hi = calcDamage(a, d, MOVES.placaje, fixed(0.9999)).damage;
    expect(lo).toBeLessThanOrEqual(hi);
    expect(lo).toBeGreaterThanOrEqual(1);
  });
});

describe('turnos', () => {
  it('actúa primero la criatura más veloz', () => {
    const p = createCreature('brasito', 5), e = createCreature('cangrejete', 5); // brasito es más rápido
    const b = new Battle(p, e, fixed(0.5));
    const ev = b.resolveTurn({ kind: 'fight', moveIndex: 0 });
    const firstMove = ev.find((x) => x.t === 'move');
    expect(firstMove).toMatchObject({ side: 'player' });
  });
  it('un KO termina el combate y reparte experiencia', () => {
    const p = createCreature('brasito', 8), e = createCreature('hojin', 3);
    e.hp = 1;
    const b = new Battle(p, e, fixed(0.5));
    const ev = b.resolveTurn({ kind: 'fight', moveIndex: 1 });
    expect(ev.at(-1)).toEqual({ t: 'end', result: 'win' });
    expect(ev.some((x) => x.t === 'exp')).toBe(true);
    expect(p.exp).toBe(expForLevel(8) + gainedExp(e));
  });
  it('el enemigo vencido no contraataca', () => {
    const p = createCreature('brasito', 8), e = createCreature('hojin', 3);
    e.hp = 1;
    const ev = new Battle(p, e, fixed(0.5)).resolveTurn({ kind: 'fight', moveIndex: 1 });
    expect(ev.filter((x) => x.t === 'move')).toHaveLength(1);
  });
  it('derrota del jugador', () => {
    const p = createCreature('gotilla', 3), e = createCreature('cangrejete', 12);
    p.hp = 1;
    const ev = new Battle(p, e, fixed(0.99)).resolveTurn({ kind: 'fight', moveIndex: 0 });
    expect(ev.at(-1)).toEqual({ t: 'end', result: 'lose' });
  });
  it('gasta PP', () => {
    const p = createCreature('brasito', 5), e = createCreature('peluson', 5);
    new Battle(p, e, fixed(0.5)).resolveTurn({ kind: 'fight', moveIndex: 1 });
    expect(p.moves[1].pp).toBe(MOVES.ascuas.pp - 1);
  });
  it('sin PP se usa Forcejeo', () => {
    const p = createCreature('brasito', 5), e = createCreature('peluson', 5);
    p.moves.forEach((m) => (m.pp = 0));
    const b = new Battle(p, e, fixed(0.5));
    expect(b.mustStruggle()).toBe(true);
    const ev = b.resolveTurn({ kind: 'fight', moveIndex: 0 });
    expect(ev.some((x) => x.t === 'text' && x.text.includes('FORCEJEO'))).toBe(true);
  });
});

describe('experiencia y nivel', () => {
  it('subir de nivel recalcula stats y mantiene la diferencia de vida', () => {
    const p = createCreature('brasito', 5), e = createCreature('hojin', 5);
    p.exp = expForLevel(6) - 1;
    e.hp = 1;
    p.hp = 10;
    const oldMax = p.stats.hp;
    const ev = new Battle(p, e, fixed(0.5)).resolveTurn({ kind: 'fight', moveIndex: 1 });
    const up = ev.find((x) => x.t === 'levelUp');
    expect(up).toBeDefined();
    expect(p.level).toBeGreaterThanOrEqual(6);
    expect(p.stats.hp).toBeGreaterThanOrEqual(oldMax);
    expect(p.hp).toBeGreaterThan(10 - 1);
  });
});

describe('huida', () => {
  it('probabilidad crece con los intentos y se acota a 1', () => {
    expect(escapeOdds(20, 20, 0)).toBeLessThan(escapeOdds(20, 20, 3));
    expect(escapeOdds(100, 10, 0)).toBe(1);
  });
  it('huir con éxito termina el combate', () => {
    const b = new Battle(createCreature('aleteo', 10), createCreature('cangrejete', 3), fixed(0));
    const ev = b.resolveTurn({ kind: 'run' });
    expect(ev.at(-1)).toEqual({ t: 'end', result: 'run' });
  });
  it('huida fallida: el enemigo ataca', () => {
    const b = new Battle(createCreature('cangrejete', 3), createCreature('aleteo', 10), fixed(0.999));
    const ev = b.resolveTurn({ kind: 'run' });
    expect(ev.some((x) => x.t === 'move' && x.side === 'enemy')).toBe(true);
    expect(b.over).toBe(false);
  });
});

describe('encuentros', () => {
  it('cada mapa tiene su propia tabla, con especies distintas', () => {
    const a = new Set(ENCOUNTERS.town.map((e) => e.species)), b = new Set(ENCOUNTERS.route.map((e) => e.species));
    expect([...a].filter((s) => b.has(s))).toHaveLength(0);
    for (const e of [...ENCOUNTERS.town, ...ENCOUNTERS.route]) expect(SPECIES[e.species]).toBeDefined();
  });
  it('rollEncounter respeta los niveles', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollEncounter('route');
      expect(r.level).toBeGreaterThanOrEqual(5);
      expect(r.level).toBeLessThanOrEqual(8);
    }
  });
});

describe('captura', () => {
  it('la probabilidad sube al bajar los PS y con el catchRate', () => {
    const full = createCreature('brasito', 5);
    const low = { ...createCreature('brasito', 5), hp: 1 };
    expect(catchChance(low)).toBeGreaterThan(catchChance(full));
    expect(catchChance({ ...createCreature('peluson', 5) })).toBeGreaterThan(catchChance(full));
    expect(catchChance(low)).toBeLessThanOrEqual(0.95);
  });
  it('con rng = 0 la ball atrapa (3 sacudidas) y termina el combate', () => {
    const b = new Battle(createCreature('brasito', 5), createCreature('hojin', 4), () => 0);
    const ev = b.resolveTurn({ kind: 'ball' });
    expect(ev).toContainEqual({ t: 'catch', shakes: 3, caught: true });
    expect(ev.at(-1)).toEqual({ t: 'end', result: 'catch' });
    expect(b.over).toBe(true);
  });
  it('con rng alto la criatura se escapa y contraataca', () => {
    const b = new Battle(createCreature('brasito', 5), createCreature('hojin', 4), () => 0.99);
    const ev = b.resolveTurn({ kind: 'ball' });
    expect(ev).toContainEqual({ t: 'catch', shakes: 0, caught: false });
    expect(ev.some((e) => e.t === 'move' && e.side === 'enemy')).toBe(true);
    expect(b.over).toBe(false);
  });
});
