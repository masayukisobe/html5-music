import { getSelectedTrackId, getClipsForTrack, getActiveClipId,
  selectClip, addClip, duplicateClip, removeClip } from '../project/tracks';
import { scheduleAutoSave } from '../project/io';

type Callback = () => void;

export function buildClipBar(container: HTMLElement, onSwitch: Callback): void {
  container.innerHTML = '';

  const trackId = getSelectedTrackId();
  const clips = getClipsForTrack(trackId);
  const activeId = getActiveClipId(trackId);

  clips.forEach(clip => {
    const btn = document.createElement('button');
    btn.className = 'clip-btn' + (clip.id === activeId ? ' active' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = clip.name;
    btn.appendChild(nameSpan);

    if (clips.length > 1) {
      const del = document.createElement('span');
      del.className = 'clip-del';
      del.textContent = '×';
      del.addEventListener('click', e => {
        e.stopPropagation();
        removeClip(trackId, clip.id);
        scheduleAutoSave();
        buildClipBar(container, onSwitch);
        onSwitch();
      });
      btn.appendChild(del);
    }

    btn.addEventListener('click', () => {
      if (clip.id === activeId) return;
      selectClip(trackId, clip.id);
      scheduleAutoSave();
      buildClipBar(container, onSwitch);
      onSwitch();
    });

    container.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'clip-add';
  addBtn.textContent = '+ New';
  addBtn.addEventListener('click', () => {
    addClip(trackId);
    scheduleAutoSave();
    buildClipBar(container, onSwitch);
    onSwitch();
  });

  const dupBtn = document.createElement('button');
  dupBtn.className = 'clip-dup';
  dupBtn.textContent = 'Dup';
  dupBtn.title = 'Duplicate active clip';
  dupBtn.addEventListener('click', () => {
    duplicateClip(trackId, activeId);
    scheduleAutoSave();
    buildClipBar(container, onSwitch);
    onSwitch();
  });

  container.appendChild(addBtn);
  container.appendChild(dupBtn);
}
