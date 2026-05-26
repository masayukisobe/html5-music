import { seqState, CHANNELS } from './state';
import { playDrum } from '../audio/drumSynth';
import { playNote } from '../audio/pianoSynth';
import { getCtx } from '../audio/context';
import { getPlaybackData } from '../project/tracks';

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

    const gainMult = (pd: { volume: number }) => pd.volume / 100;
    getPlaybackData().forEach(pd => {
      const s = step % pd.steps;
      const gm = gainMult(pd);
      if (pd.type === 'drum' && pd.drumGrid) {
        CHANNELS.forEach(ch => { if (pd.drumGrid![ch.id]?.[s]) playDrum(ch.id, t, gm); });
      } else if (pd.type === 'synth' && pd.pianoNotes && pd.synth) {
        pd.pianoNotes[s]?.forEach(midi => {
          const noteDur = pd.pianoNoteDurs?.get(`${s}_${midi}`) ?? 1;
          playNote(midi, t, noteDur * dur * 0.85, pd.synth!, gm);
        });
      }
    });

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
