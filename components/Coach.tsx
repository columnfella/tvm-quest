'use client';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useCourse, type Coach as CoachT } from '@/lib/course';
import { sfx } from '@/lib/sound';
import { Asset } from './ui';

const SHOW_MS = 3600;

/** Suit collar + tie drawn under the coach's face, so any emoji becomes a "banker". */
function Suit() {
  return (
    <svg className="coach-suit" width="96" height="54" viewBox="0 0 96 54" aria-hidden>
      <path d="M4 54 Q8 18 30 10 L48 30 L66 10 Q88 18 92 54 Z" fill="#1e293b" stroke="#0b1220" strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 10 L48 30 L40 38 L26 16 Z" fill="#f8fafc" stroke="#0b1220" strokeWidth="3" strokeLinejoin="round" />
      <path d="M66 10 L48 30 L56 38 L70 16 Z" fill="#f8fafc" stroke="#0b1220" strokeWidth="3" strokeLinejoin="round" />
      <path d="M43 26 L53 26 L51 32 L56 50 L48 54 L40 50 L45 32 Z" fill="#dc2626" stroke="#0b1220" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="74" cy="34" r="3" fill="#facc15" stroke="#0b1220" strokeWidth="1.5" />
    </svg>
  );
}

/** A transparent cut-out of a person: rises from the corner, raises the glass (a small tilt), sparkle at the glass. */
function Cutout({ coach }: { coach: CoachT }) {
  return (
    <div className="coach-figure cut">
      <m.div
        className="coach-cut-wrap"
        style={{ originX: 0.5, originY: 1 }}
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -4, 1.5, 0] }}
        transition={{ delay: 0.3, duration: 1, ease: 'easeInOut', times: [0, 0.35, 0.7, 1] }}
      >
        <Asset name={coach.image} size={180} alt={coach.name} className="coach-cut" eager />
        <m.span
          className="coach-clink"
          aria-hidden
          initial={{ scale: 0, opacity: 0, rotate: -30 }}
          animate={{ scale: [0, 1.15, 0.9], opacity: [0, 1, 0], rotate: [-30, 0, 15] }}
          transition={{ delay: 0.55, duration: 0.9, ease: 'easeOut', times: [0, 0.4, 1] }}
        >
          <Asset name="sparkles_3d.png" size={34} />
        </m.span>
      </m.div>
    </div>
  );
}

/**
 * Pops the course coach (course.json → "coach") in from the corner with a random line.
 * Change `trigger` to a new number to make him speak; 0 means stay hidden.
 */
export default function Coach({ trigger, placement = 'lesson' }: { trigger: number; placement?: 'lesson' | 'results' }) {
  const { coach } = useCourse();
  const [line, setLine] = useState<string | null>(null);
  const [bottom, setBottom] = useState<number | undefined>(undefined);
  const last = useRef(-1);

  useEffect(() => {
    if (!coach || !trigger) return;
    let i = Math.floor(Math.random() * coach.lines.length);
    if (coach.lines.length > 1 && i === last.current) i = (i + 1) % coach.lines.length;
    last.current = i;
    // a cut-out rises from behind the lesson's bottom bar: the bar hides where the picture is cut off
    const bar = placement === 'lesson' ? document.querySelector('.lesson-foot') : null;
    setBottom(bar ? Math.max(0, bar.getBoundingClientRect().height - 46) : undefined);
    setLine(coach.lines[i]);
    sfx.coin();
    const id = setTimeout(() => setLine(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [trigger, coach, placement]);

  if (!coach) return null;
  const cut = coach.cutout;
  return (
    <AnimatePresence>
      {line && (
        <m.div
          key={trigger}
          className={`coach coach-${placement} ${cut ? 'coach-cutout' : ''}`}
          initial={cut ? { y: 240, opacity: 0 } : { x: -260, rotate: -12, opacity: 0 }}
          animate={cut ? { y: 0, opacity: 1 } : { x: 0, rotate: 0, opacity: 1 }}
          exit={cut ? { y: 240, opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } } : { x: -260, rotate: -8, opacity: 0 }}
          transition={cut ? { type: 'spring', stiffness: 210, damping: 24, mass: 0.9 } : { type: 'spring', stiffness: 320, damping: 18 }}
          style={cut && bottom !== undefined ? { bottom } : undefined}
          onClick={() => setLine(null)}
          role="status"
        >
          {cut ? <Cutout coach={coach} /> : (
            <m.div className="coach-figure" animate={{ rotate: [0, -6, 6, -3, 0], y: [0, -4, 0] }} transition={{ duration: 0.9, delay: 0.2 }}>
              {coach.photo ? (
                <Asset name={coach.image} size={96} alt={coach.name} className="coach-photo" />
              ) : (
                <>
                  <Asset name={coach.image} size={78} alt={coach.name} className="coach-face" />
                  <Suit />
                </>
              )}
              <span className="coach-tag">{coach.name}</span>
            </m.div>
          )}
          <m.div
            className="coach-bubble"
            style={{ originX: 0, originY: 1 }}
            initial={{ scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: cut ? 0.35 : 0.15 }}
          >
            {cut && <small className="coach-name">{coach.name}</small>}
            {line}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
