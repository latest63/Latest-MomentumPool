let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Crisp game-style click/tick sound */
export function playSelect() {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // — Click layer: high-frequency tick —
    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.type = 'square';
    tick.frequency.setValueAtTime(1800, now);
    tick.frequency.exponentialRampToValueAtTime(600, now + 0.04);
    tickGain.gain.setValueAtTime(0.12, now);
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    tick.connect(tickGain);
    tickGain.connect(ctx.destination);

    // — Thud layer: low-frequency punch —
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(200, now);
    thud.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    thudGain.gain.setValueAtTime(0.2, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);

    tick.start(now);
    tick.stop(now + 0.04);
    thud.start(now);
    thud.stop(now + 0.06);
  } catch { /* audio not available */ }
}
