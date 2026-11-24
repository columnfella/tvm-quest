'use client';
import { AnimatePresence, m } from 'framer-motion';
import { Check as CheckIcon, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { filtered, onlyNumber } from '@/lib/input';
import { numberMatches, parseNumber, type Check } from '@/lib/learn';
import { sfx } from '@/lib/sound';
import { Btn } from '../ui';
import { Expand } from './kit';

/** Per-question record. firstTry: was the very first attempt right (null = not attempted yet). */
export type CheckResult = { attempts: number; solved: boolean; firstTry: boolean | null };

type Feedback = { ok: boolean; msg?: ReactNode } | null;

function NumberInput({ unit, value, onChange, onEnter, disabled }: { unit?: string; value: string; onChange: (v: string) => void; onEnter: () => void; disabled: boolean }) {
  return (
    <div className={`num-in ${unit === '%' ? 'pct' : ''}`}>
      {unit === '$' && <span className="num-unit">$</span>}
      <input
        inputMode="decimal"
        autoComplete="off"
        aria-label="Your answer"
        placeholder={unit === '%' ? 'e.g. 9.5' : 'e.g. 41.07'}
        value={value}
        disabled={disabled}
        onChange={filtered(onlyNumber, onChange)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
      />
      {unit === '%' && <span className="num-unit">%</span>}
    </div>
  );
}

function OneCheck({ check, result, onResult }: { check: Check; result: CheckResult; onResult: (r: CheckResult) => void }) {
  // a solved question shows its answer again when you come back to it
  const [pick, setPick] = useState<number | null>(result.solved && check.kind === 'mcq' ? check.answer : null);
  const [text, setText] = useState(result.solved && check.kind === 'number' ? String(check.answer) : '');
  const [fb, setFb] = useState<Feedback>(result.solved ? { ok: true } : null);
  const [reveal, setReveal] = useState(false);
  const [round, setRound] = useState(0); // remounts custom checks on retry

  const grade = (ok: boolean, msg?: ReactNode) => {
    const first = result.attempts === 0;
    onResult({ attempts: result.attempts + 1, solved: result.solved || ok, firstTry: first ? ok : result.firstTry });
    setFb({ ok, msg });
    if (ok) sfx.correct(); else sfx.wrong();
    if (!ok && result.attempts >= 1) setReveal(true); // second miss: show the full working
  };

  const submit = () => {
    if (fb) return;
    if (check.kind === 'mcq') {
      if (pick === null) return;
      grade(pick === check.answer, pick === check.answer ? undefined : check.why?.[pick]);
    } else if (check.kind === 'number') {
      const x = parseNumber(text);
      if (x === null) { setFb({ ok: false, msg: 'Type a number, e.g. 41.07.' }); return; }
      if (numberMatches(x, check)) return grade(true);
      const trap = check.traps?.find((t) => numberMatches(x, { answer: t.value, unit: check.unit }));
      grade(false, trap?.msg ?? 'Not quite. Check each input and the timing of the cash flows, then try again.');
    }
  };

  const retry = () => { setFb(null); setPick(null); setText(''); setRound((r) => r + 1); };
  const locked = !!fb;

  return (
    <div className="chk">
      <div className="chk-prompt">{check.prompt}</div>

      {check.kind === 'mcq' && (
        <div className="options">
          {check.choices.map((c, i) => {
            const state = fb ? (i === check.answer && fb.ok ? 'right' : i === pick && !fb.ok ? 'bad' : 'dim') : pick === i ? 'sel' : '';
            return (
              <button key={i} className={`opt ${state}`} disabled={locked} onClick={() => { setPick(i); sfx.tap(); }}>
                <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>
      )}
      {check.kind === 'number' && <NumberInput unit={check.unit} value={text} onChange={setText} onEnter={submit} disabled={locked} />}
      {check.kind === 'custom' && <div key={round}>{check.render({ submit: (ok, msg) => !locked && grade(ok, msg), locked })}</div>}

      <AnimatePresence mode="wait">
        {fb && (
          <m.div key={fb.ok ? 'ok' : 'no'} className={`chk-fb ${fb.ok ? 'ok' : 'no'}`} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} role="status">
            <div className="chk-fb-head">
              {fb.ok ? <CheckIcon size={22} strokeWidth={4} /> : <X size={22} strokeWidth={4} />}
              <b>{fb.ok ? (result.firstTry ? 'Correct!' : 'Correct, on a retry') : 'Not yet'}</b>
            </div>
            {fb.msg && <div className="chk-fb-msg">{fb.msg}</div>}
            {(fb.ok || reveal) && <div className="chk-explain">{check.explain}</div>}
            {(fb.ok || reveal) && check.solution && <Expand title="Step-by-step solution" defaultOpen={!fb.ok}>{check.solution}</Expand>}
          </m.div>
        )}
      </AnimatePresence>

      <div className="chk-actions">
        {!fb && check.kind !== 'custom' && (
          <Btn variant="primary" onClick={submit} disabled={check.kind === 'mcq' ? pick === null : !text.trim()}>Check</Btn>
        )}
        {fb && !fb.ok && (
          <>
            <Btn variant="gold" onClick={retry}><RotateCcw size={18} /> Try again</Btn>
            {!reveal && <button className="link-btn dark" onClick={() => setReveal(true)}>Show the explanation</button>}
          </>
        )}
      </div>
    </div>
  );
}

/** One question at a time, with dots to jump between them. Every question must be solved (retries allowed). */
export default function Assessment({ checks, results, onResult }: { checks: Check[]; results: Record<string, CheckResult>; onResult: (id: string, r: CheckResult) => void }) {
  const firstOpen = Math.max(0, checks.findIndex((c) => !results[c.id]?.solved));
  const [i, setI] = useState(firstOpen);
  const top = useRef<HTMLDivElement>(null);
  const empty: CheckResult = { attempts: 0, solved: false, firstTry: null };
  const cur = checks[i];
  const res = results[cur.id] ?? empty;
  const solved = checks.filter((c) => results[c.id]?.solved).length;
  const nextOpen = checks.findIndex((c, j) => j > i && !results[c.id]?.solved);
  const anyOpen = checks.findIndex((c) => !results[c.id]?.solved);

  useEffect(() => { top.current?.scrollIntoView({ block: 'nearest' }); }, [i]);

  return (
    <div className="assess" ref={top}>
      <div className="assess-top">
        <span className="assess-count">Question {i + 1} of {checks.length}</span>
        <div className="assess-dots" role="tablist" aria-label="Questions">
          {checks.map((c, j) => {
            const r = results[c.id];
            const cls = r?.solved ? (r.firstTry ? 'ok' : 'retry') : r?.attempts ? 'no' : '';
            return <button key={c.id} role="tab" aria-selected={j === i} aria-label={`Question ${j + 1}`} className={`dot ${cls} ${j === i ? 'cur' : ''}`} onClick={() => setI(j)} />;
          })}
        </div>
        <span className="assess-count">{solved}/{checks.length} solved</span>
      </div>

      <AnimatePresence mode="wait">
        <m.div key={cur.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.18 }}>
          <OneCheck check={cur} result={res} onResult={(r) => onResult(cur.id, r)} />
        </m.div>
      </AnimatePresence>

      {res.solved && (
        <div className="assess-next">
          {nextOpen >= 0 ? (
            <Btn variant="blue" onClick={() => setI(nextOpen)}>Next question</Btn>
          ) : anyOpen >= 0 ? (
            <Btn variant="blue" onClick={() => setI(anyOpen)}>Back to question {anyOpen + 1}</Btn>
          ) : (
            <p className="assess-done">All {checks.length} solved. Finish the lesson below.</p>
          )}
        </div>
      )}
    </div>
  );
}
