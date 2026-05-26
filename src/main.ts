import './style.css';
import { seqState, noteList, pianoNotes, setNoteList, resizeDrumPat, resizePianoNotes, drumPat, CHANNELS } from './sequencer/state';
import { onStep } from './sequencer/transport';
import { applyDrumPreset, randomizeDrums, applyPianoPreset } from './sequencer/presets';
import { buildDrumSequencer, updateDrumPlayhead } from './ui/drumSequencer';
import { initPianoRoll, resize as prResize, draw as prDraw } from './ui/pianoRoll';
import { initTransportBar, initSynthControls, refreshSynthControls } from './ui/transportBar';
import { buildPatternBar } from './ui/patternBar';
import { buildNoteList } from './notes';
import { loadFromStorage, scheduleAutoSave } from './project/io';

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
  scheduleAutoSave();
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
  scheduleAutoSave();
}

// ── Sync DOM controls to current state ──
function refreshDOMControls(): void {
  (document.getElementById('bpm-range') as HTMLInputElement).value = String(seqState.bpm);
  document.getElementById('bpm-val')!.textContent = String(seqState.bpm);
  (document.getElementById('swing-range') as HTMLInputElement).value = String(seqState.swing);
  (document.getElementById('steps-sel') as HTMLSelectElement).value = String(seqState.steps);
  refreshSynthControls();
}

// ── Full UI rebuild (after pattern switch or import) ──
function refreshAllUI(): void {
  refreshDOMControls();
  buildDrumSequencer(document.getElementById('drum-seq')!);
  prResize(); prDraw();
}

// ── Wire up DOM ──
document.addEventListener('DOMContentLoaded', () => {
  initTransportBar(onImport);
  initSynthControls();

  function onImport(): void {
    buildPatternBar(document.getElementById('pattern-bar')!, refreshAllUI);
    refreshAllUI();
  }

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
      applyDrumPreset(btn.dataset['drumPreset']!);
      buildDrumSequencer(document.getElementById('drum-seq')!);
      scheduleAutoSave();
    });
  });
  document.getElementById('btn-random')!.addEventListener('click', () => {
    randomizeDrums();
    buildDrumSequencer(document.getElementById('drum-seq')!);
    scheduleAutoSave();
  });

  // Piano presets
  document.querySelectorAll<HTMLElement>('[data-piano-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPianoPreset(btn.dataset['pianoPreset']!);
      prDraw();
      scheduleAutoSave();
    });
  });
  document.getElementById('btn-piano-clear')!.addEventListener('click', () => {
    pianoNotes.forEach(s => s.clear()); prDraw();
    scheduleAutoSave();
  });

  // Init piano roll canvas
  initPianoRoll(document.getElementById('pr-canvas') as HTMLCanvasElement);

  // Load from storage or apply defaults
  if (loadFromStorage()) {
    refreshDOMControls();
    buildDrumSequencer(document.getElementById('drum-seq')!);
  } else {
    applyDrumPreset('basic');
    buildDrumSequencer(document.getElementById('drum-seq')!);
  }

  // Init pattern bar (after load so patterns are populated)
  buildPatternBar(document.getElementById('pattern-bar')!, refreshAllUI);
});
