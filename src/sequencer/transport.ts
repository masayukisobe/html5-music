import { seqState, drumPat, pianoNotes, synthParams, CHANNELS } from './state';
import { playDrum } from '../audio/drumSynth';
import { playNote } from '../audio/pianoSynth';
import { getCtx } from '../audio/context';

const LOOKAHEAD_MS = 25;
const SCHEDULE_SEC = 0.12;

type StepCallback = (step: number) => void;
const onStepCallbacks: StepCallback[] = [];
export function onStep(cb: StepCallback): void { onStepCallbacks.push(cb); }

function stepDuration(step: number): number {
  const base = 60 / seqState.bpm / 4;
  return seqState.swing > 0 && step % 2 === 1 ? base * (1 + seqState.swing / 100) : base;
}

function schedule(): void {
  const ctx = getCtx();
  while (seqState.nextNoteTime < ctx.currentTime + SCHEDULE_SEC) {
    const step = (seqState.currentStep + 1) % seqState.steps;
    const t = seqState.nextNoteTime;
    const dur = stepDuration(step);

    CHANNELS.forEach(ch => { if (drumPat[ch.id][step]) playDrum(ch.id, t); });
    pianoNotes[step].forEach(midi => playNote(midi, t, dur * 0.85, synthParams));

    const delay = (t - ctx.currentTime) * 1000;
    setTimeout(() => onStepCallbacks.forEach(cb => cb(step)), Math.max(0, delay));

    seqState.currentStep = step;
    seqState.nextNoteTime += dur;
  }
}

export function play(): void {
  if (seqState.isPlaying) return;
  const ctx = getCtx();
  seqState.isPlaying = true;
  seqState.currentStep = -1;
  seqState.nextNoteTime = ctx.currentTime + 0.05;
  seqState.timerId = setInterval(schedule, LOOKAHEAD_MS);
}

export function stop(): void {
  seqState.isPlaying = false;
  if (seqState.timerId !== null) { clearInterval(seqState.timerId); seqState.timerId = null; }
  seqState.currentStep = -1;
  onStepCallbacks.forEach(cb => cb(-1));
}

export function setBpm(v: number): void { seqState.bpm = v; }
export function setSwing(v: number): void { seqState.swing = v; }
