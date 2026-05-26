import { noteList, pianoNotes, seqState, synthParams, getNoteDur, setNoteDur, deleteNoteDur } from '../sequencer/state';
import { playNote } from '../audio/pianoSynth';
import { getCtx } from '../audio/context';
import { scheduleAutoSave } from '../project/io';

const KEY_W = 58, CELL_W = 36, CELL_H = 20, NUM_H = 18;
const RESIZE_PX = 8;
const MIN_DRAG_PX = 4;

let canvas: HTMLCanvasElement | null = null;
let hoverStep = -1, hoverNote = -1;

// ── Selection ──────────────────────────────────────────────────────────────
const selectedKeys = new Set<string>();
const nk = (s: number, midi: number) => `${s}_${midi}`;

// ── Drag state ─────────────────────────────────────────────────────────────
type DragMode = 'resize' | 'move' | 'select' | null;
let dragMode: DragMode = null;

// pending: mousedown on empty, decide draw vs select rect
let pending: { s: number; ni: number; mx: number; my: number } | null = null;

// resize
let resizeNote: { step: number; midi: number } | null = null;
let resizeStartX = 0, resizeOrigDur = 1;

// move
interface Origin { step: number; ni: number; dur: number; }
let moveOrigins: Origin[] = [];
let movePlaced = new Set<string>();   // keys of notes currently placed by move op
let moveAnchor = { s: 0, ni: 0 };
let lastDelta = { ds: 0, dni: 0 };

// selection rect (pixel coords)
let selStart: { mx: number; my: number } | null = null;
let selCurrent: { mx: number; my: number } | null = null;

let keysRegistered = false;

// ── Init ───────────────────────────────────────────────────────────────────
export function initPianoRoll(el: HTMLCanvasElement): void {
  canvas = el;
  resize(); draw(); bindEvents();
  if (!keysRegistered) {
    keysRegistered = true;
    document.addEventListener('keydown', e => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedKeys.size === 0) return;
        selectedKeys.forEach(k => {
          const [ss, mm] = k.split('_').map(Number);
          pianoNotes[ss]?.delete(mm);
          deleteNoteDur(ss, mm);
        });
        selectedKeys.clear();
        scheduleAutoSave(); draw();
      }
      if (e.key === 'Escape') { selectedKeys.clear(); draw(); }
    });
  }
}

