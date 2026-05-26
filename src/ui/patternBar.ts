import { getAll, currentId, switchTo, addAndSwitch, remove } from '../project/patterns';
import { stop } from '../sequencer/transport';
import { scheduleAutoSave } from '../project/io';

type Callback = () => void;

export function buildPatternBar(container: HTMLElement, onSwitch: Callback): void {
  container.innerHTML = '';

  const patterns = getAll();

  patterns.forEach(pat => {
    const btn = document.createElement('button');
    btn.className = 'pat-btn' + (pat.id === currentId ? ' active' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = pat.name;
    btn.appendChild(nameSpan);

    if (patterns.length > 1) {
      const del = document.createElement('span');
      del.className = 'pat-del';
      del.textContent = '×';
      del.title = 'Delete pattern';
      del.addEventListener('click', e => {
        e.stopPropagation();
        stop();
        remove(pat.id);
        scheduleAutoSave();
        buildPatternBar(container, onSwitch);
        onSwitch();
      });
      btn.appendChild(del);
    }

    btn.addEventListener('click', () => {
      if (pat.id === currentId) return;
      stop();
      switchTo(pat.id);
      scheduleAutoSave();
      buildPatternBar(container, onSwitch);
      onSwitch();
    });

    container.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'pat-add';
  addBtn.textContent = '+ New';
  addBtn.title = 'Add new pattern';
  addBtn.addEventListener('click', () => {
    stop();
    addAndSwitch();
    scheduleAutoSave();
    buildPatternBar(container, onSwitch);
    onSwitch();
  });
  container.appendChild(addBtn);
}
