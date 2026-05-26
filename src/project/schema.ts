import type { SynthParams } from '../types';

export interface DrumGrid {
  [channelId: string]: number[];
}

export interface PatternData {
  id: string;
  name: string;
  steps: number;
  drums: DrumGrid;
  piano: number[][];  // per step: MIDI number array
  synth: SynthParams;
}

export interface ProjectData {
  version: 1;
  bpm: number;
  swing: number;
  patterns: PatternData[];
  arrangement: string[];
  currentPatternId: string;
}
