import { seqState, synthParams } from '../sequencer/state';
import { play, stop, setBpm, setSwing } from '../sequencer/transport';
import { setMasterVolume } from '../audio/context';
import { setSampleBuffer } from '../audio/pianoSynth';
import { getCtx } from '../audio/context';
import { scheduleAutoSave, exportToFile, importFromFile } from '../project/io';

export function initTransportBar(onImport: () => void): void {
  document.getElementById('btn-play')!.addEventListener('click', () => {
    play();
    document.getElementById('btn-play')!.classList.add('active');
  });
  document.getElementById('btn-stop')!.addEventListener('click', () => {
    stop();
    document.getElementById('btn-play')!.classList.remove('active');
    document.getElementById('step-indicator')!.textContent = `STEP 1 / ${seqState.steps}`;
  });
  document.getElementById('bpm-range')!.addEventListener('input', e => {
    const v = +(e.target as HTMLInputElement).value;
    setBpm(v);
    document.getElementById('bpm-val')!.textContent = String(v);
    scheduleAutoSave();
  });
  document.getElementById('vol-range')!.addEventListener('input', e => {
    setMasterVolume(+(e.target as HTMLInputElement).value);
  });
  document.getElementById('swing-range')!.addEventListener('input', e => {
    setSwing(+(e.target as HTMLInputElement).value);
    scheduleAutoSave();
  });

  document.getElementById('btn-export')!.addEventListener('click', exportToFile);
  document.getElementById('btn-import')!.addEventListener('click', () => {
    document.getElementById('import-file')!.click();
  });
  document.getElementById('import-file')!.addEventListener('change', e => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    importFromFile(f, onImport);
    (e.target as HTMLInputElement).value = '';
  });
}

export function initSynthControls(): void {
  document.getElementById('osc-type')!.addEventListener('change', e => {
    synthParams.wave = (e.target as HTMLSelectElement).value as OscillatorType;
    scheduleAutoSave();
  });
  document.querySelectorAll<HTMLInputElement>('[data-synth]').forEach(input => {
    input.addEventListener('input', () => {
      const key = input.dataset['synth'] as keyof typeof synthParams;
      const val = +input.value;
      // @ts-expect-error dynamic assignment
      synthParams[key] = key === 'sustain' ? val / 100 : val;
      const display = input.nextElementSibling as HTMLElement;
      if (display) display.textContent = input.dataset['unit'] ? `${input.value}${input.dataset['unit']}` : input.value;
      scheduleAutoSave();
    });
  });
  document.getElementById('piano-file')!.addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    const ctx = getCtx();
    const buf = await ctx.decodeAudioData(await f.arrayBuffer());
    setSampleBuffer(buf);
    document.getElementById('piano-sample-name')!.textContent = f.name;
    const useCheck = document.getElementById('use-sample') as HTMLInputElement;
    useCheck.checked = true; synthParams.useSample = true;
    scheduleAutoSave();
  });
  document.getElementById('use-sample')!.addEventListener('change', e => {
    synthParams.useSample = (e.target as HTMLInputElement).checked;
    scheduleAutoSave();
  });
  document.getElementById('oct-shift-sel')!.addEventListener('change', e => {
    synthParams.octShift = +(e.target as HTMLSelectElement).value;
    scheduleAutoSave();
  });
  document.getElementById('btn-load-piano-wav')!.addEventListener('click', () => {
    document.getElementById('piano-file')!.click();
  });
}

export function refreshSynthControls(): void {
  (document.getElementById('osc-type') as HTMLSelectElement).value = synthParams.wave;
  document.querySelectorAll<HTMLInputElement>('[data-synth]').forEach(input => {
    const key = input.dataset['synth']!;
    const raw = synthParams[key as keyof typeof synthParams] as number;
    const display = key === 'sustain' ? Math.round(raw * 100) : raw;
    input.value = String(display);
    const sp = input.nextElementSibling as HTMLElement | null;
    if (sp) sp.textContent = input.dataset['unit'] ? `${display}${input.dataset['unit']}` : String(display);
  });
  (document.getElementById('oct-shift-sel') as HTMLSelectElement).value = String(synthParams.octShift);
  (document.getElementById('use-sample') as HTMLInputElement).checked = synthParams.useSample;
}
