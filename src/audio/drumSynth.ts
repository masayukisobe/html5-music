import { getCtx, getMaster } from './context';

const drumSamples: Record<string, AudioBuffer> = {};

function noise(ctx: AudioContext, dur: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function trackOut(gainMult: number): AudioNode {
  if (gainMult === 1) return getMaster();
  const ctx = getCtx();
  const g = ctx.createGain();
  g.gain.value = gainMult;
  g.connect(getMaster());
  return g;
}

function playKick(t: number, m: AudioNode): void {
  const ctx = getCtx();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(m);
  o.type = 'sine';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
  g.gain.setValueAtTime(1.8, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.start(t); o.stop(t + 0.52);
}

function playSnare(t: number, m: AudioNode): void {
  const ctx = getCtx();
  const n = noise(ctx, 0.25); const ng = ctx.createGain(); const nf = ctx.createBiquadFilter();
  nf.type = 'highpass'; nf.frequency.value = 1000;
  n.connect(nf); nf.connect(ng); ng.connect(m);
  ng.gain.setValueAtTime(1.0, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  n.start(t); n.stop(t + 0.25);
  const o = ctx.createOscillator(); const og = ctx.createGain();
  o.connect(og); og.connect(m);
  o.type = 'triangle'; o.frequency.value = 190;
  og.gain.setValueAtTime(0.8, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.start(t); o.stop(t + 0.15);
}

function playHihatC(t: number, m: AudioNode): void {
  const ctx = getCtx();
  const n = noise(ctx, 0.1); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 8000;
  n.connect(f); f.connect(g); g.connect(m);
  g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  n.start(t); n.stop(t + 0.1);
}

function playHihatO(t: number, m: AudioNode): void {
  const ctx = getCtx();
  const n = noise(ctx, 0.4); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 7000;
  n.connect(f); f.connect(g); g.connect(m);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  n.start(t); n.stop(t + 0.4);
}

function playClap(t: number, m: AudioNode): void {
  const ctx = getCtx();
  [0, 0.01, 0.02].forEach(offset => {
    const n = noise(ctx, 0.15); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.4;
    n.connect(f); f.connect(g); g.connect(m);
    const tt = t + offset;
    g.gain.setValueAtTime(0.7, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.12);
    n.start(tt); n.stop(tt + 0.15);
  });
}

function playTom(t: number, m: AudioNode, hi: boolean): void {
  const ctx = getCtx();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(m); o.type = 'sine';
  const freq = hi ? 260 : 130; const dur = hi ? 0.35 : 0.45;
  o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(0.01, t + dur);
  g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}

function playBass(t: number, m: AudioNode): void {
  const ctx = getCtx();
  const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 300;
  o.connect(f); f.connect(g); g.connect(m);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
  g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.start(t); o.stop(t + 0.35);
}

export function playDrum(id: string, t: number, gainMult = 1): void {
  if (gainMult === 0) return;
  const m = trackOut(gainMult);
  if (drumSamples[id]) {
    const ctx = getCtx(); const src = ctx.createBufferSource();
    src.buffer = drumSamples[id]; src.connect(m); src.start(t);
    return;
  }
  switch (id) {
    case 'kick':    playKick(t, m); break;
    case 'snare':   playSnare(t, m); break;
    case 'hihat_c': playHihatC(t, m); break;
    case 'hihat_o': playHihatO(t, m); break;
    case 'clap':    playClap(t, m); break;
    case 'tom_h':   playTom(t, m, true); break;
    case 'tom_l':   playTom(t, m, false); break;
    case 'bass':    playBass(t, m); break;
  }
}

export async function loadDrumSample(id: string, file: File): Promise<void> {
  const ctx = getCtx();
  drumSamples[id] = await ctx.decodeAudioData(await file.arrayBuffer());
}

export function hasDrumSample(id: string): boolean {
  return !!drumSamples[id];
}
