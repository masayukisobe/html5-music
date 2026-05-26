import { noteList, pianoNotes, seqState, synthParams } from '../sequencer/state';
import { playNote } from '../audio/pianoSynth';
import { getCtx } from '../audio/context';
import { scheduleAutoSave } from '../project/io';

const KEY_W = 58, CELL_W = 36, CELL_H = 20, NUM_H = 18;
let canvas: HTMLCanvasElement | null = null;
let hoverStep = -1, hoverNote = -1;
let dragOn: boolean | null = null;

export function initPianoRoll(canvasEl: HTMLCanvasElement): void {
  canvas = canvasEl;
  resize();
  draw();
  bindEvents();
}

export function resize(): void {
  if (!canvas) return;
  canvas.width  = KEY_W + CELL_W * seqState.steps;
  canvas.height = NUM_H + CELL_H * noteList.length;
}

export function draw(): void {
  if (!canvas) return;
  const cx = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  cx.clearRect(0, 0, W, H);

  // Header
  cx.fillStyle = '#161b22'; cx.fillRect(0, 0, W, NUM_H);
  cx.fillStyle = '#21262d'; cx.fillRect(0, NUM_H - 1, W, 1);
  for (let s = 0; s < seqState.steps; s++) {
    const x = KEY_W + s * CELL_W;
    cx.fillStyle = s % 4 === 0 ? '#58a6ff' : '#484f58';
    cx.font = 'bold 9px Courier New'; cx.textAlign = 'center';
    cx.fillText(String(s + 1), x + CELL_W / 2, NUM_H - 5);
    if (s % 4 === 0) { cx.fillStyle = '#2a3040'; cx.fillRect(x, 0, 1, NUM_H); }
  }
  cx.fillStyle = '#30363d'; cx.fillRect(KEY_W - 1, 0, 1, NUM_H);

  // Rows
  noteList.forEach((note, ni) => {
    const y = NUM_H + ni * CELL_H;
    cx.fillStyle = note.isBlack ? '#111827' : '#1e2535';
    cx.fillRect(0, y, KEY_W - 1, CELL_H);
    cx.fillStyle = note.isBlack ? '#4a7fa5' : '#6e7f96';
    cx.font = '9px Courier New'; cx.textAlign = 'right';
    cx.fillText(note.name, KEY_W - 5, y + CELL_H - 5);
    if (note.name.startsWith('C') && !note.name.includes('#')) {
      cx.fillStyle = '#2a3a50'; cx.fillRect(KEY_W, y, W - KEY_W, 1);
    }
    for (let s = 0; s < seqState.steps; s++) {
      const x = KEY_W + s * CELL_W;
      const isOn = pianoNotes[s].has(note.midi);
      const isPH = s === seqState.currentStep;
      const isHov = s === hoverStep && ni === hoverNote;
      let bg: string;
      if (isOn) bg = '#1f6feb';
      else if (isPH) bg = note.isBlack ? '#1c2535' : '#1e2d45';
      else if (isHov) bg = '#1a2e4a';
      else bg = note.isBlack ? '#0f1520' : '#161f30';
      cx.fillStyle = bg;
      cx.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2);
      if (isOn) { cx.fillStyle = 'rgba(120,180,255,0.25)'; cx.fillRect(x + 1, y + 1, CELL_W - 2, 4); }
      if (s % 4 === 0) { cx.fillStyle = '#2a3a50'; cx.fillRect(x, y, 1, CELL_H); }
    }
    cx.fillStyle = '#1a2030'; cx.fillRect(KEY_W, y + CELL_H - 1, W - KEY_W, 1);
  });
  cx.fillStyle = '#30363d'; cx.fillRect(KEY_W - 1, NUM_H, 1, H - NUM_H);
  if (seqState.currentStep >= 0) {
    const x = KEY_W + seqState.currentStep * CELL_W;
    cx.fillStyle = 'rgba(255,255,255,0.06)'; cx.fillRect(x, NUM_H, CELL_W, H - NUM_H);
  }
}

function coords(e: MouseEvent): { mx: number; my: number; s: number; ni: number } {
  const r = canvas!.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  return { mx, my, s: Math.floor((mx - KEY_W) / CELL_W), ni: Math.floor((my - NUM_H) / CELL_H) };
}

function interact(e: MouseEvent, isDown: boolean): void {
  const { mx, my, s, ni } = coords(e);
  if (mx < KEY_W && my >= NUM_H) {
    if (isDown && ni >= 0 && ni < noteList.length) {
      const ctx = getCtx(); playNote(noteList[ni].midi, ctx.currentTime, 0.35, synthParams);
    }
    return;
  }
  if (s < 0 || s >= seqState.steps || ni < 0 || ni >= noteList.length) return;
  const midi = noteList[ni].midi;
  if (isDown) dragOn = !pianoNotes[s].has(midi);
  if (dragOn === null) return;
  if (dragOn) {
    if (!pianoNotes[s].has(midi)) {
      pianoNotes[s].add(midi);
      if (isDown) { const ctx = getCtx(); playNote(midi, ctx.currentTime, 0.2, synthParams); }
    }
  } else { pianoNotes[s].delete(midi); }
  scheduleAutoSave();
  draw();
}

function bindEvents(): void {
  if (!canvas) return;
  canvas.addEventListener('mousedown', e => { dragOn = null; interact(e, true); });
  canvas.addEventListener('mousemove', e => {
    const { s, ni } = coords(e);
    hoverStep = s; hoverNote = ni; draw();
    if (e.buttons === 1) interact(e, false);
  });
  canvas.addEventListener('mouseleave', () => { hoverStep = -1; hoverNote = -1; draw(); });
  document.addEventListener('mouseup', () => { dragOn = null; });
}
