import './style.css';
import { seqState, noteList, pianoNotes, pianoNoteDurs, setNoteList, resizeDrumPat, resizePianoNotes, drumPat } from './sequencer/state';
import { onStep } from './sequencer/transport';
import { applyDrumPreset, randomizeDrums, applyPianoPreset } from './sequencer/presets';
import { buildDrumSequencer, updateDrumPlayhead } from './ui/drumSequencer';
import { initPianoRoll, resize as prResize, draw as prDraw } from './ui/pianoRoll';
import { initTransportBar, initSynthControls, refreshSynthControls } from './ui/transportBar';
import { buildTrackList } from './ui/trackList';
import { buildClipBar } from './ui/clipBar';
import { buildNoteList } from './notes';
import { loadFromStorage, scheduleAutoSave } from './project/io';
import { getSelectedTrack, DRUM_TRACK_ID } from './project/tracks';

void noteList;

// ── Playhead ──────────────────────────────────────────────────────────────
onStep(step => {
  updateDrumPlayhead(step);
  prDraw();
  const indicator = document.getElementById('step-indicator')!;
  indicator.textContent = step >= 0
    ? `STEP ${step + 1} / ${seqState.steps}`
    : `STEP 1 / ${seqState.steps}`;
});

// ── Editor panel: show drum or piano panel based on selected track ────────
function refreshEditorPanel(): void {
  const track = getSelectedTrack();
  const isDrum = !track || track.type === 'drum';
  document.getElementById('panel-drums')!.classList.toggle('active', isDrum);
  document.getElementById('panel-piano')!.classList.toggle('active', !isDrum);
  if (isDrum) {
    buildDrumSequencer(document.getElementById('drum-seq')!);
  } else {
    prResize(); prDraw();
  }
}

// ── Sync DOM controls to current state ────────────────────────────────────
function refreshDOMControls(): void {
  (document.getElementById('bpm-range') as HTMLInputElement).value = String(seqState.bpm);
  document.getElementById('bpm-val')!.textContent = String(seqState.bpm);
  (document.getElementById('swing-range') as HTMLInputElement).value = String(seqState.swing);
  (document.getElementById('steps-sel') as HTMLSelectElement).value = String(seqState.steps);
  refreshSynthControls();
}

// ── Full UI rebuild ────────────────────────────────────────────────────────
function refreshAllUI(): void {
  refreshDOMControls();
  buildTrackList(document.getElementById('track-list')!, refreshAllUI);
  buildClipBar(document.getElementById('clip-bar')!, refreshEditorContent);
  refreshEditorPanel();
}

function refreshEditorContent(): void {
  refreshDOMControls();
  buildClipBar(document.getElementById('clip-bar')!, refreshEditorContent);
  refreshEditorPanel();
}

// ── Steps ─────────────────────────────────────────────────────────────────
function setSteps(n: number): void {
  seqState.steps = n;
  const track = getSelectedTrack();
  if (!track || track.type === 'drum') resizeDrumPat(n);
  else resizePianoNotes(n);
  refreshEditorPanel();
  scheduleAutoSave();
}

// ── Octaves ───────────────────────────────────────────────────────────────
function setOctaves(n: number): void {
  setNoteList(buildNoteList(n));
  prResize(); prDraw();
}

// ── Clear current clip ────────────────────────────────────────────────────
function clearCurrentClip(): void {
  const track = getSelectedTrack();
  if (!track || track.type === 'drum') {
    Object.values(drumPat).forEach(arr => arr.fill(0));
    buildDrumSequencer(document.getElementById('drum-seq')!);
  } else {
    pianoNotes.forEach(s => s.clear());
    pianoNoteDurs.clear();
    prDraw();
  }
  scheduleAutoSave();
}

// ── Wire up DOM ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTransportBar(refreshAllUI);
  initSynthControls();

  document.getElementById('steps-sel')!.addEventListener('change', e => {
    setSteps(+(e.target as HTMLSelectElement).value);
  });
  document.getElementById('octave-sel')!.addEventListener('change', e => {
    setOctaves(+(e.target as HTMLSelectElement).value);
  });
  document.getElementById('btn-clear')!.addEventListener('click', clearCurrentClip);

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
      prDraw(); scheduleAutoSave();
    });
  });
  document.getElementById('btn-piano-clear')!.addEventListener('click', () => {
    pianoNotes.forEach(s => s.clear()); prDraw(); scheduleAutoSave();
  });

  // Init piano roll canvas
  initPianoRoll(document.getElementById('pr-canvas') as HTMLCanvasElement);

  // Load from storage or apply defaults
  const hadSavedData = loadFromStorage();

  // Build UI
  buildTrackList(document.getElementById('track-list')!, refreshAllUI);
  buildClipBar(document.getElementById('clip-bar')!, refreshEditorContent);

  if (hadSavedData) {
    refreshDOMControls();
  } else {
    applyDrumPreset('basic');
  }

  // Drum track is always selected initially → show drum panel
  const track = getSelectedTrack();
  const isDrum = !track || track.id === DRUM_TRACK_ID;
  document.getElementById('panel-drums')!.classList.toggle('active', isDrum);
  document.getElementById('panel-piano')!.classList.toggle('active', !isDrum);
  buildDrumSequencer(document.getElementById('drum-seq')!);
});
