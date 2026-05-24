import type { Channel, SynthParams } from '../types';
import type { Note } from '../types';
import { buildNoteList } from '../notes';

export const CHANNELS: Channel[] = [
  { id: 'kick',    label: 'KICK',    color: '#388bfd' },
  { id: 'snare',   label: 'SNARE',   color: '#3fb950' },
  { id: 'hihat_c', label: 'HIHAT C', color: '#e3b341' },
  { id: 'hihat_o', label: 'HIHAT O', color: '#ffd700' },
  { id: 'clap',    label: 'CLAP',    color: '#ff7b72' },
  { id: 'tom_h',   label: 'TOM H',   color: '#bc8cff' },
  { id: 'tom_l',   label: 'TOM L',   color: '#9d5aff' },
  { id: 'bass',    label: 'BASS',    color: '#ff9f43' },
];

export interface SequencerState {
  bpm: number;
  steps: number;
  swing: number;
  isPlaying: boolean;
  currentStep: number;
  nextNoteTime: number;
  timerId: ReturnType<typeof setInterval> | null;
}

export const seqState: SequencerState = {
  bpm: 120,
  steps: 16,
  swing: 0,
  isPlaying: false,
  currentStep: -1,
  nextNoteTime: 0,
  timerId: null,
};

// drumPat[channelId] = Uint8Array of length steps
export const drumPat: Record<string, Uint8Array> = {};
CHANNELS.forEach(ch => { drumPat[ch.id] = new Uint8Array(seqState.steps); });

export let pianoNotes: Set<number>[] = Array.from({ length: seqState.steps }, () => new Set<number>());
export function setPianoNotes(p: Set<number>[]): void { pianoNotes = p; }

export let noteList: Note[] = buildNoteList(2);
export function setNoteList(nl: Note[]): void { noteList = nl; }

export const synthParams: SynthParams = {
  wave: 'sawtooth',
  attack: 5, decay: 80, sustain: 0.6, release: 200,
  detune: 0, octShift: 0, useSample: false,
};

export function resizeDrumPat(newSteps: number): void {
  CHANNELS.forEach(ch => {
    const old = drumPat[ch.id];
    const next = new Uint8Array(newSteps);
    next.set(old.slice(0, newSteps));
    drumPat[ch.id] = next;
  });
}

export function resizePianoNotes(newSteps: number): void {
  const old = pianoNotes;
  if (newSteps > old.length) {
    pianoNotes = [...old, ...Array.from({ length: newSteps - old.length }, () => new Set<number>())];
  } else {
    pianoNotes = old.slice(0, newSteps);
  }
}
