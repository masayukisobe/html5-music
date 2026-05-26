import { seqState, drumPat, pianoNotes, setPianoNotes, synthParams, CHANNELS } from '../sequencer/state';
import type { PatternData } from './schema';

export let currentId = 'p1';
const store = new Map<string, PatternData>();

store.set('p1', _makeEmpty('p1', 'Pattern 1'));

function _makeEmpty(id: string, name: string): PatternData {
  return {
    id, name,
    steps: seqState.steps,
    drums: Object.fromEntries(CHANNELS.map(ch => [ch.id, new Array<number>(seqState.steps).fill(0)])),
    piano: Array.from({ length: seqState.steps }, () => [] as number[]),
    synth: { ...synthParams },
  };
}

function _loadPatternData(pat: PatternData): void {
  seqState.steps = pat.steps;
  CHANNELS.forEach(ch => {
    drumPat[ch.id] = new Uint8Array(pat.steps);
    const saved = pat.drums[ch.id];
    if (saved) drumPat[ch.id].set(saved.slice(0, pat.steps));
  });
  setPianoNotes(pat.piano.map(arr => new Set<number>(arr)));
  Object.assign(synthParams, pat.synth);
}

function _liveSnapshot(): Omit<PatternData, 'id' | 'name'> {
  return {
    steps: seqState.steps,
    drums: Object.fromEntries(CHANNELS.map(ch => [ch.id, Array.from(drumPat[ch.id])])),
    piano: pianoNotes.map(s => Array.from(s)),
    synth: { ...synthParams },
  };
}

export function snapshotCurrent(): void {
  const existing = store.get(currentId)!;
  store.set(currentId, { ...existing, ..._liveSnapshot() });
}

export function getAll(): PatternData[] {
  return Array.from(store.values());
}

export function switchTo(id: string): void {
  if (id === currentId) return;
  snapshotCurrent();
  currentId = id;
  _loadPatternData(store.get(id)!);
}

export function addAndSwitch(): void {
  snapshotCurrent();
  const newId = `p${Date.now()}`;
  const n = store.size + 1;
  const pat = _makeEmpty(newId, `Pattern ${n}`);
  store.set(newId, pat);
  currentId = newId;
  _loadPatternData(pat);
}

export function remove(id: string): void {
  if (store.size <= 1) return;
  const keys = Array.from(store.keys());
  const idx = keys.indexOf(id);
  store.delete(id);
  if (currentId === id) {
    const newKeys = Array.from(store.keys());
    const fallbackId = newKeys[Math.min(idx, newKeys.length - 1)];
    currentId = fallbackId;
    _loadPatternData(store.get(fallbackId)!);
  }
}

export function loadFromData(patterns: PatternData[], activeId: string): void {
  store.clear();
  patterns.forEach(p => store.set(p.id, p));
  const active = store.get(activeId) ?? patterns[0];
  if (!active) return;
  currentId = active.id;
  _loadPatternData(active);
}
