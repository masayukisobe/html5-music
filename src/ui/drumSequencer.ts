import { CHANNELS, drumPat, seqState } from '../sequencer/state';
import { playDrum, loadDrumSample, hasDrumSample } from '../audio/drumSynth';
import { getCtx } from '../audio/context';
import { scheduleAutoSave } from '../project/io';

export function buildDrumSequencer(container: HTMLElement): void {
  container.innerHTML = '';

  // Step number header
  const header = document.createElement('div');
  header.className = 'step-nums';
  for (let b = 0; b < seqState.steps / 4; b++) {
    const bg = document.createElement('div');
    bg.className = 'beat-nums';
    for (let s = 0; s < 4; s++) {
      const n = document.createElement('div');
      n.className = 'step-num';
      n.textContent = String(b * 4 + s + 1);
      n.style.color = s === 0 ? '#58a6ff' : '#30363d';
      bg.appendChild(n);
    }
    header.appendChild(bg);
    if (b < seqState.steps / 4 - 1) {
      const sp = document.createElement('div'); sp.style.width = '5px';
      header.appendChild(sp);
    }
  }
  container.appendChild(header);

  CHANNELS.forEach(ch => {
    const row = document.createElement('div');
    row.className = 'seq-channel';

    const label = document.createElement('div');
    label.className = 'ch-label';
    label.textContent = ch.label;
    label.style.color = ch.color;
    row.appendChild(label);

    const beatsWrap = document.createElement('div');
    beatsWrap.className = 'beats-wrap';

    for (let b = 0; b < seqState.steps / 4; b++) {
      const beatGrp = document.createElement('div');
      beatGrp.className = 'beat-group';
      for (let s = 0; s < 4; s++) {
        const idx = b * 4 + s;
        const btn = document.createElement('div');
        btn.className = 'step-btn';
        btn.dataset['step'] = String(idx);
        btn.dataset['ch'] = ch.id;
        if (drumPat[ch.id][idx]) {
          btn.classList.add('on');
          btn.style.background = ch.color;
          btn.style.boxShadow = `0 0 8px ${ch.color}80`;
        }
        btn.addEventListener('click', () => {
          getCtx();
          const on = !drumPat[ch.id][idx];
          drumPat[ch.id][idx] = on ? 1 : 0;
          btn.classList.toggle('on', on);
          btn.style.background = on ? ch.color : '';
          btn.style.boxShadow = on ? `0 0 8px ${ch.color}80` : '';
          if (on) playDrum(ch.id, getCtx().currentTime + 0.01);
          scheduleAutoSave();
        });
        beatGrp.appendChild(btn);
      }
      beatsWrap.appendChild(beatGrp);
      if (b < seqState.steps / 4 - 1) {
        const sp = document.createElement('div'); sp.style.width = '5px';
        beatsWrap.appendChild(sp);
      }
    }
    row.appendChild(beatsWrap);

    // Controls
    const ctrl = document.createElement('div');
    ctrl.className = 'ch-controls';

    const clrBtn = document.createElement('button');
    clrBtn.className = 'btn-sm'; clrBtn.textContent = 'CL'; clrBtn.title = 'Clear';
    clrBtn.addEventListener('click', () => {
      drumPat[ch.id].fill(0);
      beatsWrap.querySelectorAll<HTMLElement>('.step-btn').forEach(b => {
        b.classList.remove('on'); b.style.background = ''; b.style.boxShadow = '';
      });
      scheduleAutoSave();
    });
    ctrl.appendChild(clrBtn);

    const fileIn = document.createElement('input');
    fileIn.type = 'file'; fileIn.accept = '.wav,.mp3,.ogg,.flac'; fileIn.style.display = 'none';
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files?.[0]; if (!f) return;
      await loadDrumSample(ch.id, f);
      wavBtn.textContent = '🎵 WAV'; wavBtn.classList.add('loaded'); wavBtn.title = f.name;
    });

    const wavBtn = document.createElement('button');
    wavBtn.className = 'btn-sm'; wavBtn.textContent = '📂 WAV'; wavBtn.title = 'Load WAV';
    if (hasDrumSample(ch.id)) { wavBtn.textContent = '🎵 WAV'; wavBtn.classList.add('loaded'); }
    wavBtn.addEventListener('click', () => fileIn.click());
    ctrl.appendChild(fileIn); ctrl.appendChild(wavBtn);
    row.appendChild(ctrl);
    container.appendChild(row);
  });
}

export function updateDrumPlayhead(activeStep: number): void {
  document.querySelectorAll<HTMLElement>('.step-btn.playhead').forEach(el => el.classList.remove('playhead'));
  if (activeStep >= 0) {
    document.querySelectorAll<HTMLElement>(`.step-btn[data-step="${activeStep}"]`).forEach(el => el.classList.add('playhead'));
  }
}
