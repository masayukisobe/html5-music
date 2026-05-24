import './style.css';
import { seqState, noteList, pianoNotes, setNoteList, resizeDrumPat, resizePianoNotes, drumPat, CHANNELS } from './sequencer/state';
import { onStep } from './sequencer/transport';
import { applyDrumPreset, randomizeDrums, applyPianoPreset } from './sequencer/presets';
import { buildDrumSequencer, updateDrumPlayhead } from './ui/drumSequencer';
import { initPianoRoll, resize as prResize, draw as prDraw } from './ui/pianoRoll';
import { initTransportBar, initSynthControls } from './ui/transportBar';
import { buildNoteList } from './notes';

// Suppress unused import warning - noteList and CHANNELS are used below
void noteList;

// ── Tab switching ──
function switchTab(tab: 'drums' | 'piano'): void {
  document.querySelectorAll('.tab').forEach((el, i) => {
    el.classList.toggle('active', (i === 0) === (tab === 'drums'));
  });
  document.getElementById('panel-drums')!.classList.toggle('active', tab === 'drums');
  document.getElementById('panel-piano')!.classList.toggle('active', tab === 'piano');
}

// ── Steps ──
function setSteps(n: number): void {
  seqState.steps = n;
  resizeDrumPat(n);
  resizePianoNotes(n);
  buildDrumSequencer(document.getElementById('drum-seq')!);
  prResize(); prDraw();
}

// ── Octaves ──
function setOctaves(n: number): void {
  setNoteList(buildNoteList(n));
  prResize(); prDraw();
}

// ── Playhead ──
onStep(step => {
  updateDrumPlayhead(step);
  prDraw();
  const indicator = document.getElementById('step-indicator')!;
  indicator.textContent = step >= 0 ? `STEP ${step + 1} / ${seqState.steps}` : `STEP 1 / ${seqState.steps}`;
});

// ── Clear ──
function clearAll(): void {
  CHANNELS.forEach(ch => drumPat[ch.id].fill(0));
  pianoNotes.forEach(s => s.clear());
  buildDrumSequencer(document.getElementById('drum-seq')!);
  prDraw();
}

// ── Wire up DOM ──
document.addEventListener('DOMContentLoaded', () => {
  initTransportBar();
  initSynthControls();

  // Tabs
  document.querySelector<HTMLElement>('[data-tab="drums"]')!.addEventListener('click', () => switchTab('drums'));
  document.querySelector<HTMLElement>('[data-tab="piano"]')!.addEventListener('click', () => switchTab('piano'));

  // Steps select
  document.getElementById('steps-sel')!.addEventListener('change', e => {
    setSteps(+(e.target as HTMLSelectElement).value);
  });

  // Octaves select
  document.getElementById('octave-sel')!.addEventListener('change', e => {
    setOctaves(+(e.target as HTMLSelectElement).value);
  });

  // Clear
  document.getElementById('btn-clear')!.addEventListener('click', clearAll);

  // Drum presets
  document.querySelectorAll<HTMLElement>('[data-drum-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset['drumPreset']!;
      applyDrumPreset(name);
      buildDrumSequencer(document.getElementById('drum-seq')!);
    });
  });
  document.getElementById('btn-random')!.addEventListener('click', () => {
    randomizeDrums();
    buildDrumSequencer(document.getElementById('drum-seq')!);
  });

  // Piano presets
  document.querySelectorAll<HTMLElement>('[data-piano-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPianoPreset(btn.dataset['pianoPreset']!);
      prDraw();
    });
  });
  document.getElementById('btn-piano-clear')!.addEventListener('click', () => {
    pianoNotes.forEach(s => s.clear()); prDraw();
  });

  // Init piano roll canvas
  initPianoRoll(document.getElementById('pr-canvas') as HTMLCanvasElement);

  // Init drum sequencer
  applyDrumPreset('basic');
  buildDrumSequencer(document.getElementById('drum-seq')!);
});
