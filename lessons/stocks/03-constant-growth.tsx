'use client';
// Lesson 3: constant growth (Gordon). The core visual is a race: dividends grow at g while discounting
// shrinks them at r. Each discounted dividend is q = (1+g)/(1+r) times the last; the sum settles only if g < r.
// A second visual shows how violently the price reacts as r approaches g (the slides' Sweet Candy example).
import { useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Presets, Seg, Slider, Stat, SvgBar, Vars, Viz, Worked, scale, SplitBar } from '@/components/learn/kit';
import { gordon, money, pct, pv } from './math';

type Inputs = { amount: number; timing: 'last' | 'next'; g: number; r: number };
const YEARS = 30;

function d1Of(s: Inputs) { return s.timing === 'last' ? s.amount * (1 + s.g) : s.amount; }

function Race({ s, set }: { s: Inputs; set: (p: Partial<Inputs>) => void }) {
  const d1 = d1Of(s);
  const q = (1 + s.g) / (1 + s.r);
  const p0 = gordon(d1, s.r, s.g);
  const pvs = Array.from({ length: YEARS }, (_, i) => pv(d1 * (1 + s.g) ** i, s.r, i + 1));
  const partial = pvs.reduce((a, b) => a + b, 0);
  const W = 640, H = 190, L = 40, B = 24, T = 10;
  const maxY = Math.max(...pvs) * 1.1;
  const x = scale(0.5, YEARS + 0.5, L, W - 6);
  const y = scale(0, maxY, H - B, T);
  const bw = ((W - L) / YEARS) * 0.72;
  const ok = p0 !== null;
  return (
    <Viz
      title="The race: growth vs discounting"
      tryThis={[
        'Push g up toward r: the bars flatten out, and the value explodes.',
        'Push g past r: the bars grow every year and the sum never settles.',
        'Flip between “just paid” and “next year”: the same number gives a different D₁.',
      ]}
      caption={ok
        ? <>Each year’s discounted dividend is <b>q = (1 + g)/(1 + r) = {q.toFixed(4)}</b> times the previous one. Because q &lt; 1 the bars shrink and the total settles at <b>D₁ / (r − g) = {money(d1)} / {pct(s.r - s.g, 1)} = {money(p0)}</b>. The 30 years drawn hold only {pct(partial / p0, 0)} of it; the rest comes from later years.</>
        : <>q = (1 + g)/(1 + r) = <b>{q.toFixed(4)}</b> ≥ 1, so every discounted dividend is at least as big as the last one. The sum never settles: the constant-growth model <b>cannot be used</b> when g ≥ r.</>}
    >
      <Seg label="Which dividend do you know?" value={s.timing} onChange={(timing) => set({ timing })} options={[{ v: 'last', label: 'Just paid (D₀)' }, { v: 'next', label: 'Next year’s (D₁)' }]} />
      <div className="controls">
        <Slider label={s.timing === 'last' ? 'Dividend just paid D₀' : 'Next dividend D₁'} value={s.amount} min={0.2} max={4} step={0.01} onChange={(amount) => set({ amount })} format={(v) => money(v)} />
        <Slider label="Growth rate g" value={s.g} min={-0.05} max={0.16} step={0.0025} onChange={(g) => set({ g })} format={(v) => pct(v, 2)} />
        <Slider label="Required return r" value={s.r} min={0.04} max={0.2} step={0.0025} onChange={(r) => set({ r })} format={(v) => pct(v, 2)} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Present value of each future dividend">
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        {pvs.map((v, i) => <SvgBar key={i} x={x(i + 1) - bw / 2} width={bw} base={H - B} top={y(v)} fill={ok ? 'var(--yellow)' : 'var(--red)'} strokeWidth={1} label={`Year ${i + 1}: PV ${money(v)}`} />)}
        {[1, 10, 20, 30].map((t) => <text key={t} x={x(t)} y={H - 6} textAnchor="middle">yr {t}</text>)}
        <text x={L - 4} y={T + 8} textAnchor="end">{money(maxY / 1.1)}</text>
      </svg>
      <div className="readouts">
        <Stat label="D₁ (next dividend)" value={money(d1)} tone="gold" sub={s.timing === 'last' ? `${money(s.amount)} × (1 + g)` : 'given'} />
        <Stat label="q = (1+g)/(1+r)" value={q.toFixed(4)} tone={ok ? 'green' : 'red'} sub={ok ? 'shrinks: converges' : 'grows: diverges'} />
        <Stat label="P₀ = D₁ / (r − g)" value={ok ? money(p0) : 'n/a'} tone={ok ? 'blue' : 'red'} sub={ok ? `r − g = ${pct(s.r - s.g, 2)}` : 'model invalid'} />
      </div>
      {!ok && (
        <div className="lverdict bad" role="alert">
          {Math.abs(s.r - s.g) < 1e-9
            ? <>r = g makes the denominator zero: D₁ / 0 is undefined.</>
            : <>Plugging in anyway gives {money(d1 / (s.r - s.g))}, a negative “price”. That number is meaningless: the formula assumes r &gt; g.</>}
        </div>
      )}
    </Viz>
  );
}

