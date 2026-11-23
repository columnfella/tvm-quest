'use client';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '@/lib/sound';
import { Asset } from './ui';

export type ChestTier = 'wood' | 'silver' | 'gold' | 'magic';
export type Loot = { icon: string; amount: number; label: string; rare?: boolean };

export const TIER_NAME: Record<ChestTier, string> = { wood: 'Wooden Chest', silver: 'Silver Chest', gold: 'Golden Chest', magic: 'Magic Chest' };
const TIER_COL: Record<ChestTier, [string, string, string]> = {
  // body, trim, glow
  wood: ['#b8743a', '#7b8798', '#ffd27a'],
  silver: ['#7d8db8', '#e6ecff', '#d6e4ff'],
  gold: ['#e8a10f', '#fff07a', '#fff3a0'],
  magic: ['#8a3ff0', '#ffd34d', '#e3b8ff'],
};

function ChestArt({ tier, open }: { tier: ChestTier; open: boolean }) {
  const [body, trim, glow] = TIER_COL[tier];
  const N = '#16204a';
  return (
    <svg width="190" height="170" viewBox="0 0 190 170" aria-hidden style={{ overflow: 'visible' }}>
      {open && <ellipse cx="95" cy="70" rx="70" ry="26" fill={glow} opacity="0.9" />}
      {/* body */}
      <g>
        <rect x="22" y="72" width="146" height="84" rx="12" fill={body} stroke={N} strokeWidth="5" />
        <rect x="22" y="72" width="146" height="20" rx="6" fill="rgba(255,255,255,0.22)" />
        <rect x="22" y="138" width="146" height="18" rx="8" fill="rgba(0,0,0,0.18)" />
        <rect x="34" y="72" width="16" height="84" fill={trim} stroke={N} strokeWidth="4" />
        <rect x="140" y="72" width="16" height="84" fill={trim} stroke={N} strokeWidth="4" />
        <rect x="80" y="84" width="30" height="34" rx="6" fill={trim} stroke={N} strokeWidth="4" />
        <circle cx="95" cy="98" r="5" fill={N} />
        <rect x="93" y="98" width="4" height="10" fill={N} />
      </g>
      {/* lid */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}
        initial={false}
        animate={open ? { rotate: -24, y: -30, x: -4 } : { rotate: 0, y: 0, x: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 11 }}
      >
        <path d="M22 76 V52 Q22 22 95 22 Q168 22 168 52 V76 Z" fill={body} stroke={N} strokeWidth="5" strokeLinejoin="round" />
        <path d="M30 50 Q34 30 95 30 Q156 30 160 50" stroke="rgba(255,255,255,0.4)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M34 76 V44 Q36 30 50 27 V76 Z" fill={trim} stroke={N} strokeWidth="4" strokeLinejoin="round" />
        <path d="M156 76 V44 Q154 30 140 27 V76 Z" fill={trim} stroke={N} strokeWidth="4" strokeLinejoin="round" />
        {tier === 'magic' && <path d="M95 34 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2z" fill="#ffd34d" stroke={N} strokeWidth="3" strokeLinejoin="round" />}
      </motion.g>
    </svg>
  );
}

export default function Chest({ tier, loot, onOpen }: { tier: ChestTier; loot: Loot[]; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const ctl = useAnimationControls();

  const doOpen = async () => {
    if (open) return;
    sfx.tap();
    await ctl.start({ rotate: [0, -8, 8, -10, 10, -6, 0], scale: [1, 1.05, 1.08, 1.12, 1.08, 1.15, 1], transition: { duration: 0.55 } });
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    setOpen(true);
    sfx.chest();
    try {
      confetti({ particleCount: tier === 'magic' ? 160 : 90, spread: 80, startVelocity: 38, origin: { y: 0.42 }, colors: ['#ffcc1f', '#ffffff', '#a45cff', '#1fa7ff'], disableForReducedMotion: true });
    } catch { /* noop */ }
    onOpen?.();
  };

  return (
    <div className="chest-stage">
      <motion.button
        className="chest-btn"
        onClick={doOpen}
        aria-label={open ? TIER_NAME[tier] : `Open the ${TIER_NAME[tier]}`}
        initial={{ y: -260, scale: 0.6 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 13, delay: 0.25 }}
        whileTap={!open ? { scaleX: 1.12, scaleY: 0.88 } : undefined}
      >
        <motion.div animate={ctl}>
          <motion.div animate={!open ? { y: [0, -6, 0], rotate: [0, -2, 2, 0] } : { y: 0 }} transition={!open ? { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : undefined}>
            <ChestArt tier={tier} open={open} />
          </motion.div>
        </motion.div>
      </motion.button>
      <span className="chest-label">{TIER_NAME[tier]}</span>
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
              animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 14, delay: 0.15 + i * 0.22 }}
              onAnimationStart={() => setTimeout(() => sfx.coin(), 150 + i * 220)}
            >
              <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ delay: 0.5 + i * 0.22, duration: 0.5 }}>
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
