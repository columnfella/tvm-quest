'use client';
import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useCourse } from '@/lib/course';
import { levelInfo, type Achievement, type Game } from '@/lib/store';
import { sfx } from '@/lib/sound';
import { AVATARS } from '@/lib/avatars';
import { NAME_MAX, validateName } from '@/lib/username';
import { LinkDevice } from './Link';
import { Asset, Bar, Btn, Modal } from './ui';

type G = Game;

/** Change your name; progress, rank and badges stay. `required`: the site owner asked for a new name. */
export function RenamePanel({ open, onClose, g, required }: { open: boolean; onClose: () => void; g: G; required?: boolean }) {
  const [name, setName] = useState('');
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(''); setServerErr(null); } }, [open]);
  const localErr = name.trim() ? validateName(name) : null;
  const err = localErr ?? serverErr;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || localErr || !name.trim()) return;
    setBusy(true);
    const r = await g.rename(name);
    setBusy(false);
    if (r) { setServerErr(r); sfx.wrong(); } else { sfx.complete(); onClose(); }
  };
  return (
    <Modal open={open} onClose={onClose} title={required ? 'Pick a new name' : 'Change your name'}>
      <form className="center-col" onSubmit={save} style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <p className="small">{required ? <>Your name was changed to <b>{g.profile?.name}</b> for now. Choose a proper one: your XP, stars and badges all stay.</> : <>Your XP, stars, badges and rank stay the same.</>}</p>
        <input className={`name-input ${err ? 'bad' : ''}`} value={name} maxLength={NAME_MAX} autoComplete="off" spellCheck={false} placeholder="New name" aria-label="New name" autoFocus
          onChange={(e) => { setName(e.target.value.replace(/s/g, '_')); setServerErr(null); }} />
        <p className={`name-hint ${err ? 'bad' : ''}`}>{err ?? '3–16 letters, numbers or _.'}</p>
        <Btn type="submit" variant="gold" block disabled={busy || !!localErr || !name.trim()}>{busy ? 'Saving…' : 'Save name'}</Btn>
        <Btn type="button" variant="ghost" block onClick={onClose}>{required ? 'Later' : 'Cancel'}</Btn>
      </form>
    </Modal>
  );
}

export function ProfilePanel({ open, onClose, g, onRename }: { open: boolean; onClose: () => void; g: G; onRename: () => void }) {
  const course = useCourse();
  const s = g.state;
  const lv = levelInfo(s.xp);
  const acc = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 0;
  const lessonsDone = Object.values(s.lessons).filter((l) => l.done).length;
  const totalStars = Object.values(s.lessons).reduce((a, l) => a + l.stars, 0);
  const [picking, setPicking] = useState(false);
  return (
    <Modal open={open} onClose={() => { setPicking(false); onClose(); }} title="Your profile" wide>
      <div className="profile-head">
        <button className="avatar-opt on" style={{ width: 92, flex: 'none' }} onClick={() => setPicking((v) => !v)} title="Change avatar">
          <Asset name={g.profile?.avatar ?? course.mascot} size={72} />
        </button>
        <div style={{ flex: 1 }}>
          <h3>{g.profile?.name} · Level {lv.level} <button className="link-btn dark rename-link" onClick={onRename}>Change name</button></h3>
          <Bar value={lv.into / lv.span} color="var(--yellow)" />
          <p className="muted small">{lv.span - lv.into} XP to level {lv.level + 1}</p>
        </div>
      </div>
      {picking && (
        <div className="avatar-grid" style={{ marginBottom: 16 }}>
          {AVATARS.map((a) => (
            <button key={a} className={`avatar-opt ${g.profile?.avatar === a ? 'on' : ''}`} onClick={() => { g.setAvatar(a); sfx.tap(); setPicking(false); }}>
              <Asset name={a} size={44} />
            </button>
          ))}
        </div>
      )}
      <div className="profile-stats">
        {[
          ['high_voltage_3d.png', s.xp, 'Total XP'],
          ['fire_3d.png', s.streak, 'Day streak'],
          ['star_3d.png', totalStars, 'Stars'],
          ['books_3d.png', lessonsDone, 'Lessons'],
          ['hundred_points_3d.png', `${acc}%`, 'Accuracy'],
          ['rocket_3d.png', s.stats.bestCombo, 'Best combo'],
        ].map(([icon, v, l]) => (
          <div key={l as string} className="pstat">
            <Asset name={icon as string} size={30} />
            <b>{v}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>
      <LinkDevice g={g} />
      <h3 className="badges-title">Badges · {g.achievements.filter((a) => s.achievements.includes(a.id)).length}/{g.achievements.length}</h3>
      <div className="badges">
        {g.achievements.map((a) => {
          const has = s.achievements.includes(a.id);
          return (
            <div key={a.id} className={`badge ${has ? 'has' : ''}`} title={a.desc}>
              <Asset name={has ? a.icon : 'locked_3d.png'} size={44} />
              <b>{a.name}</b>
              <small>{a.desc}</small>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        <small>{desc}</small>
      </span>
      <button role="switch" aria-checked={on} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
        <span />
      </button>
    </label>
  );
}

export function SettingsPanel({ open, onClose, g }: { open: boolean; onClose: () => void; g: G }) {
  const course = useCourse();
  const s = g.state.settings;
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<typeof s>) => g.update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  return (
    <Modal open={open} onClose={() => { setConfirm(false); onClose(); }} title="Settings">
      <Toggle on={s.sound} onChange={(v) => set({ sound: v })} label="Sound effects" desc="Chimes, buzzes and fanfares" />
      <div className="toggle-row">
        <span><b>Daily goal</b><small>XP per day</small></span>
        <div className="seg">
          {[30, 50, 100, 200].map((n) => (
            <button key={n} className={g.state.dailyGoal === n ? 'on' : ''} onClick={() => g.update((st) => ({ ...st, dailyGoal: n }))}>{n}</button>
          ))}
        </div>
      </div>
      <div className="danger-zone">
        {!confirm ? (
          <Btn variant="ghost" block onClick={() => setConfirm(true)}>Reset all progress</Btn>
        ) : (
          <div className="center-col">
            <p>This wipes your XP, gems, stars, badges and mistake list (your name stays).</p>
            <Btn variant="danger" block onClick={() => { g.reset(); setConfirm(false); onClose(); }}>Yes, reset everything</Btn>
            <Btn variant="ghost" block onClick={() => setConfirm(false)}>Cancel</Btn>
          </div>
        )}
      </div>
      {course.issues.length > 0 && (
        <details className="issues">
          <summary>{course.issues.length} content warning{course.issues.length === 1 ? '' : 's'}</summary>
          <ul>{course.issues.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </details>
      )}
      <p className="small muted credits">
        {course.credits ? <>{course.credits} </> : null}3D icons: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">Microsoft Fluent Emoji</a> (MIT). UI icons: <a href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a> (ISC). Fonts: Lilita One &amp; Nunito (OFL).
      </p>
    </Modal>
  );
}

export function BadgeToast({ badge, onDone }: { badge: Achievement | null; onDone: () => void }) {
  useEffect(() => {
    if (!badge) return;
    sfx.unlock();
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [badge, onDone]);
  return (
    <AnimatePresence>
      {badge && (
        <m.div key={badge.id} className="toast" initial={{ y: 120, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 16 }} onClick={onDone}>
          <m.span animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.8 }}>
            <Asset name={badge.icon} size={48} />
          </m.span>
          <span>
            <small>Badge unlocked</small>
            <b>{badge.name}</b>
            <em>{badge.desc}</em>
          </span>
        </m.div>
      )}
    </AnimatePresence>
  );
}