function Sensitivity({ s, set }: { s: Inputs; set: (p: Partial<Inputs>) => void }) {
  const d1 = d1Of(s);
  const W = 640, H = 220, L = 50, B = 28, T = 12;
  const rMax = 0.2;
  const rLo = s.g + 0.01; // draw down to r − g = 1%
  const yMax = d1 / 0.01;
  const x = scale(s.g - 0.01, rMax, L, W - 8); // starts just below g, so the r = g line is always on the chart (g can be negative)
  const y = scale(0, yMax, H - B, T);
  const n = 80;
  const pts = rLo < rMax
    ? Array.from({ length: n }, (_, i) => { const r = rLo + ((rMax - rLo) * i) / (n - 1); return `${x(r)},${y(d1 / (r - s.g))}`; }).join(' ')
    : '';
  const p0 = gordon(d1, s.r, s.g);
  const dy = p0 ? d1 / p0 : 0;
  const scenario = (r: number) => set({ amount: 0.72, timing: 'next', g: 0.07, r });
  const isSweet = s.amount === 0.72 && s.timing === 'next' && s.g === 0.07;
  return (
    <Viz
      title="How sensitive is the price?"
      tryThis={['Load the Sweet Candy scenarios from the slides and compare r = 10% with r = 8%.', 'Then try r = 7%: the same as g.']}
      caption={<>The price is D₁ divided by a <b>small</b> number (r − g), so small changes in r or g move it a lot. This sensitivity is the constant-growth model’s main weakness.</>}
    >
      <Presets items={[
        { label: 'Sweet Candy, r = 10%', onClick: () => scenario(0.1), active: isSweet && s.r === 0.1 },
        { label: 'r = 8%', onClick: () => scenario(0.08), active: isSweet && s.r === 0.08 },
        { label: 'r = 7%', onClick: () => scenario(0.07), active: isSweet && s.r === 0.07 },
      ]} />
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Price as a function of the required return">
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
        <line x1={x(s.g)} x2={x(s.g)} y1={T} y2={H - B} stroke="var(--red)" strokeWidth={2} strokeDasharray="6 5" />
        {/* label to the right of the line, or to its left when the line is near the right edge */}
        <text x={x(s.g) > W - 190 ? x(s.g) - 6 : x(s.g) + 6} y={T + 12} textAnchor={x(s.g) > W - 190 ? 'end' : 'start'} style={{ fill: 'var(--red-ink)' }} className="lbl">r = g: model breaks</text>
        {pts && <polyline points={pts} fill="none" stroke="var(--purple)" strokeWidth={3} strokeLinejoin="round" />}
        {p0 !== null && s.r <= rMax && p0 <= yMax && (
          <circle cx={x(s.r)} cy={y(p0)} r={8} fill="var(--yellow)" stroke="var(--k)" strokeWidth={2.5} style={{ transition: 'cx .2s, cy .2s' }} />
        )}
        {[0.05, 0.1, 0.15, 0.2].filter((r) => r > s.g - 0.01).map((r) => <text key={r} x={x(r)} y={H - 10} textAnchor="middle">{pct(r, 0)}</text>)}
        <text x={L - 6} y={y(yMax) + 10} textAnchor="end">{money(yMax, 0)}</text>
        <text x={L - 6} y={y(yMax / 2) + 4} textAnchor="end">{money(yMax / 2, 0)}</text>
        <text className="lbl" x={W - 8} y={H - B - 8} textAnchor="end">required return r →</text>
      </svg>
      {p0 !== null && p0 > yMax && <p className="small muted">At r − g = {pct(s.r - s.g, 2)} the price ({money(p0)}) is above this chart’s top.</p>}
      <div className="readouts">
        <Stat label="P₀" value={p0 !== null ? money(p0) : 'n/a'} tone={p0 !== null ? 'blue' : 'red'} />
        <Stat label="Dividend yield D₁/P₀" value={p0 !== null ? pct(dy, 2) : 'n/a'} tone="gold" />
        <Stat label="Capital gains yield = g" value={pct(s.g, 2)} tone="green" />
      </div>
      {p0 !== null && (
        <SplitBar label="Required return split" segments={[
          { value: dy, label: `dividend yield ${pct(dy, 1)}`, color: 'var(--yellow)' },
          { value: s.g, label: `+ g ${pct(s.g, 1)} = r ${pct(s.r, 1)}`, color: 'var(--green)' },
        ]} />
      )}
    </Viz>
  );
}

