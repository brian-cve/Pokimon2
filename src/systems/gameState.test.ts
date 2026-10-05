import { describe, expect, it } from 'vitest';
import { BALL_EMPTY, BALL_FULL, ruby } from '../../art/hud';
import { game, newGame, PARTY_MAX } from './gameState';

describe('estado de partida', () => {
  it('newGame deja un equipo de una criatura y marca la partida en curso', () => {
    game.inGame = false;
    newGame();
    expect(game.inGame).toBe(true);
    expect(game.party).toHaveLength(1);
    expect(game.party[0]).toBe(game.player);
    expect(game.party.length).toBeLessThanOrEqual(PARTY_MAX);
  });
});

describe('arte del HUD', () => {
  it('las pokéballs miden 9x9 y el rubí tiene contorno', () => {
    for (const s of [BALL_FULL, BALL_EMPTY]) { expect(s).toHaveLength(9); s.forEach((r) => expect(r).toHaveLength(9)); }
    const r = ruby();
    expect(r.join('')).toContain('K');
    expect(r.join('')).toContain('R');
  });
});
