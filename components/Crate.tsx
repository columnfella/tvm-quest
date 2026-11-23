'use client';
import confetti from '@/lib/confetti';
import { AnimatePresence, m, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '@/lib/sound';
import { Asset } from './ui';

export type CrateTier = 'common' | 'rare' | 'epic' | 'legendary';
export type Loot = { icon: string; amount: number; label: string; rare?: boolean };

export const TIER_NAME: Record<CrateTier, string> = { common: 'Silver Vault', rare: 'Emerald Vault', epic: 'Sapphire Vault', legendary: 'Gold Vault' };
// face, side/top shade, emblem
const TIER_COL: Record<CrateTier, [string, string, string]> = {
  common: ['#94a3b8', '#64748b', '#ffffff'],
  rare: ['#34d399', '#059669', '#fff27a'],
  epic: ['#60a5fa', '#2563eb', '#ffd60a'],
  legendary: ['#fcd34d', '#d97706', '#16a34a'],
};

function CrateArt({ tier, open }: { tier: CrateTier; open: boolean }) {
  const [face, shade, emblem] = TIER_COL[tier];
  const K = '#120a2a';
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden style={{ overflow: 'visible' }}>
      {open && (
        <m.g initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          <path d="M60 78 L40 10 L75 60 L90 0 L105 60 L140 10 L120 78 Z" fill={emblem} opacity="0.85" />
        </m.g>
      )}
      {/* body: front face + right side, slight perspective */}
      <path d="M30 80 L130 80 L130 168 L30 168 Z" fill={face} stroke={K} strokeWidth="6" strokeLinejoin="round" />
      <path d="M130 80 L156 64 L156 150 L130 168 Z" fill={shade} stroke={K} strokeWidth="6" strokeLinejoin="round" />
      <path d="M38 88 L122 88" stroke="rgba(255,255,255,0.55)" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 150 L130 150" stroke="rgba(0,0,0,0.18)" strokeWidth="10" />
      {/* emblem: dollar sign */}
      <text x="80" y="152" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontSize="62" fill={emblem} stroke={K} strokeWidth="5" paintOrder="stroke" style={{ letterSpacing: 0 }}>$</text>
      {/* lid */}
      <m.g
        style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}
        initial={false}
        animate={open ? { rotate: -32, y: -46, x: -18 } : { rotate: 0, y: 0, x: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 10 }}
      >
        <path d="M22 62 L134 62 L134 84 L22 84 Z" fill={face} stroke={K} strokeWidth="6" strokeLinejoin="round" />
        <path d="M22 62 L50 44 L162 44 L134 62 Z" fill={shade} stroke={K} strokeWidth="6" strokeLinejoin="round" />
        <path d="M134 62 L162 44 L162 66 L134 84 Z" fill={shade} stroke={K} strokeWidth="6" strokeLinejoin="round" />
        <path d="M30 70 L126 70" stroke="rgba(255,255,255,0.6)" strokeWidth="5" strokeLinecap="round" />
      </m.g>
    </svg>
  );
}

export default function Crate({ tier, loot, onOpen }: { tier: CrateTier; loot: Loot[]; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const ctl = useAnimationControls();

  const doOpen = async () => {
    if (open) return;
    sfx.tap();
    await ctl.start({ rotate: [0, -6, 6, -9, 9, -4, 0], scaleX: [1, 1.08, 0.94, 1.12, 0.92, 1.15, 1], scaleY: [1, 0.92, 1.06, 0.88, 1.08, 0.85, 1], transition: { duration: 0.6 } });
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
    setOpen(true);
    sfx.chest();
    try {
      confetti({ particleCount: tier === 'legendary' ? 170 : 90, spread: 85, startVelocity: 40, origin: { y: 0.45 }, colors: ['#facc15', '#ffffff', '#22c55e', '#16a34a', '#fde68a'], disableForReducedMotion: true });
    } catch { /* noop */ }
    onOpen?.();
  };

  return (
    <div className="chest-stage">
      <m.button
        className="chest-btn"
        onClick={doOpen}
        aria-label={open ? TIER_NAME[tier] : `Open the ${TIER_NAME[tier]}`}
        initial={{ y: -280, rotate: 20, scale: 0.5 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 12, delay: 0.25 }}
        whileTap={!open ? { scaleX: 1.14, scaleY: 0.86 } : undefined}
      >
        <m.div animate={ctl}>
          <div className={open ? '' : 'loop-hop'}>
            <CrateArt tier={tier} open={open} />
          </div>
        </m.div>
      </m.button>
      <span className={`chest-label tier-${tier}`}>{TIER_NAME[tier]}</span>
      {!open && (
        <span className="chest-tap loop-pulse">TAP TO OPEN!</span>
      )}
      {open && (
        <div className="loot">
          {loot.map((l, i) => (
            <m.div
              key={l.label}
              className={`loot-card ${l.rare ? 'rare' : ''}`}
              initial={{ y: -90, scale: 0, rotate: -25, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotate: i % 2 ? 3 : -3, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 13, delay: 0.15 + i * 0.22 }}
              onAnimationStart={() => setTimeout(() => sfx.coin(), 150 + i * 220)}
            >
              <m.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ delay: 0.5 + i * 0.22, duration: 0.5 }}>
                <Asset name={l.icon} size={46} />
              </m.span>
              <b>+{l.amount}</b>
              <small>{l.label}</small>
            </m.div>
          ))}
        </div>
      )}
      <AnimatePresence>{flash && <m.div className="flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />}</AnimatePresence>
    </div>
  );
}
