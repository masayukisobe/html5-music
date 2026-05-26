import type { SynthParams } from '../types';

export interface DrumGrid {
  [channelId: string]: number[];
}

export interface Track {
  id: string;
  name: string;
  type: 'drum' | 'synth';
  color: string;
  muted?: boolean;
  soloed?: boolean;
  volume?: number;
  synth?: SynthParams;
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  steps: number;
  drums?: DrumGrid;
  piano?: number[][];
  pianoDurs?: Record<string, number>;
}

export interface ProjectData {
  version: 2;
  bpm: number;
  swing: number;
  tracks: Track[];
  clips: Clip[];
  activeClipIds: Record<string, string>;
  selectedTrackId: string;
}
