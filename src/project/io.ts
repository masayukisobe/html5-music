import { seqState } from '../sequencer/state';
import { serializeState, loadFromData, resetToDefaults, DRUM_TRACK_ID } from './tracks';
import type { ProjectData, Track, Clip } from './schema';
import type { SynthParams } from '../types';

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
  const { tracks, clips, activeClipIds, selectedTrackId } = serializeState();
  return { version: 2, bpm: seqState.bpm, swing: seqState.swing,
    tracks, clips, activeClipIds, selectedTrackId };
}

// ── v1 migration ───────────────────────────────────────────────────────────

interface _V1Pattern {
  id: string; steps: number;
  drums: Record<string, number[]>;
  piano: number[][];
  synth: SynthParams;
}
interface _V1Data { version: 1; bpm: number; swing: number; patterns: _V1Pattern[]; currentPatternId: string; }

function _migrateV1(data: _V1Data): void {
  const synthTrackId = `t${Date.now()}`;
  const tracks: Track[] = [
    { id: DRUM_TRACK_ID, name: 'Drum Kit', type: 'drum', color: '#388bfd' },
    { id: synthTrackId,  name: 'Lead Synth', type: 'synth', color: '#3fb950',
      synth: data.patterns[0]?.synth },
  ];
  const clips: Clip[] = [];
  const activeClipIds: Record<string, string> = {};
  let activeIdx = data.patterns.findIndex(p => p.id === data.currentPatternId);
  if (activeIdx < 0) activeIdx = 0;
  data.patterns.forEach((pat, i) => {
    const dc: Clip = { id: `cd${i}`, trackId: DRUM_TRACK_ID, name: `Clip ${i + 1}`,
      steps: pat.steps, drums: pat.drums };
    const sc: Clip = { id: `cs${i}`, trackId: synthTrackId, name: `Clip ${i + 1}`,
      steps: pat.steps, piano: pat.piano };
    clips.push(dc, sc);
    if (i === activeIdx) { activeClipIds[DRUM_TRACK_ID] = dc.id; activeClipIds[synthTrackId] = sc.id; }
  });
  if (!activeClipIds[DRUM_TRACK_ID]) activeClipIds[DRUM_TRACK_ID] = clips[0]?.id ?? '';
  if (!activeClipIds[synthTrackId])  activeClipIds[synthTrackId]  = clips[1]?.id ?? '';
  seqState.bpm = data.bpm;
  seqState.swing = data.swing;
  loadFromData({ tracks, clips, activeClipIds, selectedTrackId: DRUM_TRACK_ID });
}

// ── Deserialize ────────────────────────────────────────────────────────────

export function deserializeProject(raw: unknown): void {
  const data = raw as { version?: number };
  if (data.version === 1) { _migrateV1(raw as _V1Data); return; }
  const d = raw as ProjectData;
  seqState.bpm = d.bpm;
  seqState.swing = d.swing;
  loadFromData({ tracks: d.tracks, clips: d.clips,
    activeClipIds: d.activeClipIds, selectedTrackId: d.selectedTrackId });
}

// ── Storage ────────────────────────────────────────────────────────────────

export function saveToStorage(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeProject())); }
  catch { /* quota */ }
}

export function loadFromStorage(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try { deserializeProject(JSON.parse(raw)); return true; }
  catch { resetToDefaults(); return false; }
}

export function exportToFile(): void {
  const json = JSON.stringify(serializeProject(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sequencer-project.json'; a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File, onDone: () => void): void {
  file.text()
    .then(text => {
      try { deserializeProject(JSON.parse(text)); saveToStorage(); onDone(); }
      catch { alert('プロジェクトファイルの読み込みに失敗しました'); }
    })
    .catch(() => alert('ファイルの読み込みに失敗しました'));
}
