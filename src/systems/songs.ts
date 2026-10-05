// Canciones chiptune como datos: cada canal es una lista de pasos (corcheas) de 8 por compás.
// Notas: "C4", "F#3", "Bb2"; "." = silencio. En el canal de ruido: k = bombo, s = caja, h = hi-hat.
export type Wave = 'pulse12' | 'pulse25' | 'pulse50' | 'triangle' | 'noise';
export interface Channel { wave: Wave; vol: number; steps: string[] }
export interface Song { bpm: number; channels: Channel[] }
export type SongId = 'overworld' | 'battle' | 'title';

const bars = (...b: string[]): string[] => b.join(' ').split(/\s+/);

export const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frecuencia de una nota (A4 = 440 Hz), o null si es silencio / ruido. */
export function noteFreq(note: string): number | null {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) return null;
  const midi = 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// ---- Overworld: Do mayor, alegre, 124 bpm (C Am F G ×2) ----
const overworld: Song = {
  bpm: 124,
  channels: [
    { wave: 'pulse25', vol: 0.5, steps: bars(
      'E5 . G5 . A5 G5 E5 .', 'C5 . D5 E5 G5 . E5 .', 'A5 . A5 G5 F5 . E5 D5', 'D5 . G5 . B5 . G5 .',
      'C6 . B5 G5 E5 . G5 .', 'A5 . G5 E5 C5 . E5 .', 'F5 . A5 . C6 A5 F5 .', 'G5 . F5 E5 D5 . . .') },
    { wave: 'pulse12', vol: 0.22, steps: bars(
      'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'F3 A3 C4 A3 F3 A3 C4 A3', 'G3 B3 D4 B3 G3 B3 D4 B3',
      'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'F3 A3 C4 A3 F3 A3 C4 A3', 'G3 B3 D4 B3 G3 B3 D4 B3') },
    { wave: 'triangle', vol: 0.6, steps: bars(
      'C3 . C3 . G2 . C3 .', 'A2 . A2 . E2 . A2 .', 'F2 . F2 . C3 . F2 .', 'G2 . G2 . D3 . G2 .',
      'C3 . C3 . G2 . C3 .', 'A2 . A2 . E2 . A2 .', 'F2 . F2 . C3 . F2 .', 'G2 . G2 . D3 . G2 .') },
    { wave: 'noise', vol: 0.12, steps: bars(...Array<string>(8).fill('. . h . . . h .')) },
  ],
};

// ---- Combate: La menor, más rápido y marcado, 156 bpm (Am F G Am Am F G E) ----
const battle: Song = {
  bpm: 156,
  channels: [
    { wave: 'pulse25', vol: 0.5, steps: bars(
      'A5 . . A5 C6 . B5 A5', 'A5 . . F5 A5 . G5 F5', 'G5 . . G5 B5 . A5 G5', 'E5 . A5 . C6 . E6 .',
      'A5 . . A5 C6 . B5 A5', 'C6 . . A5 F5 . A5 C6', 'B5 . . G5 D5 . G5 B5', 'G#5 . B5 . E6 . . .') },
    { wave: 'pulse12', vol: 0.22, steps: bars(
      'A4 C5 E5 C5 A4 C5 E5 C5', 'F4 A4 C5 A4 F4 A4 C5 A4', 'G4 B4 D5 B4 G4 B4 D5 B4', 'A4 C5 E5 C5 A4 C5 E5 C5',
      'A4 C5 E5 C5 A4 C5 E5 C5', 'F4 A4 C5 A4 F4 A4 C5 A4', 'G4 B4 D5 B4 G4 B4 D5 B4', 'E4 G#4 B4 G#4 E4 G#4 B4 G#4') },
    { wave: 'triangle', vol: 0.65, steps: bars(
      'A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2', 'A2 A2 A3 A2 A2 A2 A3 A2',
      'A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 E3 E2') },
    { wave: 'noise', vol: 0.3, steps: bars(...Array<string>(8).fill('k . h . s . h k')) },
  ],
};

// ---- Título: Re menor, épica y marcada, 138 bpm (Dm Bb C A ×2), hermana de la música de combate ----
const title: Song = {
  bpm: 138,
  channels: [
    { wave: 'pulse25', vol: 0.5, steps: bars(
      'D5 . F5 A5 D6 . C6 A5', 'Bb5 . A5 F5 D5 . F5 A5', 'G5 . C6 E6 G6 . E6 C6', 'A5 . C#6 E6 A6 . E6 C#6',
      'D6 . C6 A5 F5 . A5 D6', 'D6 . C6 Bb5 F5 . Bb5 D6', 'E6 . D6 C6 G5 . C6 E6', 'C#6 . E6 . A5 . . .') },
    { wave: 'pulse12', vol: 0.22, steps: bars(
      'D4 F4 A4 F4 D4 F4 A4 F4', 'Bb3 D4 F4 D4 Bb3 D4 F4 D4', 'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C#4 E4 C#4 A3 C#4 E4 C#4',
      'D4 F4 A4 F4 D4 F4 A4 F4', 'Bb3 D4 F4 D4 Bb3 D4 F4 D4', 'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C#4 E4 C#4 A3 C#4 E4 C#4') },
    { wave: 'triangle', vol: 0.65, steps: bars(
      'D2 D2 D3 D2 D2 D2 D3 D2', 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1', 'C2 C2 C3 C2 C2 C2 C3 C2', 'A1 A1 A2 A1 A1 A1 A2 A1',
      'D2 D2 D3 D2 D2 D2 D3 D2', 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1', 'C2 C2 C3 C2 C2 C2 C3 C2', 'A1 A1 A2 A1 A1 A1 A2 A2') },
    { wave: 'noise', vol: 0.26, steps: bars(...Array<string>(7).fill('k . h . s . h .'), 'k . h . s s s k') },
  ],
};

export const SONGS: Record<SongId, Song> = { overworld, battle, title };
export const SONG_STEPS = 64;
