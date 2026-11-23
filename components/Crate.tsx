'use client';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '@/lib/sound';
import { Asset } from './ui';

export type CrateTier = 'common' | 'rare' | 'epic' | 'legendary';
export type Loot = { icon: string; amount: number; label: string; rare?: boolean };

export const TIER_NAME: Record<CrateTier, string> = { common: 'Common Drop', rare: 'Rare Drop', epic: 'Epic Drop', legendary: 'Legendary Drop' };
// face, side/top shade, emblem
const TIER_COL: Record<CrateTier, [string, string, string]> = {
  common: ['#40c4ff', '#1e88e5', '#ffffff'],
  rare: ['#43e97b', '#16a34a', '#fff27a'],
  epic: ['#c084fc', '#7c3aed', '#ffd60a'],
  legendary: ['#ffd60a', '#f59e0b', '#ff4fa3'],
};

function CrateArt({ tier, open }: { tier: CrateTier; open: boolean }) {
  const [face, shade, emblem] = TIER_COL[tier];
  const K = '#120a2a';
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden style={{ overflow: 'visible' }}>
      {open && (
        <motion.g initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          <path d="M60 78 L40 10 L75 60 L90 0 L105 60 L140 10 L120 78 Z" fill={emblem} opacity="0.85" />
        </motion.g>
      )}
      {/* body: front face + right side, slight perspective */}
      <path d="M30 80 L130 80 L130 168 L30 168 Z" fill={face} stroke={K} strokeWidth="6" strokeLinejoin="round" />
      <path d="M130 80 L156 64 L156 150 L130 168 Z" fill={shade} stroke={K} strokeWidth="6" strokeLinejoin="round" />
      <path d="M38 88 L122 88" stroke="rgba(255,255,255,0.55)" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 150 L130 150" stroke="rgba(0,0,0,0.18)" strokeWidth="10" />
      {/* emblem: bolt */}
      <path d="M86 96 L66 130 L80 130 L72 158 L98 120 L84 120 L92 96 Z" fill={emblem} stroke={K} strokeWidth="5" strokeLinejoin="round" />
      {/* lid */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}
        initial={false}
        animate={open ? { rotate: -32, y: -46, x: -18 } : { rotate: 0, y: 0, x: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 10 }}
      >
        <path d="M22 62 L134 62 L134 84 L22 84 Z" fill={face} stroke={K} strokeWidth="6" strokeLinejoin="round" />
        <path d="M22 62 L50 44 L162 44 L134 62 Z" fill={shade} stroke={K} strokeWidth="6" strokeLinejoin="round" />
        <path d="M134 62 L162 44 L162 66 L134 84 Z" fill={shade} stroke={K} strokeWidth="6" strokeLinejoin="round" />
        <path d="M30 70 L126 70" stroke="rgba(255,255,255,0.6)" strokeWidth="5" strokeLinecap="round" />
      </motion.g>
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
      confetti({ particleCount: tier === 'legendary' ? 170 : 90, spread: 85, startVelocity: 40, origin: { y: 0.45 }, colors: ['#ffd60a', '#ffffff', '#ff4fa3', '#22c3ee', '#a855f7'], disableForReducedMotion: true });
    } catch { /* noop */ }
    onOpen?.();
  };

  return (
    <div className="chest-stage">
      <motion.button
        className="chest-btn"
        onClick={doOpen}
        aria-label={open ? TIER_NAME[tier] : `Open the ${TIER_NAME[tier]}`}
        initial={{ y: -280, rotate: 20, scale: 0.5 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 12, delay: 0.25 }}
        whileTap={!open ? { scaleX: 1.14, scaleY: 0.86 } : undefined}
      >
        <motion.div animate={ctl}>
          <motion.div animate={!open ? { y: [0, -8, 0] } : { y: 0 }} transition={!open ? { repeat: Infinity, duration: 1.1, ease: 'easeInOut' } : undefined}>
            <CrateArt tier={tier} open={open} />
          </motion.div>
        </motion.div>
      </motion.button>
      <span className={`chest-label tier-${tier}`}>{TIER_NAME[tier]}</span>
      {!open && (
        <motion.span className="chest-tap" animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}>
          TAP TO OPEN!
        </motion.span>
      )}
      {open && (
        <div className="loot">
          {loot.map((l, i) => (
            <motion.div
              key={l.label}
              className={`loot-card ${l.rare ? 'rare' : ''}`}
              initial={{ y: -90, scale: 0, rotate: -25, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotate: i % 2 ? 3 : -3, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 13, delay: 0.15 + i * 0.22 }}
              onAnimationStart={() => setTimeout(() => sfx.coin(), 150 + i * 220)}
            >
              <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ delay: 0.5 + i * 0.22, duration: 0.5 }}>
                <Asset name={l.icon} size={46} />
              </motion.span>
              <b>+{l.amount}</b>
              <small>{l.label}</small>
            </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>{flash && <motion.div className="flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />}</AnimatePresence>
    </div>
  );
}
