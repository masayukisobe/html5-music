import { seqState, drumPat, pianoNotes, setPianoNotes, pianoNoteDurs, setPianoNoteDurs, synthParams, CHANNELS } from '../sequencer/state';
import type { Track, Clip } from './schema';
import type { SynthParams } from '../types';

export const DRUM_TRACK_ID = 'drum';

const DEFAULT_SYNTH: SynthParams = {
  wave: 'sawtooth', attack: 5, decay: 80, sustain: 0.6,
  release: 200, detune: 0, octShift: 0, useSample: false,
};

const SYNTH_COLORS = ['#3fb950', '#ff7b72', '#bc8cff', '#ffd700', '#ff9f43'];

let _tracks: Track[] = [];
let _clips: Clip[] = [];
let _activeClipIds: Record<string, string> = {};
let _selectedTrackId = DRUM_TRACK_ID;

function _uid(): string { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`; }

function _loadClipIntoBuffer(clip: Clip, track: Track): void {
  seqState.steps = clip.steps;
  if (track.type === 'drum' && clip.drums) {
    CHANNELS.forEach(ch => {
      drumPat[ch.id] = new Uint8Array(clip.steps);
      const saved = clip.drums![ch.id];
      if (saved) drumPat[ch.id].set(saved.slice(0, clip.steps));
    });
  } else if (track.type === 'synth' && clip.piano) {
    setPianoNotes(clip.piano.map(arr => new Set<number>(arr)));
    setPianoNoteDurs(new Map(Object.entries(clip.pianoDurs ?? {})));
  }
  if (track.synth) Object.assign(synthParams, track.synth);
}

function _saveBufferToClip(clip: Clip, track: Track): void {
  clip.steps = seqState.steps;
  if (track.type === 'drum') {
    clip.drums = Object.fromEntries(CHANNELS.map(ch => [ch.id, Array.from(drumPat[ch.id])]));
  } else {
    clip.piano = pianoNotes.map(s => Array.from(s));
    clip.pianoDurs = pianoNoteDurs.size > 0 ? Object.fromEntries(pianoNoteDurs) : undefined;
    track.synth = { ...synthParams };
  }
}

function _activeClip(trackId: string): Clip | undefined {
  return _clips.find(c => c.id === _activeClipIds[trackId]);
}

function _emptyDrumClip(id: string, name: string): Clip {
  return {
    id, trackId: DRUM_TRACK_ID, name, steps: seqState.steps,
    drums: Object.fromEntries(CHANNELS.map(ch => [ch.id, new Array<number>(seqState.steps).fill(0)])),
  };
}

function _emptySynthClip(id: string, trackId: string, name: string): Clip {
  return {
    id, trackId, name, steps: seqState.steps,
    piano: Array.from({ length: seqState.steps }, () => [] as number[]),
  };
}

export function resetToDefaults(): void {
  const drumClipId = _uid();
  const bassId = _uid();
  const bassClipId = _uid();
  const melodyId = _uid();
  const melodyClipId = _uid();
  _tracks = [
    { id: DRUM_TRACK_ID, name: 'Drum Kit', type: 'drum', color: '#388bfd' },
    { id: bassId, name: 'Bass', type: 'synth', color: SYNTH_COLORS[0],
      synth: { ...DEFAULT_SYNTH, wave: 'sine', octShift: -1, attack: 5, decay: 120, sustain: 0.7, release: 180 } },
    { id: melodyId, name: 'Melody', type: 'synth', color: SYNTH_COLORS[1],
      synth: { ...DEFAULT_SYNTH, wave: 'sawtooth' } },
  ];
  _clips = [
    _emptyDrumClip(drumClipId, 'Clip 1'),
    _emptySynthClip(bassClipId, bassId, 'Clip 1'),
    _emptySynthClip(melodyClipId, melodyId, 'Clip 1'),
  ];
  _activeClipIds = {
    [DRUM_TRACK_ID]: drumClipId,
    [bassId]: bassClipId,
    [melodyId]: melodyClipId,
  };
  _selectedTrackId = DRUM_TRACK_ID;
  _loadClipIntoBuffer(_clips[0], _tracks[0]);
}

resetToDefaults();

// ── Reads ──────────────────────────────────────────────────────────────────

export function getTracks(): Track[] { return [..._tracks]; }
export function getSelectedTrackId(): string { return _selectedTrackId; }
export function getSelectedTrack(): Track | undefined { return _tracks.find(t => t.id === _selectedTrackId); }
export function getClipsForTrack(trackId: string): Clip[] { return _clips.filter(c => c.trackId === trackId); }
export function getActiveClipId(trackId: string): string { return _activeClipIds[trackId]; }

// ── Selection ──────────────────────────────────────────────────────────────

export function selectTrack(trackId: string): void {
  if (trackId === _selectedTrackId) return;
  const curTrack = _tracks.find(t => t.id === _selectedTrackId);
  const curClip = _activeClip(_selectedTrackId);
  if (curTrack && curClip) _saveBufferToClip(curClip, curTrack);
  _selectedTrackId = trackId;
  const newTrack = _tracks.find(t => t.id === trackId)!;
  const newClip = _activeClip(trackId);
  if (newClip) _loadClipIntoBuffer(newClip, newTrack);
}

export function selectClip(trackId: string, clipId: string): void {
  const track = _tracks.find(t => t.id === trackId);
  if (!track) return;
  if (trackId === _selectedTrackId) {
    const cur = _activeClip(trackId);
    if (cur) _saveBufferToClip(cur, track);
  }
  _activeClipIds[trackId] = clipId;
  if (trackId === _selectedTrackId) {
    const clip = _clips.find(c => c.id === clipId);
    if (clip) _loadClipIntoBuffer(clip, track);
  }
}

// ── Clip mutations ─────────────────────────────────────────────────────────

export function addClip(trackId: string): void {
  const track = _tracks.find(t => t.id === trackId);
  if (!track) return;
  const n = _clips.filter(c => c.trackId === trackId).length + 1;
  const id = _uid();
  const clip = track.type === 'drum'
    ? _emptyDrumClip(id, `Clip ${n}`)
    : _emptySynthClip(id, trackId, `Clip ${n}`);
  _clips.push(clip);
  selectClip(trackId, id);
}

export function duplicateClip(trackId: string, clipId: string): void {
  const track = _tracks.find(t => t.id === trackId);
  if (!track) return;
  if (trackId === _selectedTrackId) {
    const cur = _activeClip(trackId);
    if (cur) _saveBufferToClip(cur, track);
  }
  const src = _clips.find(c => c.id === clipId);
  if (!src) return;
  const n = _clips.filter(c => c.trackId === trackId).length + 1;
  const dup: Clip = { ...JSON.parse(JSON.stringify(src)), id: _uid(), name: `Clip ${n}` };
  _clips.push(dup);
  selectClip(trackId, dup.id);
}

export function removeClip(trackId: string, clipId: string): void {
  if (_clips.filter(c => c.trackId === trackId).length <= 1) return;
  const track = _tracks.find(t => t.id === trackId);
  if (!track) return;
  const idx = _clips.findIndex(c => c.id === clipId);
  _clips = _clips.filter(c => c.id !== clipId);
  if (_activeClipIds[trackId] === clipId) {
    const remaining = _clips.filter(c => c.trackId === trackId);
    const fallback = remaining[Math.min(idx, remaining.length - 1)];
    if (fallback) selectClip(trackId, fallback.id);
  }
}

// ── Track mutations ────────────────────────────────────────────────────────

export function addSynthTrack(): void {
  const curTrack = _tracks.find(t => t.id === _selectedTrackId);
  const curClip = _activeClip(_selectedTrackId);
  if (curTrack && curClip) _saveBufferToClip(curClip, curTrack);
  const trackId = _uid();
  const n = _tracks.filter(t => t.type === 'synth').length + 1;
  const track: Track = {
    id: trackId, name: `Synth ${n}`, type: 'synth',
    color: SYNTH_COLORS[(n - 1) % SYNTH_COLORS.length],
    synth: { ...DEFAULT_SYNTH },
  };
  _tracks.push(track);
  const clipId = _uid();
  _clips.push(_emptySynthClip(clipId, trackId, 'Clip 1'));
  _activeClipIds[trackId] = clipId;
  _selectedTrackId = trackId;
  _loadClipIntoBuffer(_clips[_clips.length - 1], track);
}

export function removeSynthTrack(trackId: string): void {
  if (trackId === DRUM_TRACK_ID) return;
  if (_selectedTrackId === trackId) selectTrack(DRUM_TRACK_ID);
  _tracks = _tracks.filter(t => t.id !== trackId);
  _clips = _clips.filter(c => c.trackId !== trackId);
  delete _activeClipIds[trackId];
}

export function renameTrack(trackId: string, name: string): void {
  const t = _tracks.find(t => t.id === trackId);
  if (t) t.name = name.trim() || t.name;
}

export function setTrackVolume(trackId: string, vol: number): void {
  const t = _tracks.find(t => t.id === trackId);
  if (t) t.volume = vol;
}

export function toggleMute(trackId: string): void {
  const t = _tracks.find(t => t.id === trackId);
  if (t) t.muted = !t.muted;
}

export function toggleSolo(trackId: string): void {
  const t = _tracks.find(t => t.id === trackId);
  if (!t) return;
  const wasSoloed = !!t.soloed;
  _tracks.forEach(tr => { tr.soloed = false; });
  if (!wasSoloed) t.soloed = true;
}

// ── Snapshot (for serialization) ──────────────────────────────────────────

export function snapshotSelected(): void {
  const track = _tracks.find(t => t.id === _selectedTrackId);
  const clip = _activeClip(_selectedTrackId);
  if (track && clip) _saveBufferToClip(clip, track);
}

// ── Playback data (for transport) ─────────────────────────────────────────

export interface TrackPlayback {
  type: 'drum' | 'synth';
  steps: number;
  volume: number;
  drumGrid?: Record<string, Uint8Array>;
  pianoNotes?: Set<number>[];
  pianoNoteDurs?: Map<string, number>;
  synth?: SynthParams;
}

export function getPlaybackData(): TrackPlayback[] {
  const anySoloed = _tracks.some(t => t.soloed);
  return _tracks.flatMap((track): TrackPlayback[] => {
    if (track.muted) return [];
    if (anySoloed && !track.soloed) return [];
    const vol = track.volume ?? 100;
    if (track.id === _selectedTrackId) {
      if (track.type === 'drum') {
        return [{ type: 'drum' as const, steps: seqState.steps, volume: vol,
          drumGrid: Object.fromEntries(CHANNELS.map(ch => [ch.id, drumPat[ch.id]])) }];
      } else {
        return [{ type: 'synth' as const, steps: seqState.steps, volume: vol,
          pianoNotes, pianoNoteDurs, synth: synthParams }];
      }
    }
    const clip = _activeClip(track.id);
    if (!clip) return [];
    if (track.type === 'drum' && clip.drums) {
      return [{ type: 'drum' as const, steps: clip.steps, volume: vol,
        drumGrid: Object.fromEntries(
          Object.entries(clip.drums).map(([ch, arr]) => [ch, new Uint8Array(arr)])
        ) }];
    }
    if (track.type === 'synth' && clip.piano && track.synth) {
      return [{ type: 'synth' as const, steps: clip.steps, volume: vol,
        pianoNotes: clip.piano.map(arr => new Set<number>(arr)),
        pianoNoteDurs: new Map(Object.entries(clip.pianoDurs ?? {})),
        synth: track.synth }];
    }
    return [];
  });
}

// ── Serialize / Deserialize ────────────────────────────────────────────────

export function serializeState() {
  snapshotSelected();
  return {
    tracks: JSON.parse(JSON.stringify(_tracks)) as Track[],
    clips: JSON.parse(JSON.stringify(_clips)) as Clip[],
    activeClipIds: { ..._activeClipIds },
    selectedTrackId: _selectedTrackId,
  };
}

export function loadFromData(data: {
  tracks: Track[];
  clips: Clip[];
  activeClipIds: Record<string, string>;
  selectedTrackId: string;
}): void {
  _tracks = data.tracks;
  _clips = data.clips;
  _activeClipIds = data.activeClipIds;
  _selectedTrackId = data.selectedTrackId;
  const track = _tracks.find(t => t.id === _selectedTrackId);
  const clip = _activeClip(_selectedTrackId);
  if (track && clip) _loadClipIntoBuffer(clip, track);
}
