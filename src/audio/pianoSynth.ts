import { getCtx, getMaster } from './context';
import { midiToHz } from '../notes';
import type { SynthParams } from '../types';

let sampleBuffer: AudioBuffer | null = null;

export function setSampleBuffer(buf: AudioBuffer): void { sampleBuffer = buf; }
export function getSampleBuffer(): AudioBuffer | null { return sampleBuffer; }

export function playNote(midi: number, startTime: number, duration: number, params: SynthParams, gainMult = 1): void {
  if (gainMult === 0) return;
  const ctx = getCtx();
  const freq = midiToHz(midi + params.octShift * 12);
  const m = getMaster();
  const peak = 0.8 * gainMult;
  const sus = params.sustain * peak;

  if (params.useSample && sampleBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = sampleBuffer;
    src.playbackRate.value = freq / 261.63;
    src.detune.value = params.detune;
    const g = ctx.createGain();
    src.connect(g); g.connect(m);
    const a = params.attack / 1000, r = params.release / 1000;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + a);
    g.gain.linearRampToValueAtTime(0, startTime + duration + r);
    src.start(startTime); src.stop(startTime + duration + r + 0.05);
    return;
  }

  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.connect(g); g.connect(m);
  osc.type = params.wave; osc.frequency.value = freq; osc.detune.value = params.detune;
  const a = params.attack / 1000, d = params.decay / 1000, r = params.release / 1000;
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(peak, startTime + a);
  g.gain.linearRampToValueAtTime(sus, startTime + a + d);
  g.gain.setValueAtTime(sus, startTime + duration);
  g.gain.linearRampToValueAtTime(0, startTime + duration + r);
  osc.start(startTime); osc.stop(startTime + duration + r + 0.05);
}
