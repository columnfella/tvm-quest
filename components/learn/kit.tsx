'use client';
// Building blocks for hand-written interactive lessons. All optional: a lesson can use any React it likes.
import { m } from 'framer-motion';
import { ChevronDown, Lightbulb, TriangleAlert, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** Stacked fraction for formulas: <Frac n="D₁" d="r − g" />. */
export function Frac({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="frac" role="math">
      <span className="frac-n">{n}</span>
      <span className="frac-d">{d}</span>
    </span>
  );
}

/** A displayed formula on its own line. `note` appears underneath in plain words. */
export function Formula({ children, note, big }: { children: ReactNode; note?: ReactNode; big?: boolean }) {
  return (
    <div className={`fx ${big ? 'big' : ''}`}>
      <div className="fx-math">{children}</div>
      {note && <div className="fx-note">{note}</div>}
    </div>
  );
}

/** Variable glossary under a formula. */
export function Vars({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="vars">
      {rows.map(([sym, meaning], i) => (
        <div key={i}>
          <dt>{sym}</dt>
          <dd>{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Callout({ tone = 'tip', title, children }: { tone?: 'tip' | 'warn' | 'key'; title?: ReactNode; children: ReactNode }) {
  const Icon = tone === 'warn' ? TriangleAlert : tone === 'key' ? Sparkles : Lightbulb;
  return (
    <div className={`callout ${tone}`}>
      <Icon size={20} strokeWidth={2.6} aria-hidden />
      <div>
        {title && <b>{title}</b>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** A heading + body block inside a lesson stage. */
export function Block({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <section className="lblock">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

/** Numbered worked example. Each step is one line of reasoning. */
export function Worked({ title, steps, result }: { title: ReactNode; steps: ReactNode[]; result?: ReactNode }) {
  return (
    <div className="worked">
      <b className="worked-title">{title}</b>
      <ol>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {result && <div className="worked-result">{result}</div>}
    </div>
  );
}

/** Collapsible extra (used by the template for derivations, usable anywhere). */
export function Expand({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={`expand ${open ? 'open' : ''}`}>
      <button className="expand-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <ChevronDown size={20} strokeWidth={3} aria-hidden />
      </button>
      {open && <div className="expand-body" id={id}>{children}</div>}
    </div>
  );
}

/** Card that frames an interactive visual. `tryThis` lists guided things to try. */
export function Viz({ title, children, tryThis, caption }: { title: ReactNode; children: ReactNode; tryThis?: ReactNode[]; caption?: ReactNode }) {
  return (
    <div className="viz">
      <div className="viz-head"><h3>{title}</h3></div>
      <div className="viz-body">{children}</div>
      {caption && <div className="viz-caption">{caption}</div>}
      {tryThis && tryThis.length > 0 && (
        <div className="viz-try">
          <b>Try this</b>
          <ul>{tryThis.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/** Labelled range slider with a formatted readout. Works with touch. */
export function Slider({ label, value, min, max, step, onChange, format, hint }: {
  label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; hint?: ReactNode;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{format(value)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** Small readout chip: label on top, value below. */
export function Stat({ label, value, tone = 'plain', sub }: { label: ReactNode; value: ReactNode; tone?: 'plain' | 'gold' | 'green' | 'red' | 'blue' | 'purple'; sub?: ReactNode }) {
  return (
    <div className={`lstat ${tone}`}>
      <small>{label}</small>
      <b>{value}</b>
      {sub && <em>{sub}</em>}
    </div>
  );
}

/** Segmented toggle. */
export function Seg<T extends string | number>({ options, value, onChange, label }: { options: { v: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg lseg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Row of preset buttons that load a scenario into a visual. */
export function Presets({ items }: { items: { label: string; onClick: () => void; active?: boolean }[] }) {
  return (
    <div className="presets">
      {items.map((p) => <button key={p.label} className={p.active ? 'on' : ''} onClick={p.onClick}>{p.label}</button>)}
    </div>
  );
}

/** Linear scale helper for hand-drawn SVG charts. */
export const scale = (d0: number, d1: number, r0: number, r1: number) => (x: number) => r0 + ((x - d0) / (d1 - d0 || 1)) * (r1 - r0);

/** Inline maths (italic serif): <M>P<sub>0</sub></M>. */
export function M({ children }: { children: ReactNode }) {
  return <span className="m">{children}</span>;
}

/** Animated SVG bar between two pixel heights (base → top). Uses attrY: on SVG, framer's `y` would be a transform. */
export function SvgBar({ x, width, base, top, fill, stroke = 'var(--k)', strokeWidth = 1.5, dash, label, delay = 0 }: {
  x: number; width: number; base: number; top: number; fill: string; stroke?: string; strokeWidth?: number; dash?: string; label?: string; delay?: number;
}) {
  const yTop = Math.min(base, top);
  return (
    <m.rect
      x={x}
      width={Math.max(0, width)}
      rx={2}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      initial={false}
      animate={{ attrY: yTop, height: Math.max(0, Math.abs(base - top)) }}
      transition={{ duration: 0.28, ease: 'easeOut', delay }}
    >
      {label && <title>{label}</title>}
    </m.rect>
  );
}

// ---------- SplitBar ----------

export type SplitSegment = {
  value: number; // share of the bar (any unit; segments are scaled to their total)
  label: string; // e.g. "Dividends $16.46"
  color: string; // segment background
  ink?: string; // text colour on that background (default: dark outline colour, readable on yellow/green)
};

const FONT_MAX = 13;
const FONT_MIN = 10;
const PAD = 12; // horizontal padding inside a segment
let canvas: HTMLCanvasElement | null = null;
function textWidth(text: string, px: number, family: string) {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * px * 0.6;
  ctx.font = `900 ${px}px ${family}`;
  return ctx.measureText(text).width;
}

/**
 * A bar split into labelled parts. Each label shrinks (13 px down to 10 px) to fit its part; a label that
 * still doesn't fit is shown under the bar next to a colour chip, so no number is ever hidden.
 */
export function SplitBar({ segments, label }: { segments: SplitSegment[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [family, setFamily] = useState('sans-serif');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setFamily(getComputedStyle(el).fontFamily || 'sans-serif');
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  const parts = segments.map((s) => {
    const share = Math.max(0, s.value) / total;
    const room = share * width - PAD;
    let size: number | null = null;
    if (width > 0 && share > 0) {
      for (let px = FONT_MAX; px >= FONT_MIN; px -= 0.5) {
        if (textWidth(s.label, px, family) <= room) { size = px; break; }
      }
    }
    return { ...s, share, size };
  });
  const outside = width > 0 ? parts.filter((p) => p.size === null) : [];

  return (
    <div className="split">
      <div className="split-bar" ref={ref} role="img" aria-label={`${label}: ${segments.map((s) => s.label).join(', ')}`}>
        {parts.map((p, i) => (
          <div key={i} style={{ width: `${p.share * 100}%`, background: p.color, color: p.ink ?? 'var(--k)', fontSize: p.size ?? undefined }}>
            {p.size !== null && p.label}
          </div>
        ))}
      </div>
      <div className="split-out" aria-hidden>
        {outside.map((p, i) => (
          <span key={i}><i style={{ background: p.color }} />{p.label}</span>
        ))}
      </div>
    </div>
  );
}
