let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function getMaster(): GainNode {
  getCtx();
  return master!;
}

export function setMasterVolume(v: number): void {
  getMaster().gain.value = v / 100;
}
