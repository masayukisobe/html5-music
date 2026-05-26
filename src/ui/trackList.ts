import { getTracks, getSelectedTrackId, selectTrack, addSynthTrack, removeSynthTrack,
  toggleMute, toggleSolo, renameTrack, setTrackVolume, DRUM_TRACK_ID } from '../project/tracks';
import { stop } from '../sequencer/transport';
import { scheduleAutoSave } from '../project/io';

type Callback = () => void;

export function buildTrackList(container: HTMLElement, onSelect: Callback): void {
  container.innerHTML = '';

  getTracks().forEach(track => {
    const row = document.createElement('div');
    row.className = 'track-row' + (track.id === getSelectedTrackId() ? ' active' : '');
    row.style.setProperty('--track-color', track.color);

    // ── Top line ──
    const topLine = document.createElement('div');
    topLine.className = 'track-top';

    const icon = document.createElement('span');
    icon.className = 'track-icon';
    icon.textContent = track.type === 'drum' ? '🥁' : '🎹';

    const name = document.createElement('span');
    name.className = 'track-name';
    name.textContent = track.name;
    name.title = 'Double-click to rename';
    name.addEventListener('dblclick', e => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.className = 'track-name-input';
      input.value = track.name;
      input.maxLength = 24;
      topLine.replaceChild(input, name);
      input.focus(); input.select();
      const commit = () => {
        renameTrack(track.id, input.value);
        scheduleAutoSave();
        buildTrackList(container, onSelect);
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { input.blur(); }
        if (ev.key === 'Escape') { input.removeEventListener('blur', commit); buildTrackList(container, onSelect); }
        ev.stopPropagation();
      });
    });

    const mute = document.createElement('button');
    mute.className = 'track-ms' + (track.muted ? ' muted' : '');
    mute.textContent = 'M';
    mute.title = 'Mute';
    mute.addEventListener('click', e => {
      e.stopPropagation();
      toggleMute(track.id);
      scheduleAutoSave();
      buildTrackList(container, onSelect);
    });

    const solo = document.createElement('button');
    solo.className = 'track-ms' + (track.soloed ? ' soloed' : '');
    solo.textContent = 'S';
    solo.title = 'Solo';
    solo.addEventListener('click', e => {
      e.stopPropagation();
      toggleSolo(track.id);
      scheduleAutoSave();
      buildTrackList(container, onSelect);
    });

    topLine.appendChild(icon);
    topLine.appendChild(name);
    topLine.appendChild(mute);
    topLine.appendChild(solo);

    if (track.id !== DRUM_TRACK_ID) {
      const del = document.createElement('button');
      del.className = 'track-del';
      del.textContent = '×';
      del.title = 'Remove track';
      del.addEventListener('click', e => {
        e.stopPropagation();
        stop();
        removeSynthTrack(track.id);
        scheduleAutoSave();
        buildTrackList(container, onSelect);
        onSelect();
      });
      topLine.appendChild(del);
    }

    // ── Volume slider ──
    const volRow = document.createElement('div');
    volRow.className = 'track-vol-row';

    const volLabel = document.createElement('span');
    volLabel.className = 'track-vol-label';
    volLabel.textContent = 'VOL';

    const vol = document.createElement('input');
    vol.type = 'range';
    vol.className = 'track-vol';
    vol.min = '0'; vol.max = '100';
    vol.value = String(track.volume ?? 100);
    vol.addEventListener('input', e => {
      e.stopPropagation();
      setTrackVolume(track.id, +(vol.value));
      scheduleAutoSave();
    });
    vol.addEventListener('click', e => e.stopPropagation());

    volRow.appendChild(volLabel);
    volRow.appendChild(vol);

    row.appendChild(topLine);
    row.appendChild(volRow);

    row.addEventListener('click', () => {
      if (track.id === getSelectedTrackId()) return;
      stop();
      selectTrack(track.id);
      scheduleAutoSave();
      buildTrackList(container, onSelect);
      onSelect();
    });

    container.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'track-add';
  addBtn.textContent = '+ Synth Track';
  addBtn.addEventListener('click', () => {
    stop();
    addSynthTrack();
    scheduleAutoSave();
    buildTrackList(container, onSelect);
    onSelect();
  });
  container.appendChild(addBtn);
}
