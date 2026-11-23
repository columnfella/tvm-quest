'use client';
// Lesson 2: zero growth = perpetuity. Shows why an endless stream of equal dividends has a finite value D / r,
// then uses the same formula both ways for preferred stock (value from r, and the yield implied by a price).
import { useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Seg, Slider, Stat, SvgBar, Vars, Viz, Worked, scale } from '@/components/learn/kit';
import { money, pct, perpetuity, pv } from './math';

const SHOW = 50; // years drawn

function PerpetuityBuilder() {
  const [d, setD] = useState(1.8);
  const [r, setR] = useState(0.12);
  const [n, setN] = useState(10);
  const value = perpetuity(d, r)!;
  let partial = 0;
  for (let t = 1; t <= n; t++) partial += pv(d, r, t);
  const W = 640, H = 200, L = 30, B = 24, T = 10;
  const x = scale(0.5, SHOW + 0.5, L, W - 6);
  const y = scale(0, d * 1.1, H - B, T);
  const bw = ((W - L) / SHOW) * 0.72;
  return (
    <Viz
      title="Building a perpetuity, one year at a time"
      tryThis={[
        'Move “years counted” to 30, then 60: the total creeps toward D / r but never passes it.',
        'Raise r: the PV bars fade faster, so the far future matters even less and the value drops.',
        'Set r to 2%: distant dividends still count a lot, so the value is huge.',
      ]}
      caption={<>The first <b>{n}</b> years already give <b>{pct(partial / value, 0)}</b> of the value. Dividends far in the future are worth almost nothing today, which is why an endless stream still has a finite price: <b>{money(d, 2)} / {pct(r, 1)} = {money(value)}</b>.</>}
    >
      <div className="controls">
        <Slider label="Dividend every year D" value={d} min={0.5} max={5} step={0.1} onChange={setD} format={(v) => money(v)} />
        <Slider label="Required return r" value={r} min={0.02} max={0.2} step={0.005} onChange={setR} format={(v) => pct(v, 1)} />
        <Slider label="Years counted" value={n} min={1} max={100} step={1} onChange={setN} format={(v) => `${v} yr`} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each year's dividend and its present value">
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        {Array.from({ length: SHOW }, (_, i) => {
          const t = i + 1;
          const v = pv(d, r, t);
          const on = t <= n;
          return (
            <g key={t} opacity={on ? 1 : 0.35}>
              <rect x={x(t) - bw / 2} y={y(d)} width={bw} height={H - B - y(d)} fill="none" stroke="var(--muted)" strokeDasharray="2 2" strokeWidth={1} />
              <SvgBar x={x(t) - bw / 2} width={bw} base={H - B} top={y(v)} fill={on ? 'var(--yellow)' : 'var(--line)'} strokeWidth={1} label={`Year ${t}: PV ${money(v)}`} />
            </g>
          );
        })}
        {[1, 10, 20, 30, 40, 50].map((t) => <text key={t} x={x(t)} y={H - 6} textAnchor="middle">{t}</text>)}
        <text x={L - 4} y={y(d) + 4} textAnchor="end">{money(d, 2)}</text>
      </svg>
      <div className="legend"><span><i style={{ background: 'transparent', borderStyle: 'dashed' }} />Dividend received (always D)</span><span><i style={{ background: 'var(--yellow)' }} />Its value today, D / (1+r)<sup>t</sup></span></div>
      <div className="split-bar" aria-label="Share of the value captured">
        <div style={{ width: `${(partial / value) * 100}%`, background: 'var(--yellow)' }}>{partial / value > 0.25 ? `first ${n} yr: ${money(partial)}` : ''}</div>
        <div style={{ flex: 1, background: 'var(--card-2)' }}>{partial / value < 0.8 ? `the rest: ${money(value - partial)}` : ''}</div>
      </div>
      <div className="readouts">
        <Stat label={`Sum of first ${n} years`} value={money(partial)} tone="gold" />
        <Stat label="Value of all years: D / r" value={money(value)} tone="blue" />
      </div>
    </Viz>
  );
}

