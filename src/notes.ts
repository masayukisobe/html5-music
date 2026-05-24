import type { Note } from './types';

export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
export const BLACK_IDX = new Set([1, 3, 6, 8, 10]);

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function buildNoteList(octaves: number): Note[] {
  const list: Note[] = [];
  const topOct = 5;
  for (let o = topOct; o > topOct - octaves; o--) {
    for (let n = 11; n >= 0; n--) {
      list.push({ name: NOTE_NAMES[n] + o, midi: o * 12 + n, isBlack: BLACK_IDX.has(n) });
    }
  }
  return list;
}