export function resize(): void {
  if (!canvas) return;
  canvas.width  = KEY_W + CELL_W * seqState.steps;
  canvas.height = NUM_H + CELL_H * noteList.length;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function niOf(midi: number): number { return noteList.findIndex(n => n.midi === midi); }

function resizeHandleAt(mx: number, my: number): { step: number; midi: number } | null {
  if (my < NUM_H) return null;
  const ni = Math.floor((my - NUM_H) / CELL_H);
  if (ni < 0 || ni >= noteList.length) return null;
  const midi = noteList[ni].midi;
  for (let s = 0; s < seqState.steps; s++) {
    if (!pianoNotes[s]?.has(midi)) continue;
    const endX = KEY_W + (s + getNoteDur(s, midi)) * CELL_W;
    if (mx >= endX - RESIZE_PX && mx < endX + 2) return { step: s, midi };
  }
  return null;
}

function noteAt(s: number, ni: number): { step: number; midi: number } | null {
  if (ni < 0 || ni >= noteList.length || s < 0 || s >= seqState.steps) return null;
  const midi = noteList[ni].midi;
  // Walk back to find note whose range covers s
  for (let ss = s; ss >= 0; ss--) {
    if (!pianoNotes[ss]?.has(midi)) continue;
    if (s < ss + getNoteDur(ss, midi)) return { step: ss, midi };
    break;
  }
  return null;
}

function isSel(s: number, midi: number): boolean {
  return selectedKeys.has(nk(s, midi)) || movePlaced.has(nk(s, midi));
}

// ── Move helpers ───────────────────────────────────────────────────────────
function applyDelta(ds: number, dni: number): void {
  // Remove previously placed positions
  movePlaced.forEach(k => {
    const [ss, mm] = k.split('_').map(Number);
    pianoNotes[ss]?.delete(mm);
    deleteNoteDur(ss, mm);
  });
  movePlaced.clear();
  // Place at new positions
  moveOrigins.forEach(o => {
    const ns = Math.max(0, Math.min(seqState.steps - 1, o.step + ds));
    const nni = Math.max(0, Math.min(noteList.length - 1, o.ni + dni));
    const nm = noteList[nni].midi;
    const nd = Math.min(o.dur, seqState.steps - ns);
    pianoNotes[ns].add(nm);
    setNoteDur(ns, nm, nd);
    movePlaced.add(nk(ns, nm));
  });
}

function startMove(s: number, ni: number, midi: number, shiftKey: boolean): void {
  if (!isSel(s, midi)) {
    if (!shiftKey) selectedKeys.clear();
    selectedKeys.add(nk(s, midi));
  }
  moveOrigins = [...selectedKeys].map(k => {
    const [ss, mm] = k.split('_').map(Number);
    return { step: ss, ni: niOf(mm), dur: getNoteDur(ss, mm) };
  });
  // Remove originals from pianoNotes
  moveOrigins.forEach(o => {
    if (noteList[o.ni]) { pianoNotes[o.step]?.delete(noteList[o.ni].midi); deleteNoteDur(o.step, noteList[o.ni].midi); }
  });
  movePlaced.clear();
  moveAnchor = { s, ni };
  lastDelta = { ds: 0, dni: 0 };
  applyDelta(0, 0);
  dragMode = 'move';
}

function finalizeMove(): void {
  selectedKeys.clear();
  movePlaced.forEach(k => selectedKeys.add(k));
  movePlaced.clear();
  moveOrigins = [];
  scheduleAutoSave();
}

// ── Draw ───────────────────────────────────────────────────────────────────
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

  // ── Pass 1: grid backgrounds ──
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
      const isPH = s === seqState.currentStep;
      const isHov = s === hoverStep && ni === hoverNote;
      cx.fillStyle = isPH ? (note.isBlack ? '#1c2535' : '#1e2d45') : isHov ? '#1a2e4a' : note.isBlack ? '#0f1520' : '#161f30';
      cx.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2);
      if (s % 4 === 0) { cx.fillStyle = '#2a3a50'; cx.fillRect(x, y, 1, CELL_H); }
    }
    cx.fillStyle = '#1a2030'; cx.fillRect(KEY_W, y + CELL_H - 1, W - KEY_W, 1);
  });
  cx.fillStyle = '#30363d'; cx.fillRect(KEY_W - 1, NUM_H, 1, H - NUM_H);
  if (seqState.currentStep >= 0) {
    const px = KEY_W + seqState.currentStep * CELL_W;
    cx.fillStyle = 'rgba(255,255,255,0.06)'; cx.fillRect(px, NUM_H, CELL_W, H - NUM_H);
  }

  // ── Pass 2: notes (always on top of grid) ──
  noteList.forEach((note, ni) => {
    const y = NUM_H + ni * CELL_H;
    for (let s = 0; s < seqState.steps; s++) {
      if (!pianoNotes[s]?.has(note.midi)) continue;
      const x = KEY_W + s * CELL_W;
      const dur = getNoteDur(s, note.midi);
      const noteW = Math.min(dur * CELL_W, (seqState.steps - s) * CELL_W) - 2;
      const sel = isSel(s, note.midi);
      cx.fillStyle = sel ? '#388bfd' : '#1f6feb';
      cx.fillRect(x + 1, y + 1, noteW, CELL_H - 2);
      cx.fillStyle = 'rgba(120,180,255,0.25)';
      cx.fillRect(x + 1, y + 1, noteW, 4);
      // Resize handle — always visible at right edge
      const rx = x + noteW - RESIZE_PX + 1;
      cx.fillStyle = 'rgba(255,255,255,0.45)';
      cx.fillRect(rx, y + 2, RESIZE_PX - 2, CELL_H - 4);
      if (sel) {
        cx.strokeStyle = '#79c0ff'; cx.lineWidth = 1;
        cx.strokeRect(x + 1.5, y + 1.5, noteW - 1, CELL_H - 3);
      }
    }
  });

  // ── Pass 3: selection rect ──
  if (dragMode === 'select' && selStart && selCurrent) {
    const x1 = Math.min(selStart.mx, selCurrent.mx);
    const y1 = Math.min(selStart.my, selCurrent.my);
    const rw = Math.abs(selCurrent.mx - selStart.mx);
    const rh = Math.abs(selCurrent.my - selStart.my);
    cx.fillStyle = 'rgba(56,139,253,0.12)';
    cx.fillRect(x1, y1, rw, rh);
    cx.strokeStyle = '#388bfd'; cx.lineWidth = 1;
    cx.setLineDash([3, 3]);
    cx.strokeRect(x1 + 0.5, y1 + 0.5, rw, rh);
    cx.setLineDash([]);
  }
}

// ── Events ─────────────────────────────────────────────────────────────────
function coords(e: MouseEvent) {
  const r = canvas!.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  return { mx, my, s: Math.floor((mx - KEY_W) / CELL_W), ni: Math.floor((my - NUM_H) / CELL_H) };
}

function updateCursor(mx: number, my: number): void {
  if (!canvas) return;
  if (resizeHandleAt(mx, my)) { canvas.style.cursor = 'ew-resize'; return; }
  const s = Math.floor((mx - KEY_W) / CELL_W);
  const ni = Math.floor((my - NUM_H) / CELL_H);
  canvas.style.cursor = noteAt(s, ni) ? 'grab' : 'crosshair';
}