function PreferredTwoWays() {
  const [mode, setMode] = useState<'value' | 'yield'>('value');
  const [q, setQ] = useState(1.25); // quarterly dividend
  const [rp, setRp] = useState(0.08);
  const [price, setPrice] = useState(50);
  const annual = 4 * q;
  const value = mode === 'value' ? annual / rp : price;
  const impliedR = mode === 'value' ? rp : annual / price;
  const W = 640, H = 190, L = 44, B = 26, T = 10;
  const rMin = 0.03, rMax = 0.2;
  const vMax = annual / rMin;
  const x = scale(rMin, rMax, L, W - 10);
  const y = scale(0, vMax, H - B, T);
  const pts = Array.from({ length: 60 }, (_, i) => { const r = rMin + ((rMax - rMin) * i) / 59; return `${x(r)},${y(annual / r)}`; }).join(' ');
  return (
    <Viz
      title="Preferred stock: one formula, two directions"
      tryThis={['In “find the value”, raise r_p: the price falls along the curve.', 'Switch to “find the yield” and lower the price: the return you lock in goes up.']}
      caption={<>Value and required return move in <b>opposite directions</b>: Vₚ = Dₚ / rₚ. With quarterly dividends, the annual dividend is 4 × {money(q)} = <b>{money(annual)}</b>, and the rate is the <b>nominal</b> annual rate.</>}
    >
      <Seg label="What to solve for" value={mode} onChange={setMode} options={[{ v: 'value', label: 'Find the value' }, { v: 'yield', label: 'Find the yield' }]} />
      <div className="controls">
        <Slider label="Dividend per quarter" value={q} min={0.25} max={3} step={0.05} onChange={setQ} format={(v) => money(v)} />
        {mode === 'value'
          ? <Slider label="Required return rₚ (annual)" value={rp} min={0.03} max={0.2} step={0.0025} onChange={setRp} format={(v) => pct(v, 2)} />
          : <Slider label="Market price Vₚ" value={price} min={10} max={150} step={0.5} onChange={setPrice} format={(v) => money(v)} />}
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Preferred value against required return">
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
        <polyline points={pts} fill="none" stroke="var(--purple)" strokeWidth={3} />
        {impliedR >= rMin && impliedR <= rMax && (
          <g>
            <line className="grid" x1={x(impliedR)} x2={x(impliedR)} y1={y(value)} y2={H - B} />
            <line className="grid" x1={L} x2={x(impliedR)} y1={y(value)} y2={y(value)} />
            <circle cx={x(impliedR)} cy={y(value)} r={8} fill="var(--yellow)" stroke="var(--k)" strokeWidth={2.5} style={{ transition: 'cx .2s, cy .2s' }} />
          </g>
        )}
        {[0.05, 0.1, 0.15, 0.2].map((r) => <text key={r} x={x(r)} y={H - 8} textAnchor="middle">{pct(r, 0)}</text>)}
        <text x={L - 6} y={T + 10} textAnchor="end">{money(vMax, 0)}</text>
        <text className="lbl" x={W - 10} y={H - B - 8} textAnchor="end">rₚ →</text>
      </svg>
      {(impliedR < rMin || impliedR > rMax) && <p className="small muted">The point is off this chart’s range ({pct(impliedR, 2)}).</p>}
      <div className="readouts">
        <Stat label="Annual dividend Dₚ" value={money(annual)} tone="gold" sub={`4 × ${money(q)}`} />
        <Stat label={mode === 'value' ? 'Value Vₚ = Dₚ / rₚ' : 'Price Vₚ'} value={money(value)} tone="blue" />
        <Stat label={mode === 'value' ? 'Required return rₚ' : 'Yield rₚ = Dₚ / Vₚ'} value={pct(impliedR, 2)} tone="purple" />
      </div>
    </Viz>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="The simplest case: the dividend never changes">
        <p>Suppose a stock pays the same dividend D every year, forever: D₁ = D₂ = D₃ = … = D. That stream is a <strong>perpetuity</strong>, and the zero-growth model values it.</p>
        <p>Few common stocks really behave like this, but one security does: <strong>preferred stock</strong>. It pays a fixed periodic dividend, has priority over common stock for dividends and in liquidation, and usually has no vote. That fixed payment is why it is called <strong>quasi-debt</strong>.</p>
      </Block>
      <Block title="The puzzle">
        <p>“Forever” means infinitely many payments. Adding up infinitely many dollars sounds like it should give an infinite value, yet a preferred share paying $5 a year sells for about $60, not for infinity. Why?</p>
        <p>Because money far in the future is worth very little today. The next step lets you watch the present values shrink and the total settle on a finite number.</p>
      </Block>
      <Callout tone="tip" title="A quick intuition">
        If you deposit $15 at 12%, the bank pays you $1.80 a year forever without touching the $15. So a stream of $1.80 a year forever is worth exactly $15 today: 1.80 / 0.12.
      </Callout>
    </>
  ),
  explore: (
    <>
      <PerpetuityBuilder />
      <PreferredTwoWays />
    </>
  ),
  formula: (
    <>
      <Block title="Zero-growth model">
        <Formula big note="A perpetuity: the same dividend forever, discounted at r."><M>P<sub>0</sub></M> = <Frac n={<M>D</M>} d={<M>r</M>} /></Formula>
        <Vars rows={[
          [<>P<sub>0</sub></>, 'Value of the stock today'],
          ['D', 'The constant annual dividend (D₁ = D₂ = … = D)'],
          ['r', 'Required rate of return (as a decimal: 12% → 0.12)'],
        ]} />
        <p>With zero growth, “just paid” and “next year’s” dividend are the same number, so the timing question that matters later doesn’t arise here.</p>
      </Block>
      <Block title="Preferred stock">
        <Formula note="Value of a preferred share, and the return implied by its price."><M>V<sub>p</sub></M> = <Frac n={<M>D<sub>p</sub></M>} d={<M>r<sub>p</sub></M>} /> &nbsp;&nbsp;⇔&nbsp;&nbsp; <M>r<sub>p</sub></M> = <Frac n={<M>D<sub>p</sub></M>} d={<M>V<sub>p</sub></M>} /></Formula>
        <p>Quarterly dividends: use the <strong>annual</strong> dividend (4 × quarterly). The result is the <strong>nominal</strong> annual rate (4 × the quarterly rate), not the effective rate.</p>
      </Block>
      <Block title="Assumptions">
        <ul>
          <li>The dividend stays exactly the same forever (zero growth).</li>
          <li>r is constant and positive. With r = 0 the formula breaks: an endless stream discounted at 0% has no finite value.</li>
        </ul>
      </Block>
      <Block title="Worked examples">
        <Worked title="Perry Motors: just paid $1.80, dividends never grow, r = 12%" steps={['D₁ = D₀ = $1.80 (no growth)', 'P₀ = 1.80 / 0.12']} result="P₀ = $15.00" />
        <Worked title="Preferred share paying $2.50 a quarter, price $50" steps={['Annual dividend Dₚ = 4 × 2.50 = $10.00', 'rₚ = 10 / 50 = 0.20']} result="Nominal annual return = 20%" />
      </Block>
    </>
  ),
  derivation: {
    title: 'Why the infinite sum equals D / r',
    body: (
      <>
        <p>Write the value as a sum: <M>P<sub>0</sub> = D/(1+r) + D/(1+r)<sup>2</sup> + D/(1+r)<sup>3</sup> + …</M></p>
        <p>Multiply both sides by (1 + r): <M>(1+r)P<sub>0</sub> = D + D/(1+r) + D/(1+r)<sup>2</sup> + …</M></p>
        <p>Everything after the first D on the right is P₀ again, so <M>(1+r)P<sub>0</sub> = D + P<sub>0</sub></M>. Subtract P₀ from both sides: <M>r·P<sub>0</sub> = D</M>, so <M>P<sub>0</sub> = D / r</M>.</p>
        <p>The trick only works because the terms shrink (r &gt; 0). That is the same idea you saw in the explorer: the bars fade, so the total settles.</p>
      </>
    ),
  },
  checks: [
    {
      id: 'pref-value',
      kind: 'number',
      unit: '$',
      prompt: <>A preferred share pays a fixed <b>$3.20</b> a year forever. Investors require <b>8%</b>. What is it worth?</>,
      answer: 40,
      traps: [{ value: 3.2 * 1.08, msg: 'That grows the dividend. Preferred dividends are fixed: divide by r instead.' }, { value: 0.256, msg: 'You multiplied. Value = D / r = 3.20 / 0.08.' }],
      explain: <>Vₚ = Dₚ / rₚ = 3.20 / 0.08 = <b>$40.00</b>.</>,
    },
    {
      id: 'pref-yield',
      kind: 'number',
      unit: '%',
      prompt: <>A preferred share pays <b>$0.75 per quarter</b> and sells for <b>$37.50</b>. What nominal annual rate of return does a buyer earn?</>,
      answer: 8,
      traps: [{ value: 2, msg: 'That is the quarterly rate (0.75 / 37.50). The nominal annual rate is 4 times it.' }],
      explain: <>Annual dividend = 4 × 0.75 = $3.00, so rₚ = 3.00 / 37.50 = 0.08 = <b>8%</b> (nominal).</>,
    },
    {
      id: 'zero-growth',
      kind: 'number',
      unit: '$',
      prompt: <>A company just paid a <b>$2.40</b> dividend and will keep paying exactly that amount forever. The required return is <b>15%</b>. What is the share worth?</>,
      answer: 16,
      traps: [{ value: 2.4 * 1.15 / 0.15, msg: 'With zero growth, next year’s dividend equals the one just paid. Don’t multiply by 1.15.' }],
      explain: <>D₁ = D₀ = $2.40 (no growth), so P₀ = 2.40 / 0.15 = <b>$16.00</b>.</>,
    },
    {
      id: 'rate-up',
      kind: 'mcq',
      prompt: <>A preferred share pays $5 a year. Its required return rises from 8% to 10%. What happens to its value?</>,
      choices: ['It rises from $50.00 to $62.50', 'It falls from $62.50 to $50.00', 'It stays at $62.50: the dividend is fixed', 'It falls by exactly 2%, to $61.25'],
      answer: 1,
      why: ['A higher required return lowers value: future cash is discounted more.', undefined, 'The dividend is fixed, but the rate it is discounted at changed.', 'Value isn’t linear in r: 5 / 0.10 = $50, a 20% drop.'],
      explain: <>5 / 0.08 = $62.50 before, 5 / 0.10 = $50.00 after. A 2-point rise in r cut the value by 20%: value and required return move in opposite directions.</>,
    },
    {
      id: 'why-finite',
      kind: 'mcq',
      prompt: <>Why does a dividend that is paid <i>forever</i> have a finite value?</>,
      choices: [
        'Because companies eventually stop paying dividends',
        'Because each later dividend is worth less today, and the shrinking present values add up to D / r',
        'Because investors only care about the first 10 years',
        'Because preferred stock has a maturity date',
      ],
      answer: 1,
      why: ['The model assumes the dividend really is paid forever, and still gives a finite value.', undefined, 'Every year counts in the sum, but far-away years count for very little.', 'Preferred stock normally has no maturity date: that is why it is a perpetuity.'],
      explain: <>Discounting makes each future dividend worth less today. The present values form a shrinking (geometric) series, and its sum is exactly D / r.</>,
    },
  ],
  takeaways: [
    'Zero growth = perpetuity: P₀ = D / r.',
    'Preferred stock is valued the same way: Vₚ = Dₚ / rₚ, and rₚ = Dₚ / Vₚ.',
    'Quarterly dividends: use 4 × the quarterly dividend; the result is a nominal annual rate.',
    'Value and required return move in opposite directions.',
  ],
};

export default lesson;
