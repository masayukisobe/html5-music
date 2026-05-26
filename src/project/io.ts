import { seqState } from '../sequencer/state';
import { getAll, currentId, snapshotCurrent, loadFromData } from './patterns';
import type { ProjectData } from './schema';

const STORAGE_KEY = 'sequencer_project';

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
  snapshotCurrent();
  const patterns = getAll();
  return {
    version: 1,
    bpm: seqState.bpm,
    swing: seqState.swing,
    patterns,
    arrangement: patterns.map(p => p.id),
    currentPatternId: currentId,
  };
}

export function deserializeProject(data: ProjectData): void {
  seqState.bpm = data.bpm;
  seqState.swing = data.swing;
  loadFromData(data.patterns, data.currentPatternId);
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
