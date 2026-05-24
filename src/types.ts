export interface Channel {
  id: string;
  label: string;
  color: string;
}

export interface Note {
  name: string;
  midi: number;
  isBlack: boolean;
}

export type OscType = OscillatorType;

export interface SynthParams {
  wave: OscType;
  attack: number;   // ms
  decay: number;    // ms
  sustain: number;  // 0-1
  release: number;  // ms
  detune: number;   // cents
  octShift: number;
  useSample: boolean;
}
