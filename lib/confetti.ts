'use client';
// One shared confetti canvas whose drawing runs in a Web Worker (OffscreenCanvas) when the browser
// supports it, so bursts never block taps or scrolling on the main thread.
import confettiLib from 'canvas-confetti';

let shoot: confettiLib.CreateTypes | null = null;

export default function confetti(opts: confettiLib.Options) {
  try {
    if (!shoot) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80';
      document.body.appendChild(canvas);
      shoot = confettiLib.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
    }
    void shoot(opts);
  } catch { /* confetti is decoration only */ }
}
