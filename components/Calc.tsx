'use client';
// Built-in calculator dock: Basic (typed expressions), TVM (BA II Plus style) and Cash flows (NPV, IRR).
// It is not a modal: it sits beside the question on wide screens and as a bottom sheet on phones, keeps its
// state while closed, and can drop its last result straight into a lesson's answer box.
import { Check, ClipboardCopy, CornerDownLeft, Delete, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { evaluate, irr, npv, show, tidy, type CashFlow } from '@/lib/calc';
import { sfx } from '@/lib/sound';
import { filtered, onlyArithmetic, onlyDigits, onlyExpression } from '@/lib/input';
import { solve, type TvmKey } from '@/lib/tvm';

type Tab = 'basic' | 'tvm' | 'cf';
const TABS: { id: Tab; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'tvm', label: 'TVM' },
  { id: 'cf', label: 'Cash flows' },
];
type Result = { value: number; label: string };

/** Every calculator field accepts a number or an expression (e.g. "4*12" or "2.42*1.05/0.07"). */
const read = (x: string) => (x.trim() === '' ? undefined : evaluate(x) ?? NaN);
const ANSWER = '.num-in input:not(:disabled)';

export default function CalcDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('basic');
  const [result, setResult] = useState<Result | null>(null);
  const [toast, setToast] = useState('');
  const [hasField, setHasField] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Keys typed in the calculator must not reach the lesson's window-level shortcuts (1–5 pick an option,
  // Enter checks). React's handler runs at the document, after the fields' own onKeyDown, and stopping
  // there keeps the event from bubbling on to window.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    e.stopPropagation();
  };

  // on wide screens the page makes room for the dock; on phones the page gets extra space to scroll above the sheet
  useEffect(() => {
    document.body.classList.toggle('calc-open', open);
    return () => document.body.classList.remove('calc-open');
  }, [open]);

  // is there an answer box to fill? (a lesson question that wants a number)
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const look = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setHasField(!!document.querySelector(ANSWER))); };
    look();
    const mo = new MutationObserver(look);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, [open]);

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 1600); };
  const publish = useCallback((value: number, label: string) => setResult({ value, label }), []);
  const plain = (v: number) => String(Math.round(tidy(v) * 1e4) / 1e4);

  const useAnswer = () => {
    if (!result) return;
    const el = document.querySelector<HTMLInputElement>(ANSWER);
    if (!el) return;
    // set the value the way a keystroke would, so React's controlled input sees it
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, plain(result.value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    sfx.tap();
    flash('Put in your answer box');
  };
  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(plain(result.value)); flash('Copied'); } catch { flash('Copy failed'); }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={root} className={`calc-dock ${open ? 'open' : ''}`} role="dialog" aria-label="Calculator" aria-hidden={!open} inert={!open} onKeyDown={onKeyDown}>
      <div className="calc-head">
        <div className="calc-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <button className="calc-x" onClick={onClose} aria-label="Close the calculator" title="Close (your numbers stay)"><X size={20} strokeWidth={3} /></button>
      </div>

      <div className="calc-body">
        <div hidden={tab !== 'basic'}><Basic onResult={publish} /></div>
        <div hidden={tab !== 'tvm'}><Tvm onResult={publish} /></div>
        <div hidden={tab !== 'cf'}><Flows onResult={publish} /></div>
      </div>

      <div className="calc-out">
        {result ? (
          <>
            <div className="calc-out-v"><small>{result.label}</small><b>{show(result.value)}</b></div>
            {hasField && <button className="cpt" onClick={useAnswer} title="Put this number in the answer box"><Check size={16} strokeWidth={3} /> Use</button>}
            <button className="calc-icon" onClick={copy} aria-label="Copy the result" title="Copy"><ClipboardCopy size={18} /></button>
          </>
        ) : <span className="muted small">Results show here{hasField ? ', ready to drop into your answer' : ''}.</span>}
        {toast && <span className="calc-toast" role="status">{toast}</span>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Basic ---------------- */

const KEYPAD: { k: string; label?: string; cls?: string; aria?: string }[] = [
  { k: 'AC', cls: 'fn' }, { k: '(', cls: 'op' }, { k: ')', cls: 'op' }, { k: '%', cls: 'op' }, { k: 'DEL', cls: 'fn', aria: 'Delete' },
  { k: '7' }, { k: '8' }, { k: '9' }, { k: '÷', cls: 'op' }, { k: '^', label: 'xʸ', cls: 'op', aria: 'Power' },
  { k: '4' }, { k: '5' }, { k: '6' }, { k: '×', cls: 'op' }, { k: '√(', label: '√', cls: 'op', aria: 'Square root' },
  { k: '1' }, { k: '2' }, { k: '3' }, { k: '−', cls: 'op' }, { k: 'ln(', label: 'ln', cls: 'op' },
  { k: '0' }, { k: '.' }, { k: 'ans', label: 'Ans', cls: 'fn' }, { k: '+', cls: 'op' }, { k: '=', cls: 'eq', aria: 'Equals' },
];

function Basic({ onResult }: { onResult: (v: number, label: string) => void }) {
  const [expr, setExpr] = useState('');
  const [ans, setAns] = useState(0);
  const [hist, setHist] = useState<{ e: string; v: number }[]>([]);
  const [err, setErr] = useState(false);
  const [touch, setTouch] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setTouch(window.matchMedia('(pointer: coarse)').matches); }, []);

  const preview = expr.trim() && !/^-?[\d.,]+$/.test(expr.trim()) ? evaluate(expr, ans) : null;

  const insert = (text: string) => {
    const el = input.current;
    const a = el?.selectionStart ?? expr.length;
    const b = el?.selectionEnd ?? expr.length;
    const next = expr.slice(0, a) + text + expr.slice(b);
    setExpr(next);
    setErr(false);
    requestAnimationFrame(() => { if (el) { el.setSelectionRange(a + text.length, a + text.length); if (!touch) el.focus(); } });
  };
  const del = () => {
    const el = input.current;
    const a = el?.selectionStart ?? expr.length;
    const b = el?.selectionEnd ?? expr.length;
    if (a !== b) { setExpr(expr.slice(0, a) + expr.slice(b)); requestAnimationFrame(() => el?.setSelectionRange(a, a)); return; }
    if (a === 0) return;
    setExpr(expr.slice(0, a - 1) + expr.slice(a));
    requestAnimationFrame(() => el?.setSelectionRange(a - 1, a - 1));
  };
  const equals = () => {
    const v = evaluate(expr, ans);
    if (v === null) { setErr(!!expr.trim()); if (expr.trim()) sfx.wrong(); return; }
    const t = tidy(v);
    setHist((h) => [{ e: expr, v: t }, ...h].slice(0, 4));
    setAns(t);
    setExpr(String(t));
    setErr(false);
    onResult(t, expr.length > 28 ? 'Result' : `${expr} =`);
    sfx.tap();
    requestAnimationFrame(() => input.current?.setSelectionRange(String(t).length, String(t).length));
  };
  const press = (k: string) => {
    if (k === 'AC') { setExpr(''); setErr(false); return; }
    if (k === 'DEL') return del();
    if (k === '=') return equals();
    insert(k);
  };

  return (
    <div className="basic">
      {hist.length > 0 && (
        <ul className="calc-hist" aria-label="Recent calculations">
          {hist.map((h, i) => (
            <li key={i}><button onClick={() => insert(String(h.v))} title="Insert this number"><span>{h.e} =</span><b>{show(h.v)}</b></button></li>
          ))}
        </ul>
      )}
      <div className={`calc-screen ${err ? 'err' : ''}`}>
        <input
          ref={input}
          value={expr}
          inputMode={touch ? 'none' : 'decimal'}
          autoComplete="off"
          spellCheck={false}
          aria-label="Expression"
          placeholder="e.g. 1.89 / (0.12 − 0.05)"
          onChange={filtered(onlyExpression, (v) => { setExpr(v); setErr(false); })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals(); } }}
        />
        <div className="calc-preview" aria-live="polite">{err ? "Can't read that. Check the brackets and operators." : preview !== null ? `= ${show(preview)}` : ' '}</div>
      </div>
      <div className="keypad">
        {KEYPAD.map((b) => (
          <button key={b.k} className={`key ${b.cls ?? ''}`} onClick={() => press(b.k)} aria-label={b.aria ?? b.label ?? b.k}>
            {b.k === 'DEL' ? <Delete size={20} /> : b.k === '=' ? <CornerDownLeft size={20} strokeWidth={3} /> : b.label ?? b.k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- TVM ---------------- */

const TVM_KEYS: { k: TvmKey; label: string }[] = [
  { k: 'N', label: 'N' },
  { k: 'IY', label: 'I/Y %' },
  { k: 'PV', label: 'PV' },
  { k: 'PMT', label: 'PMT' },
  { k: 'FV', label: 'FV' },
];
const EMPTY: Record<TvmKey, string> = { N: '', IY: '', PV: '', PMT: '0', FV: '' };

function Tvm({ onResult }: { onResult: (v: number, label: string) => void }) {
  const [vals, setVals] = useState<Record<TvmKey, string>>(EMPTY);
  const [begin, setBegin] = useState(false);
  const [py, setPy] = useState('1');
  const [msg, setMsg] = useState('');
  const [last, setLast] = useState<TvmKey | null>(null);

  const compute = (k: TvmKey) => {
    const input = { N: read(vals.N), IY: read(vals.IY), PV: read(vals.PV), PMT: read(vals.PMT), FV: read(vals.FV), begin, py: read(py) || 1 };
    const unreadable = TVM_KEYS.filter((x) => x.k !== k && Number.isNaN(input[x.k])).map((x) => x.label);
    if (unreadable.length) { setMsg(`Can't read ${unreadable.join(', ')}.`); return; }
    const missing = TVM_KEYS.filter((x) => x.k !== k && x.k !== 'PMT' && input[x.k] === undefined).map((x) => x.label);
    if (missing.length) { setMsg(`Enter ${missing.join(', ')} first.`); return; }
    const r = solve(k, input);
    if (r === null || !Number.isFinite(r)) { setMsg('No solution. Check your signs: money paid out and money received need opposite signs.'); sfx.wrong(); return; }
    const v = Math.round(r * 10000) / 10000;
    sfx.tap();
    setVals((x) => ({ ...x, [k]: String(v) }));
    setLast(k);
    setMsg('');
    onResult(v, `${TVM_KEYS.find((x) => x.k === k)!.label} =`);
  };

  return (
    <div className="calc">
      {TVM_KEYS.map(({ k, label }) => (
        <div key={k} className={`calc-row ${last === k ? 'hit' : ''}`}>
          <label htmlFor={`tvm-${k}`}>{label}</label>
          <input id={`tvm-${k}`} inputMode="decimal" autoComplete="off" value={vals[k]} onChange={filtered(onlyArithmetic, (x) => { setVals((v) => ({ ...v, [k]: x })); setLast(null); })} onKeyDown={(e) => e.key === 'Enter' && compute(k)} placeholder="0" />
          <button className="cpt" onClick={() => compute(k)}>CPT</button>
        </div>
      ))}
      <div className="calc-opts">
        <div className="seg">
          <button className={!begin ? 'on' : ''} onClick={() => setBegin(false)}>END</button>
          <button className={begin ? 'on' : ''} onClick={() => setBegin(true)}>BGN</button>
        </div>
        <label className="py">P/Y <input inputMode="numeric" value={py} onChange={filtered(onlyDigits, setPy)} aria-label="Payments per year" /></label>
        <button className="link-btn" onClick={() => { setVals(EMPTY); setLast(null); setMsg(''); }}>Clear</button>
      </div>
      {msg && <p className="calc-msg">{msg}</p>}
      <p className="small muted">Fill in four values, then tap CPT on the one you want. Money paid out is negative, money received is positive. With P/Y = 12, I/Y is the annual rate and N is in months. Fields take expressions too, like 4*12.</p>
    </div>
  );
}

/* ---------------- Cash flows ---------------- */

type Row = { amount: string; count: string };

function Flows({ onResult }: { onResult: (v: number, label: string) => void }) {
  const [cf0, setCf0] = useState('');
  const [rows, setRows] = useState<Row[]>([{ amount: '', count: '1' }]);
  const [rate, setRate] = useState('');
  const [out, setOut] = useState<{ npv?: number; irr?: number | null }>({});
  const [msg, setMsg] = useState('');

  const parse = (): { c0: number; flows: CashFlow[] } | null => {
    const c0 = read(cf0) ?? 0;
    const flows: CashFlow[] = [];
    for (const [i, r] of rows.entries()) {
      if (!r.amount.trim()) continue;
      const amount = read(r.amount);
      const count = read(r.count) ?? 1;
      if (amount === undefined || Number.isNaN(amount) || Number.isNaN(count) || count < 1 || count > 999 || !Number.isInteger(count)) {
        setMsg(`Check CF${i + 1}: the amount must be a number and the count a whole number from 1 to 999.`);
        return null;
      }
      flows.push({ amount, count });
    }
    if (Number.isNaN(c0)) { setMsg("Can't read CF0."); return null; }
    if (!flows.length) { setMsg('Enter at least one cash flow after CF0.'); return null; }
    return { c0, flows };
  };
  const doNpv = () => {
    const p = parse();
    if (!p) return;
    const r = read(rate);
    if (r === undefined || Number.isNaN(r)) { setMsg('Enter the discount rate I (in %) first.'); return; }
    const v = Math.round(npv(r, p.c0, p.flows) * 100) / 100;
    setOut((o) => ({ ...o, npv: v }));
    setMsg('');
    sfx.tap();
    onResult(v, 'NPV =');
  };
  const doIrr = () => {
    const p = parse();
    if (!p) return;
    const v = irr(p.c0, p.flows);
    setOut((o) => ({ ...o, irr: v === null ? null : Math.round(v * 10000) / 10000 }));
    if (v === null) { setMsg('No IRR: the cash flows need at least one sign change (money out and money in).'); sfx.wrong(); return; }
    setMsg('');
    sfx.tap();
    onResult(Math.round(v * 10000) / 10000, 'IRR % =');
  };
  const setRow = (i: number, patch: Partial<Row>) => { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); setOut({}); };

  return (
    <div className="calc">
      <div className="calc-row">
        <label htmlFor="cf0">CF0</label>
        <input id="cf0" inputMode="decimal" autoComplete="off" value={cf0} onChange={filtered(onlyArithmetic, (v) => { setCf0(v); setOut({}); })} placeholder="0 (today)" />
        <span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="cf-row">
          <label htmlFor={`cf-${i}`}>CF{i + 1}</label>
          <input id={`cf-${i}`} inputMode="decimal" autoComplete="off" value={r.amount} onChange={filtered(onlyArithmetic, (v) => setRow(i, { amount: v }))} placeholder="amount" />
          <span className="cf-times">×</span>
          <input className="cf-n" inputMode="numeric" autoComplete="off" value={r.count} onChange={filtered(onlyDigits, (v) => setRow(i, { count: v }))} aria-label={`How many times CF${i + 1} repeats`} title="How many years in a row (Fj)" />
          <button className="calc-icon" onClick={() => { setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ amount: '', count: '1' }])); setOut({}); }} aria-label={`Remove CF${i + 1}`}><Trash2 size={16} /></button>
        </div>
      ))}
      <button className="link-btn add-cf" onClick={() => setRows((rs) => [...rs, { amount: '', count: '1' }])} disabled={rows.length >= 30}><Plus size={16} /> Add a cash flow</button>
      <div className="calc-row">
        <label htmlFor="cf-i">I %</label>
        <input id="cf-i" inputMode="decimal" autoComplete="off" value={rate} onChange={filtered(onlyArithmetic, (v) => { setRate(v); setOut((o) => ({ ...o, npv: undefined })); })} onKeyDown={(e) => e.key === 'Enter' && doNpv()} placeholder="e.g. 8" />
        <span />
      </div>
      <div className="cf-cpt">
        <button className="cpt" onClick={doNpv}>NPV</button>
        <button className="cpt" onClick={doIrr}>IRR</button>
        <button className="link-btn" onClick={() => { setCf0(''); setRows([{ amount: '', count: '1' }]); setRate(''); setOut({}); setMsg(''); }}>Clear</button>
      </div>
      {(out.npv !== undefined || typeof out.irr === 'number') && (
        <div className="cf-res">
          {out.npv !== undefined && <span>NPV <b>{show(out.npv)}</b></span>}
          {typeof out.irr === 'number' && <span>IRR <b>{show(out.irr)}%</b></span>}
        </div>
      )}
      {msg && <p className="calc-msg">{msg}</p>}
      <p className="small muted">CF0 is today (a cost is negative); CF1, CF2… arrive at the end of each year. “× 3” repeats a flow three years in a row. For a price, leave CF0 at 0 and NPV gives the present value.</p>
    </div>
  );
}
