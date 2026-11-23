'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { AVATARS } from '@/lib/avatars';
import { useCourse } from '@/lib/course';
import { sfx } from '@/lib/sound';
import { NAME_MAX, validateName } from '@/lib/username';
import { SeasonTimer } from './Season';
import { Asset, Btn } from './ui';

export default function Onboarding({ wiped, register }: { wiped: boolean; register: (name: string, avatar: string) => Promise<string | null> }) {
  const course = useCourse();
  const words = course.title.split(' ');
  const last = words.length > 1 ? words.pop() : null;
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localErr = name.trim() ? validateName(name) : null;
  const err = localErr ?? serverErr;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || localErr || !name.trim()) return;
    setBusy(true);
    setServerErr(null);
    const r = await register(name, avatar);
    setBusy(false);
    if (r) { setServerErr(r); sfx.wrong(); } else sfx.complete();
  };

  return (
    <div className="onboard">
      <form className="onboard-card" onSubmit={submit}>
        <motion.div className="logo" initial={{ scale: 0.3, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
          <motion.div animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }} transition={{ repeat: Infinity, duration: 2.6 }}>
            <Asset name={avatar} size={110} alt="" />
          </motion.div>
          <h1 className="sc">{words.join(' ')}{last && <> <em>{last}</em></>}</h1>
          {course.subtitle && <p className="logo-sub">{course.subtitle}</p>}
          <p>{course.tagline || 'Practice, climb the board.'} New season every Monday.</p>
        </motion.div>

        {wiped && (
          <motion.div className="wiped-banner" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Asset name="party_popper_3d.png" size={40} />
            <span><b>A new season has started!</b>Last week&apos;s leaderboard was wiped. Pick a name and climb again.</span>
          </motion.div>
        )}

        <motion.div className="card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.15 }}>
          <label className="field-label" htmlFor="uname">Choose your name</label>
          <input
            id="uname"
            className={`name-input ${err ? 'bad' : ''}`}
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. StudyBeast"
            onChange={(e) => { setName(e.target.value.replace(/\s/g, '_')); setServerErr(null); }}
            autoFocus
          />
          <p className={`name-hint ${err ? 'bad' : ''}`}>{err ?? '3–16 letters, numbers or _. No password: this browser remembers you until the season ends.'}</p>

          <span className="field-label">Pick your avatar</span>
          <div className="avatar-grid" role="radiogroup" aria-label="Avatar">
            {AVATARS.map((a, i) => (
              <motion.button
                type="button"
                key={a}
                role="radio"
                aria-checked={avatar === a}
                className={`avatar-opt ${avatar === a ? 'on' : ''}`}
                onClick={() => { setAvatar(a); sfx.tap(); }}
                initial={{ scale: 0 }}
                animate={{ scale: avatar === a ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 14, delay: avatar === a ? 0 : 0.2 + i * 0.025 }}
                whileTap={{ scale: 0.9 }}
              >
                <Asset name={a} size={52} alt={a.replace(/_3d\.png$/, '').replace(/_/g, ' ')} />
              </motion.button>
            ))}
          </div>

          <Btn type="submit" variant="gold" block disabled={busy || !!localErr || !name.trim()}>
            {busy ? 'Joining…' : 'Play!'}
          </Btn>
        </motion.div>

        <SeasonTimer />
      </form>
    </div>
  );
}
