'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, levelInfo, type Achievement, type useGame } from '@/lib/store';
import { solve, type TvmKey } from '@/lib/tvm';
import { sfx } from '@/lib/sound';
import { AVATARS } from '@/lib/avatars';
import { Asset, Bar, Btn, Modal } from './ui';

type G = ReturnType<typeof useGame>;

export function ProfilePanel({ open, onClose, g }: { open: boolean; onClose: () => void; g: G }) {
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
          <Asset name={g.profile?.avatar ?? 'pig_face_3d.png'} size={72} />
        </button>
        <div style={{ flex: 1 }}>
          <h3>{g.profile?.name} · Level {lv.level}</h3>
          <Bar value={lv.into / lv.span} color="var(--gold)" />
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
      <h3 className="badges-title">Badges · {s.achievements.length}/{ACHIEVEMENTS.length}</h3>
      <div className="badges">
        {ACHIEVEMENTS.map((a) => {
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
  const s = g.state.settings;
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<typeof s>) => g.update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  return (
    <Modal open={open} onClose={() => { setConfirm(false); onClose(); }} title="Settings">
      <Toggle on={s.sound} onChange={(v) => set({ sound: v })} label="Sound effects" desc="Chimes, buzzes and fanfares" />
      <Toggle on={s.freePlay} onChange={(v) => set({ freePlay: v })} label="Free play" desc="Unlock every lesson, e.g. to jump straight to Tough" />
      <Toggle on={s.unlimitedHearts} onChange={(v) => set({ unlimitedHearts: v })} label="Unlimited hearts" desc="Exam-cram mode: mistakes never end a lesson" />
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
            <p>This wipes your XP, gems, stars and badges (your name stays).</p>
            <Btn variant="danger" block onClick={() => { g.reset(); setConfirm(false); onClose(); }}>Yes, reset everything</Btn>
            <Btn variant="ghost" block onClick={() => setConfirm(false)}>Cancel</Btn>
          </div>
        )}
      </div>
      <p className="small muted credits">
        3D icons: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">Microsoft Fluent Emoji</a> (MIT). UI icons: <a href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a> (ISC). Questions: Black Book, Time Value of Money chapter. Fonts: Lilita One &amp; Nunito (OFL).
      </p>
    </Modal>
  );
}

const KEYS: { k: TvmKey; label: string }[] = [
  { k: 'N', label: 'N' },
  { k: 'IY', label: 'I/Y %' },
  { k: 'PV', label: 'PV' },
  { k: 'PMT', label: 'PMT' },
  { k: 'FV', label: 'FV' },
];

export function CalculatorPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [vals, setVals] = useState<Record<TvmKey, string>>({ N: '', IY: '', PV: '', PMT: '0', FV: '' });
  const [begin, setBegin] = useState(false);
  const [py, setPy] = useState('1');
  const [msg, setMsg] = useState('');
  const [last, setLast] = useState<TvmKey | null>(null);

  const compute = (k: TvmKey) => {
    const num = (x: string) => (x.trim() === '' ? undefined : Number(x.replace(/,/g, '')));
    const input = { N: num(vals.N), IY: num(vals.IY), PV: num(vals.PV), PMT: num(vals.PMT), FV: num(vals.FV), begin, py: Number(py) || 1 };
    const missing = KEYS.filter((x) => x.k !== k && x.k !== 'PMT' && input[x.k] === undefined).map((x) => x.label);
    if (missing.length) { setMsg(`Enter ${missing.join(', ')} first.`); return; }
    const r = solve(k, input);
    if (r === null || !isFinite(r)) { setMsg('No solution. Check your signs: money in and money out need opposite signs.'); return; }
    sfx.tap();
    setVals((v) => ({ ...v, [k]: String(Math.round(r * 10000) / 10000) }));
    setLast(k);
    setMsg('');
  };

  return (
    <Modal open={open} onClose={onClose} title="TVM calculator">
      <p className="muted small">Works like a BA II Plus. Use opposite signs for money paid and money received. Type the known values, then tap CPT next to the one you want.</p>
      <div className="calc">
        {KEYS.map(({ k, label }) => (
          <div key={k} className={`calc-row ${last === k ? 'hit' : ''}`}>
            <label htmlFor={`tvm-${k}`}>{label}</label>
            <input id={`tvm-${k}`} inputMode="decimal" value={vals[k]} onChange={(e) => { setVals((v) => ({ ...v, [k]: e.target.value })); setLast(null); }} placeholder="0" />
            <button className="cpt" onClick={() => compute(k)}>CPT</button>
          </div>
        ))}
        <div className="calc-opts">
          <div className="seg">
            <button className={!begin ? 'on' : ''} onClick={() => setBegin(false)}>END</button>
            <button className={begin ? 'on' : ''} onClick={() => setBegin(true)}>BGN</button>
          </div>
          <label className="py">P/Y <input inputMode="numeric" value={py} onChange={(e) => setPy(e.target.value)} aria-label="Payments per year" /></label>
          <button className="link-btn" onClick={() => { setVals({ N: '', IY: '', PV: '', PMT: '0', FV: '' }); setLast(null); setMsg(''); }}>Clear</button>
        </div>
        {msg && <p className="calc-msg">{msg}</p>}
        <p className="small muted">With P/Y = 12, enter I/Y as the annual nominal rate and N in months.</p>
      </div>
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
        <motion.div key={badge.id} className="toast" initial={{ y: 120, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 16 }} onClick={onDone}>
          <motion.span animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.8 }}>
            <Asset name={badge.icon} size={48} />
          </motion.span>
          <span>
            <small>Badge unlocked</small>
            <b>{badge.name}</b>
            <em>{badge.desc}</em>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
