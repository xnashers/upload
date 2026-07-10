// Web Audio API sound effects — no external files needed
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function ensureReady() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

['touchstart', 'click', 'keydown'].forEach(ev => {
  document.addEventListener(ev, ensureReady, { once: true });
});

function tone(freq, dur, type = 'sine', vol = 0.10, delay = 0) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch (_) { /* silent */ }
}

export function playSound(type) {
  try {
    ensureReady();
    switch (type) {
      case 'plant':
        tone(520, 0.12, 'sine', 0.10);
        tone(680, 0.15, 'sine', 0.08, 0.06);
        break;
      case 'harvest':
        tone(523, 0.12, 'sine', 0.10);
        tone(659, 0.12, 'sine', 0.10, 0.06);
        tone(784, 0.15, 'sine', 0.10, 0.12);
        tone(1047, 0.25, 'sine', 0.08, 0.18);
        tone(1319, 0.20, 'sine', 0.05, 0.25);
        break;
      case 'buy':
        tone(1200, 0.08, 'square', 0.05);
        tone(1600, 0.08, 'square', 0.04, 0.05);
        tone(2000, 0.15, 'sine', 0.07, 0.10);
        break;
      case 'sell':
        tone(800, 0.08, 'triangle', 0.06);
        tone(1000, 0.08, 'triangle', 0.05, 0.06);
        tone(1200, 0.08, 'triangle', 0.05, 0.12);
        tone(1600, 0.20, 'sine', 0.08, 0.18);
        break;
      case 'click':
        tone(400, 0.06, 'sine', 0.05);
        break;
      case 'error':
        tone(200, 0.15, 'sawtooth', 0.05);
        tone(180, 0.20, 'sawtooth', 0.04, 0.10);
        break;
      case 'levelup':
        tone(523, 0.15, 'sine', 0.08);
        tone(659, 0.15, 'sine', 0.08, 0.10);
        tone(784, 0.15, 'sine', 0.08, 0.20);
        tone(1047, 0.30, 'sine', 0.10, 0.30);
        break;
      case 'weather':
        tone(300, 0.30, 'sine', 0.05);
        tone(450, 0.30, 'sine', 0.04, 0.10);
        tone(600, 0.20, 'sine', 0.03, 0.20);
        break;
      case 'peso':
        tone(880, 0.08, 'sine', 0.06);
        tone(1100, 0.08, 'sine', 0.05, 0.05);
        tone(1320, 0.15, 'sine', 0.07, 0.10);
        break;
      case 'buzzer':
        tone(180, 0.25, 'sawtooth', 0.08);
        tone(140, 0.30, 'sawtooth', 0.06, 0.12);
        tone(100, 0.20, 'square', 0.04, 0.25);
        break;
    }
  } catch (_) { /* silent */ }
}
