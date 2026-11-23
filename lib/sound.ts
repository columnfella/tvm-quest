// Tiny synthesized sound effects (Web Audio) — no audio files needed.
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.08),
  correct: () => {
    tone(784, 0, 0.14, 'triangle');
    tone(1175, 0.09, 0.22, 'triangle');
  },
  wrong: () => {
    tone(196, 0, 0.18, 'sawtooth', 0.09);
    tone(147, 0.12, 0.28, 'sawtooth', 0.09);
  },
  combo: () => [880, 1109, 1319, 1760].forEach((f, i) => tone(f, i * 0.06, 0.14, 'square', 0.06)),
  complete: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.14)),
  unlock: () => [1047, 1568].forEach((f, i) => tone(f, i * 0.08, 0.25, 'sine', 0.12)),
  match: () => tone(988, 0, 0.12, 'sine', 0.12),
};
