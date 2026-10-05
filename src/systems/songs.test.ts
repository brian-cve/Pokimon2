import { describe, expect, it } from 'vitest';
import { SONGS, SONG_STEPS, noteFreq } from './songs';

describe('canciones', () => {
  it('A4 = 440 Hz y una octava arriba duplica', () => {
    expect(noteFreq('A4')).toBeCloseTo(440, 5);
    expect(noteFreq('A5')).toBeCloseTo(880, 5);
    expect(noteFreq('C4')).toBeCloseTo(261.63, 1);
    expect(noteFreq('F#3')).toBeCloseTo(185.0, 0);
  });
  for (const [id, song] of Object.entries(SONGS)) {
    it(`${id}: todos los canales miden ${SONG_STEPS} pasos`, () => {
      for (const ch of song.channels) expect(ch.steps).toHaveLength(SONG_STEPS);
    });
    it(`${id}: todas las notas son válidas`, () => {
      for (const ch of song.channels) for (const t of ch.steps) {
        if (t === '.') continue;
        if (ch.wave === 'noise') expect(['k', 's', 'h']).toContain(t);
        else expect(noteFreq(t), `${id}: nota ${t}`).not.toBeNull();
      }
    });
  }
});