function bindEvents(): void {
  if (!canvas) return;

  canvas.addEventListener('mousedown', e => {
    if (e.button === 2) return; // right-click handled by contextmenu
    const { mx, my, s, ni } = coords(e);

    // Piano key
    if (mx < KEY_W && my >= NUM_H) {
      if (ni >= 0 && ni < noteList.length) playNote(noteList[ni].midi, getCtx().currentTime, 0.35, synthParams);
      return;
    }

    // Resize handle
    const rh = resizeHandleAt(mx, my);
    if (rh) {
      dragMode = 'resize';
      resizeNote = rh; resizeStartX = mx; resizeOrigDur = getNoteDur(rh.step, rh.midi);
      return;
    }

    // On a note → select + move
    const on = noteAt(s, ni);
    if (on) {
      if (e.shiftKey) {
        if (isSel(on.step, on.midi)) selectedKeys.delete(nk(on.step, on.midi));
        else selectedKeys.add(nk(on.step, on.midi));
        draw(); return;
      }
      startMove(s, ni, on.midi, false);
      draw(); return;
    }

    // Empty → pending (click=add, drag=select)
    pending = { s, ni, mx, my };
  });

  canvas.addEventListener('mousemove', e => {
    const { mx, my, s, ni } = coords(e);
    hoverStep = s; hoverNote = ni;
    updateCursor(mx, my);

    if (e.buttons !== 1) { draw(); return; }

    if (dragMode === 'resize' && resizeNote) {
      const newDur = Math.max(1, Math.min(resizeOrigDur + Math.round((mx - resizeStartX) / CELL_W), seqState.steps - resizeNote.step));
      setNoteDur(resizeNote.step, resizeNote.midi, newDur);
      draw(); scheduleAutoSave(); return;
    }

    if (dragMode === 'move') {
      const ds = s - moveAnchor.s, dni = ni - moveAnchor.ni;
      if (ds !== lastDelta.ds || dni !== lastDelta.dni) {
        applyDelta(ds, dni);
        lastDelta = { ds, dni };
      }
      canvas!.style.cursor = 'grabbing';
      draw(); return;
    }

    if (pending) {
      const dx = mx - pending.mx, dy = my - pending.my;
      if (Math.sqrt(dx * dx + dy * dy) > MIN_DRAG_PX) {
        dragMode = 'select';
        selStart = { mx: pending.mx, my: pending.my };
        selCurrent = { mx, my };
        pending = null;
        draw();
      }
      return;
    }

    if (dragMode === 'select' && selStart) {
      selCurrent = { mx, my };
      draw();
    }
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const { s, ni } = coords(e);
    const on = noteAt(s, ni);
    if (!on) return;
    selectedKeys.delete(nk(on.step, on.midi));
    pianoNotes[on.step]?.delete(on.midi);
    deleteNoteDur(on.step, on.midi);
    scheduleAutoSave(); draw();
  });

  canvas.addEventListener('mouseleave', () => { hoverStep = -1; hoverNote = -1; draw(); });

  document.addEventListener('mouseup', e => {
    // Pending = click on empty → add note
    if (pending) {
      const { s, ni } = pending;
      if (s >= 0 && s < seqState.steps && ni >= 0 && ni < noteList.length) {
        const midi = noteList[ni].midi;
        if (!pianoNotes[s].has(midi)) {
          pianoNotes[s].add(midi);
          playNote(midi, getCtx().currentTime, 0.2, synthParams);
        }
        if (!e.shiftKey) selectedKeys.clear();
        scheduleAutoSave();
      }
      pending = null;
    }

    if (dragMode === 'move') finalizeMove();

    if (dragMode === 'select' && selStart && selCurrent) {
      const x1 = Math.min(selStart.mx, selCurrent.mx), x2 = Math.max(selStart.mx, selCurrent.mx);
      const y1 = Math.min(selStart.my, selCurrent.my), y2 = Math.max(selStart.my, selCurrent.my);
      if (!e.shiftKey) selectedKeys.clear();
      noteList.forEach((note, noteNi) => {
        const cy1 = NUM_H + noteNi * CELL_H, cy2 = cy1 + CELL_H;
        if (cy1 >= y2 || cy2 <= y1) return;
        for (let ss = 0; ss < seqState.steps; ss++) {
          if (!pianoNotes[ss]?.has(note.midi)) continue;
          const dur = getNoteDur(ss, note.midi);
          const cx1 = KEY_W + ss * CELL_W, cx2 = KEY_W + (ss + dur) * CELL_W;
          if (cx1 < x2 && cx2 > x1) selectedKeys.add(nk(ss, note.midi));
        }
      });
      selStart = null; selCurrent = null;
    }

    if (dragMode === 'resize') scheduleAutoSave();

    dragMode = null;
    if (canvas) updateCursor(hoverStep * CELL_W + KEY_W + CELL_W / 2, hoverNote * CELL_H + NUM_H + CELL_H / 2);
    draw();
  });
}
