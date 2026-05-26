import { seqState, drumPat, pianoNotes, setPianoNotes, synthParams, CHANNELS } from '../sequencer/state';
import type { ProjectData } from './schema';

const STORAGE_KEY = 'sequencer_project';
const CURRENT_PATTERN_ID = 'p1';

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSave(): void {
  if (_saveTimer !== null) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    saveToStorage();
    _flashSaved();
  }, 300);
}

function _flashSaved(): void {
  const el = document.getElementById('autosave-indicator');
  if (!el) return;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 1500);
}

export function serializeProject(): ProjectData {
  return {
    version: 1,
    bpm: seqState.bpm,
    swing: seqState.swing,
    patterns: [{
      id: CURRENT_PATTERN_ID,
      name: 'Pattern 1',
      steps: seqState.steps,
      drums: Object.fromEntries(CHANNELS.map(ch => [ch.id, Array.from(drumPat[ch.id])])),
      piano: pianoNotes.map(s => Array.from(s)),
      synth: { ...synthParams },
    }],
    arrangement: [CURRENT_PATTERN_ID],
    currentPatternId: CURRENT_PATTERN_ID,
  };
}

export function deserializeProject(data: ProjectData): void {
  seqState.bpm = data.bpm;
  seqState.swing = data.swing;
  const pat = data.patterns.find(p => p.id === data.currentPatternId) ?? data.patterns[0];
  if (!pat) return;
  seqState.steps = pat.steps;
  CHANNELS.forEach(ch => {
    drumPat[ch.id] = new Uint8Array(pat.steps);
    const saved = pat.drums[ch.id];
    if (saved) drumPat[ch.id].set(saved.slice(0, pat.steps));
  });
  setPianoNotes(pat.piano.map(arr => new Set<number>(arr)));
  Object.assign(synthParams, pat.synth);
}

export function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeProject()));
  } catch { /* quota exceeded */ }
}

export function loadFromStorage(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    deserializeProject(JSON.parse(raw) as ProjectData);
    return true;
  } catch { return false; }
}

export function exportToFile(): void {
  const json = JSON.stringify(serializeProject(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sequencer-project.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File, onDone: () => void): void {
  file.text().then(text => {
    try {
      deserializeProject(JSON.parse(text) as ProjectData);
      saveToStorage();
      onDone();
    } catch {
      alert('プロジェクトファイルの読み込みに失敗しました');
    }
  }).catch(() => alert('ファイルの読み込みに失敗しました'));
}