function Explore() {
  const [s, setS] = useState<Inputs>({ amount: 1.8, timing: 'last', g: 0.05, r: 0.12 });
  const set = (p: Partial<Inputs>) => setS((x) => ({ ...x, ...p }));
  return (
    <>
      <Race s={s} set={set} />
      <Sensitivity s={s} set={set} />
    </>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="Dividends that grow">
        <p>Most healthy firms raise their dividend over time. The <strong>constant-growth model</strong> (also called the <strong>Gordon growth model</strong>) assumes the dividend grows at the same rate g every year, forever: a <strong>growing perpetuity</strong>.</p>
        <p>So D₂ = D₁(1 + g), D₃ = D₁(1 + g)², and so on. Growth pushes every future dividend up, while discounting at r pulls its value today down. Which force wins decides everything.</p>
      </Block>
      <Block title="Three rates, three meanings">
        <ul>
          <li><strong>g</strong>, the dividend growth rate: how fast dividends rise each year (an assumption about the firm).</li>
          <li><strong>r</strong>, the required return: what investors demand for the risk (the discount rate).</li>
          <li><strong>Expected return</strong>, what you’d earn buying at today’s price: dividend yield + capital gain. In equilibrium it equals r (lesson 4).</li>
        </ul>
      </Block>
      <Callout tone="warn" title="The timing trap">
        The formula always needs <b>next year’s</b> dividend, D₁. “Just paid $1.80” is D₀: grow it once to get D₁ = 1.80 × (1 + g). “Will pay $0.72 next year” is already D₁: don’t grow it again.
      </Callout>
    </>
  ),
  explore: <Explore />,
  formula: (
    <>
      <Block title="Constant-growth (Gordon) model">
        <Formula big note="Valid only when r > g."><M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>r − g</M>} /> = <Frac n={<M>D<sub>0</sub>(1 + g)</M>} d={<M>r − g</M>} /></Formula>
        <Vars rows={[
          [<>D<sub>0</sub></>, 'Dividend just paid (already received, not part of the value)'],
          [<>D<sub>1</sub></>, 'Next year’s dividend, the first one the buyer receives'],
          ['g', 'Constant annual growth rate of dividends, forever'],
          ['r', 'Required rate of return; must be greater than g'],
        ]} />
      </Block>
      <Block title="Rearranged: what the price implies">
        <Formula note="Required (or expected) return = dividend yield + capital gains yield."><M>r</M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>P<sub>0</sub></M>} /> + <M>g</M></Formula>
        <Formula note="Under constant growth the price itself grows at g, so the capital gains yield is g."><M>P<sub>t</sub> = P<sub>0</sub>(1 + g)<sup>t</sup></M></Formula>
      </Block>
      <Block title="Assumptions, and when the model cannot be used">
        <ul>
          <li>Dividends grow at one constant rate g <strong>forever</strong>.</li>
          <li>r is constant and <strong>r &gt; g</strong>. If g ≥ r the infinite sum never settles: the formula gives a negative or undefined number, which is not a price.</li>
          <li>Because r − g is small, the estimate is very sensitive to the inputs. Treat it as an estimate, not a fact.</li>
          <li>Firms growing faster than r for a while need the nonconstant model (lesson 5).</li>
        </ul>
      </Block>
      <Block title="Worked examples">
        <Worked title="Perry Motors: just paid $1.80, g = 5%, r = 12%" steps={['D₁ = 1.80 × 1.05 = 1.89', 'P₀ = 1.89 / (0.12 − 0.05) = 1.89 / 0.07']} result="P₀ = $27.00" />
        <Worked title="Sweet Candy: will pay $0.72 next year, g = 7%" steps={['r = 10%: 0.72 / 0.03 = $24.00', 'r = 8%: 0.72 / 0.01 = $72.00 (a 2-point drop in r tripled the price)', 'r = 7%: 0.72 / 0 is undefined, so the model can’t be used']} />
      </Block>
    </>
  ),
  derivation: {
    title: 'Derive D₁ / (r − g) from the geometric series',
    body: (
      <>
        <p>Write out the growing perpetuity:</p>
        <Formula><M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>1+r</M>} /> + <Frac n={<M>D<sub>1</sub>(1+g)</M>} d={<M>(1+r)<sup>2</sup></M>} /> + <Frac n={<M>D<sub>1</sub>(1+g)<sup>2</sup></M>} d={<M>(1+r)<sup>3</sup></M>} /> + …</Formula>
        <p>This is a geometric series with first term <M>a = D<sub>1</sub>/(1+r)</M> and ratio <M>q = (1+g)/(1+r)</M>: the q you watched in the race.</p>
        <p>An infinite geometric series sums to <M>a / (1 − q)</M>, but <strong>only if q &lt; 1</strong>, which means g &lt; r:</p>
        <Formula><M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub>/(1+r)</M>} d={<M>1 − (1+g)/(1+r)</M>} /> = <Frac n={<M>D<sub>1</sub>/(1+r)</M>} d={<M>(r − g)/(1+r)</M>} /> = <Frac n={<M>D<sub>1</sub></M>} d={<M>r − g</M>} /></Formula>
        <p>So r &gt; g isn’t an arbitrary rule: it is the condition for the sum to exist. Set g = 0 and you get back the perpetuity D / r from lesson 2.</p>
      </>
    ),
  },
  checks: [
    {
      id: 'gordon-d0',
      kind: 'number',
      unit: '$',
      prompt: <>A firm <b>just paid</b> a $2.00 dividend. Dividends will grow at <b>6%</b> a year forever, and investors require <b>11%</b>. What is the share worth?</>,
      answer: (2 * 1.06) / 0.05,
      traps: [{ value: 40, msg: '“Just paid” is D₀. The formula needs D₁ = 2.00 × 1.06 = 2.12.' }, { value: 2 / 0.11, msg: 'That ignores growth. Divide D₁ by (r − g), not by r.' }],
      explain: <>D₁ = 2.00 × 1.06 = 2.12, so P₀ = 2.12 / (0.11 − 0.06) = <b>$42.40</b>.</>,
    },
    {
      id: 'gordon-d1',
      kind: 'number',
      unit: '$',
      prompt: <>A firm <b>will pay</b> $1.50 next year. Dividends grow at <b>4%</b> forever and r = <b>9%</b>. What is the share worth?</>,
      answer: 30,
      traps: [{ value: (1.5 * 1.04) / 0.05, msg: '$1.50 is already next year’s dividend (D₁). Growing it again counts a year of growth twice.' }],
      explain: <>D₁ = $1.50 is given, so P₀ = 1.50 / (0.09 − 0.04) = <b>$30.00</b>.</>,
    },
    {
      id: 'invalid',
      kind: 'mcq',
      prompt: <>An analyst expects a dividend of $1.00 next year, growing at <b>8%</b> forever, and uses a required return of <b>7%</b>. What does the constant-growth model say the share is worth?</>,
      choices: ['−$100.00', '$100.00', 'Nothing useful: it requires r > g, so it can’t be applied', '$14.29, using r alone'],
      answer: 2,
      why: ['That is what the formula outputs, but a negative price is meaningless: the formula’s condition r > g is violated.', 'Flipping the sign doesn’t fix it: the infinite sum doesn’t exist when g > r.', undefined, 'Ignoring growth gives a different model, not an answer to this one.'],
      explain: <>With g ≥ r, each discounted dividend is at least as big as the last, so the sum never settles. Use a nonconstant-growth model, or question the inputs: no firm can grow faster than r forever.</>,
    },
    {
      id: 'implied-r',
      kind: 'number',
      unit: '%',
      prompt: <>A stock sells for <b>$40</b>, will pay a <b>$2</b> dividend at the end of the year, and dividends grow at a constant <b>7%</b>. What return do investors require?</>,
      answer: 12,
      traps: [{ value: 5, msg: 'That is only the dividend yield. Add the capital gains yield g.' }, { value: 7, msg: 'That is only the capital gains yield. Add the dividend yield D₁/P₀.' }],
      explain: <>r = D₁/P₀ + g = 2/40 + 0.07 = 0.05 + 0.07 = <b>12%</b> (Black Book Q60, step 1).</>,
    },
    {
      id: 'future-price',
      kind: 'number',
      unit: '$',
      prompt: <>Using the first question (P₀ = $42.40, g = 6%), what should the share sell for <b>5 years from now</b>, if the assumptions hold?</>,
      answer: 42.4 * 1.06 ** 5,
      traps: [{ value: 42.4 * 1.06 ** 6, msg: 'P₅ = P₀(1 + g)⁵. Five years of growth, not six.' }, { value: 42.4 * (1 + 0.06 * 5), msg: 'Growth compounds: use (1.06)⁵, not 1 + 5 × 6%.' }],
      explain: <>Under constant growth the price grows at g: P₅ = 42.40 × 1.06⁵ = 42.40 × 1.3382 = <b>$56.74</b>. (Equivalently P₅ = D₆ / (r − g).)</>,
    },
    {
      id: 'sensitivity',
      kind: 'mcq',
      prompt: <>A stock will pay $1.00 next year with 6% growth forever. Its required return drops from <b>10%</b> to <b>8%</b>. What happens to the price?</>,
      choices: ['It rises about 20%, from $25 to $30', 'It doubles, from $25 to $50', 'It rises 2%, from $25.00 to $25.50', 'It falls, because the firm now earns less'],
      answer: 1,
      why: ['Work it out: 1/(0.10 − 0.06) and 1/(0.08 − 0.06).', undefined, 'The price isn’t linear in r: it depends on 1/(r − g).', 'A lower required return RAISES the value of the same dividends.'],
      explain: <>Before: 1 / 0.04 = $25. After: 1 / 0.02 = $50. Halving (r − g) doubled the price: the model is very sensitive near r = g.</>,
    },
  ],
  takeaways: [
    'P₀ = D₁ / (r − g), with D₁ = D₀(1 + g). Always next year’s dividend on top.',
    'r > g is the condition for the infinite sum to exist; otherwise the model can’t be used.',
    'r = D₁/P₀ + g: dividend yield + capital gains yield, and the price grows at g.',
    'Small changes in r or g swing the price a lot: it is an estimate built on assumptions.',
  ],
};

export default lesson;
