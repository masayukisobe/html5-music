import { CHANNELS, drumPat, pianoNotes, seqState } from './state';

type DrumPresetDef = Partial<Record<string, number[]>>;

const DRUM_PRESETS: Record<string, DrumPresetDef> = {
  basic: {
    kick:    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat_c: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
  hiphop: {
    kick:    [1,0,0,1, 0,0,0,0, 1,0,0,0, 0,1,0,0],
    snare:   [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0],
    hihat_c: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    hihat_o: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
    clap:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  },
  techno: {
    kick:    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare:   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat_c: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    clap:    [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0],
    bass:    [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,1],
  },
  reggae: {
    kick:    [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    snare:   [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    hihat_c: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1],
    hihat_o: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    bass:    [1,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
  },
};

export function applyDrumPreset(name: string): void {
  CHANNELS.forEach(ch => drumPat[ch.id].fill(0));
  const p = DRUM_PRESETS[name] ?? {};
  Object.entries(p).forEach(([id, arr]) => {
    if (!arr) return;
    arr.forEach((v, i) => { if (i < seqState.steps) drumPat[id][i] = v; });
  });
}

export function randomizeDrums(): void {
  CHANNELS.forEach(ch => {
    for (let i = 0; i < seqState.steps; i++) {
      drumPat[ch.id][i] = Math.random() < 0.22 ? 1 : 0;
    }
  });
}

const PIANO_PRESETS: Record<string, number[][]> = {
  melody1:  [[60],[62],[64],[65],[67],[65],[64],[62],[60],[60],[62],[64],[62],[60],[],[60]],
  arpeggio: [[60],[64],[67],[72],[60],[64],[67],[72],[62],[65],[69],[74],[62],[65],[69],[74]],
  blues:    [[60],[],[63],[],[65],[66],[65],[63],[60],[],[63],[],[67],[],[65],[63]],
};

export function applyPianoPreset(name: string): void {
  pianoNotes.forEach(s => s.clear());
  const p = PIANO_PRESETS[name] ?? [];
  p.forEach((midis, step) => {
    if (step < seqState.steps) midis.forEach(m => pianoNotes[step].add(m));
  });
}
