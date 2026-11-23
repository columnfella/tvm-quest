'use client';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useCourse } from '@/lib/course';
import { sfx } from '@/lib/sound';
import { Asset } from './ui';

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

/**
 * Pops the course coach (course.json → "coach") in from the corner with a random line.
 * Change `trigger` to a new number to make him speak; 0 means stay hidden.
 */
export default function Coach({ trigger, placement = 'lesson' }: { trigger: number; placement?: 'lesson' | 'results' }) {
  const { coach } = useCourse();
  const [line, setLine] = useState<string | null>(null);
  const last = useRef(-1);

  useEffect(() => {
    if (!coach || !trigger) return;
    let i = Math.floor(Math.random() * coach.lines.length);
    if (coach.lines.length > 1 && i === last.current) i = (i + 1) % coach.lines.length;
    last.current = i;
    setLine(coach.lines[i]);
    sfx.coin();
    const id = setTimeout(() => setLine(null), 3200);
    return () => clearTimeout(id);
  }, [trigger, coach]);

  if (!coach) return null;
  return (
    <AnimatePresence>
      {line && (
        <m.div
          key={trigger}
          className={`coach coach-${placement}`}
          initial={{ x: -260, rotate: -12, opacity: 0 }}
          animate={{ x: 0, rotate: 0, opacity: 1 }}
          exit={{ x: -260, rotate: -8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          onClick={() => setLine(null)}
          role="status"
        >
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
          <m.div className="coach-bubble" initial={{ scale: 0, originX: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.15 }}>
            {line}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
