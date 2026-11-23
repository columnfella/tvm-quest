'use client';
// Lesson 6: where growth comes from (sustainable growth = ROE × retention) and when it adds value (PVGO).
// Visual 1 plots the price against the retention ratio: rising when ROE > r, flat when ROE = r, falling when ROE < r.
// Visual 2 compares arithmetic and geometric average growth by compounding each from the first dividend.
import { m } from 'framer-motion';
import { useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Presets, Seg, Slider, Stat, SvgBar, Vars, Viz, Worked, scale } from '@/components/learn/kit';
import { historicalGrowth, money, pct, retentionValue } from './math';

type S = { e1: number; roe: number; b: number; r: number };

function RetainOrPay() {
  const [s, setS] = useState<S>({ e1: 5, roe: 0.15, b: 0.4, r: 0.1 });
  const set = (p: Partial<S>) => setS((x) => ({ ...x, ...p }));
  const v = retentionValue(s.e1, s.roe, s.b, s.r);
  const W = 640, H = 230, L = 50, B = 30, T = 12;
  const bMax = 0.9;
  const yMax = (s.e1 / s.r) * 2.2;
  const x = scale(0, bMax, L, W - 8);
  const y = scale(0, yMax, H - B, T);
  const bLimit = s.roe > 0 ? s.r / s.roe : Infinity; // retention where g reaches r
  const pts: string[] = [];
  for (let i = 0; i <= 90; i++) {
    const b = (bMax * i) / 90;
    const p = retentionValue(s.e1, s.roe, b, s.r).price;
    if (p === null || p > yMax) break;
    pts.push(`${x(b)},${y(p)}`);
  }
  const diff = s.roe - s.r;
  const tone = Math.abs(diff) < 0.0005 ? 'neutral' : diff > 0 ? 'good' : 'bad';
  const color = tone === 'good' ? 'var(--green)' : tone === 'bad' ? 'var(--red)' : 'var(--purple)';
  return (
    <Viz
      title="Retain or pay out?"
      tryThis={[
        'Load “Value destroyer” and raise retention: growth goes UP, yet the price goes DOWN.',
        'Load “Break-even”: retention changes growth but not the price, and PVGO stays at $0.',
        'With a growth star, push retention until g reaches r: the model breaks (red zone).',
      ]}
      caption={<>Retaining a dollar pays off only if the firm reinvests it at a return above what investors require. <b>ROE {pct(s.roe, 1)} {tone === 'good' ? '>' : tone === 'bad' ? '<' : '='} r {pct(s.r, 1)}</b>: retaining more {tone === 'good' ? 'raises' : tone === 'bad' ? 'lowers' : 'doesn’t change'} the price, so PVGO is {tone === 'good' ? 'positive' : tone === 'bad' ? 'negative' : 'zero'}.</>}
    >
      <Presets items={[
        { label: 'Growth star: ROE 15%', onClick: () => set({ roe: 0.15, r: 0.1 }), active: s.roe === 0.15 && s.r === 0.1 },
        { label: 'Break-even: ROE = r', onClick: () => set({ roe: 0.1, r: 0.1 }), active: s.roe === 0.1 && s.r === 0.1 },
        { label: 'Value destroyer: ROE 6%', onClick: () => set({ roe: 0.06, r: 0.1 }), active: s.roe === 0.06 && s.r === 0.1 },
      ]} />
      <div className="controls">
        <Slider label="Next year’s EPS E₁" value={s.e1} min={1} max={10} step={0.1} onChange={(e1) => set({ e1 })} format={(v) => money(v)} />
        <Slider label="Return on equity ROE" value={s.roe} min={0.02} max={0.25} step={0.005} onChange={(roe) => set({ roe })} format={(v) => pct(v, 1)} />
        <Slider label="Retention ratio b = 1 − payout" value={s.b} min={0} max={0.9} step={0.01} onChange={(b) => set({ b })} format={(v) => pct(v, 0)} />
        <Slider label="Required return r" value={s.r} min={0.06} max={0.16} step={0.005} onChange={(r) => set({ r })} format={(v) => pct(v, 1)} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Price against the retention ratio">
        {bLimit < bMax && (
          <g>
            <rect x={x(bLimit)} y={T} width={W - 8 - x(bLimit)} height={H - B - T} fill="color-mix(in srgb, var(--red) 16%, transparent)" />
            <text className="lbl" x={(x(bLimit) + W - 8) / 2} y={T + 16} textAnchor="middle" style={{ fill: 'var(--red-ink)' }}>g ≥ r: no price</text>
          </g>
        )}
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
        <line x1={L} x2={W - 8} y1={y(s.e1 / s.r)} y2={y(s.e1 / s.r)} stroke="var(--k)" strokeWidth={2} strokeDasharray="6 5" />
        <text className="lbl" x={L + 6} y={y(s.e1 / s.r) - 6}>no-growth value E₁/r = {money(s.e1 / s.r)}</text>
        {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={3.5} strokeLinejoin="round" />}
        {v.price !== null && v.price <= yMax && <circle cx={x(s.b)} cy={y(v.price)} r={8} fill="var(--yellow)" stroke="var(--k)" strokeWidth={2.5} style={{ transition: 'cx .15s, cy .15s' }} />}
        {[0, 0.2, 0.4, 0.6, 0.8].map((b) => <text key={b} x={x(b)} y={H - 10} textAnchor="middle">{pct(b, 0)}</text>)}
        <text className="lbl" x={W - 8} y={H - B - 8} textAnchor="end">retention b →</text>
        <text x={L - 6} y={y(yMax) + 10} textAnchor="end">{money(yMax, 0)}</text>
      </svg>
      <div className="readouts">
        <Stat label="g = ROE × b" value={pct(v.g, 2)} tone="green" />
        <Stat label="D₁ = E₁ × (1 − b)" value={money(v.d1)} tone="gold" />
        <Stat label="P₀ = D₁ / (r − g)" value={v.price !== null ? money(v.price) : 'n/a'} tone={v.price !== null ? 'blue' : 'red'} />
        <Stat label="PVGO = P₀ − E₁/r" value={v.pvgo !== null ? money(v.pvgo) : 'n/a'} tone={v.pvgo === null ? 'red' : v.pvgo > 0.005 ? 'green' : v.pvgo < -0.005 ? 'red' : 'purple'} />
      </div>
      {v.price === null && <div className="lverdict bad" role="alert">g = {pct(v.g, 2)} has reached r = {pct(s.r, 1)}: the constant-growth model can’t price this. No firm can grow faster than r forever.</div>}
      <p className="small muted">This visual assumes the firm reinvests retained earnings at its ROE forever and keeps the same payout. P₀ is the model’s value; in problems, PVGO uses the price you’re given (the slides use the market price).</p>
    </Viz>
  );
}

const BJ = { years: [2008, 2009, 2010, 2011, 2012, 2013], divs: [1.5, 1.7, 1.75, 1.8, 2.0, 2.2] };

function HistoricalG() {
  const h = historicalGrowth(BJ.divs);
  const [mode, setMode] = useState<'arith' | 'geo'>('geo');
  const rate = mode === 'arith' ? h.arithmetic : h.geometric;
  const proj = BJ.divs.map((_, i) => BJ.divs[0] * (1 + rate) ** i);
  const W = 640, H = 210, L = 44, B = 28, T = 14;
  const x = scale(-0.5, 5.5, L, W - 8);
  const y = scale(1.2, 2.35, H - B, T);
  const path = proj.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p)}`).join(' ');
  return (
    <Viz
      title="Estimating g from history: arithmetic vs geometric"
      tryThis={['Switch between the two averages and compare where each line ends in 2013.']}
      caption={<>Broadway Joe’s dividend went from $1.50 (2008) to $2.20 (2013): <b>5 changes</b>. Compounding $1.50 at the <b>{mode === 'arith' ? 'arithmetic' : 'geometric'}</b> average ({pct(rate, 2)}) gives <b>{money(proj[5], 4)}</b> in 2013{mode === 'geo' ? ', exactly the real dividend. The geometric mean is the right rate for compounding.' : ', which overshoots the real $2.20: the arithmetic mean is always ≥ the geometric mean.'}</>}
    >
      <Seg label="Average" value={mode} onChange={setMode} options={[{ v: 'arith', label: `Arithmetic ${pct(h.arithmetic, 2)}` }, { v: 'geo', label: `Geometric ${pct(h.geometric, 2)}` }]} />
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Actual dividends and the compounded average">
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        {BJ.divs.map((d, i) => (
          <g key={i}>
            <SvgBar x={x(i) - 18} width={36} base={H - B} top={y(d)} fill="var(--yellow)" label={`${BJ.years[i]}: ${money(d)}`} />
            <text className="lbl" x={x(i)} y={y(d) - 6} textAnchor="middle">{money(d)}</text>
            <text x={x(i)} y={H - 10} textAnchor="middle">{BJ.years[i]}</text>
            {i > 0 && <text x={(x(i) + x(i - 1)) / 2} y={H - B - 6} textAnchor="middle" style={{ fontSize: 10 }}>{pct(h.changes[i - 1], 1)}</text>}
          </g>
        ))}
        <m.path key={mode} d={path} fill="none" stroke={mode === 'geo' ? 'var(--green)' : 'var(--red)'} strokeWidth={3.5} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
        <m.circle key={mode + 'c'} cx={x(5)} cy={y(proj[5])} r={6} fill={mode === 'geo' ? 'var(--green)' : 'var(--red)'} stroke="var(--k)" strokeWidth={2} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} />
      </svg>
      <div className="legend"><span><i style={{ background: 'var(--yellow)' }} />Actual dividend (yearly % change under the bars)</span><span><i style={{ background: mode === 'geo' ? 'var(--green)' : 'var(--red)' }} />$1.50 compounded at the average</span></div>
    </Viz>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="Where does g come from?">
        <p>Every model so far needed a growth rate g. The slides list three ways to estimate it: the firm’s <strong>historical average</strong> growth, an <strong>industry</strong> average or median, or the <strong>sustainable growth rate</strong>.</p>
        <p>The sustainable growth rate (SGR) is the fastest a firm can grow using only its own earnings, without new debt or equity. The earnings it doesn’t pay out are reinvested, and they earn the firm’s ROE.</p>
      </Block>
      <Block title="Is growth always good?">
        <p>No, and this is the surprising part. Retaining earnings makes dividends grow, but it also means smaller dividends today. Growth adds value <strong>only if the reinvested money earns more than investors require</strong> (ROE &gt; r).</p>
        <p><strong>PVGO</strong>, the present value of growth opportunities, measures this: the part of the price that comes from expected growth rather than from current earnings.</p>
      </Block>
      <Callout tone="key" title="Reading PVGO">
        PVGO &gt; 0: reinvesting creates value, so retaining makes sense. PVGO &lt; 0: growth investments earn less than r, so paying dividends would be better. Per the slides, that usually points to a weak growth strategy rather than a wrong market price.
      </Callout>
    </>
  ),
  explore: (
    <>
      <RetainOrPay />
      <HistoricalG />
    </>
  ),
  formula: (
    <>
      <Block title="Sustainable growth rate">
        <Formula big><M>SGR = ROE × b</M>,&nbsp;&nbsp; <M>b = 1 − payout</M>,&nbsp;&nbsp; <M>payout</M> = <Frac n="DPS" d="EPS" /></Formula>
        <Vars rows={[
          ['ROE', 'Return on equity = net income / equity'],
          ['b', 'Retention ratio: share of earnings kept for reinvestment'],
          ['payout', 'Dividends / earnings (DPS / EPS)'],
        ]} />
        <p>Why: equity grows by the earnings kept, b × ROE × equity, so equity (and with it earnings and dividends) grows at ROE × b.</p>
      </Block>
      <Block title="PVGO">
        <Formula big note="Price = value with no growth (all earnings paid out: a perpetuity) + value of growth opportunities."><M>P<sub>0</sub></M> = <Frac n={<M>E<sub>1</sub></M>} d={<M>r</M>} /> + <M>PVGO</M> &nbsp;⇒&nbsp; <M>PVGO = P<sub>0</sub></M> − <Frac n={<M>E<sub>1</sub></M>} d={<M>r</M>} /></Formula>
        <p>The slides use the dividend as the no-growth earnings when all earnings are paid out (D = E). Divide by E₁ for the P/E version: P₀/E₁ = 1/r + PVGO/E₁, where 1/r is the P/E of a no-growth firm.</p>
      </Block>
      <Block title="Historical growth">
        <Formula note="n = number of changes (years listed − 1). The geometric mean is the right rate for compounding."><M>g<sub>geo</sub></M> = (<Frac n={<M>D<sub>last</sub></M>} d={<M>D<sub>first</sub></M>} />)<sup>1/n</sup> − 1</Formula>
      </Block>
      <Block title="Assumptions">
        <ul>
          <li>SGR assumes the firm keeps its ROE and payout ratio and issues no new debt or equity.</li>
          <li>The no-growth value assumes all earnings are paid out forever (a perpetuity).</li>
          <li>Historical growth assumes the past is a guide to the future, which it may not be.</li>
        </ul>
      </Block>
      <Block title="Worked examples">
        <Worked title="DTE Energy: ROE 10%, EPS $4.05, dividend $2.35" steps={['Payout = 2.35 / 4.05 = 58%', 'Retention b = 1 − 0.58 = 42%', 'SGR = 10% × 0.42']} result="SGR = 4.2%" />
        <Worked title="Delta Corp: D = $2, g = 5%, r = 10%, market price $50" steps={['No growth: 2 / 0.10 = $20', 'With growth: 2 × 1.05 / (0.10 − 0.05) = $42', 'PVGO = market price − no-growth value = 50 − 20 = $30 (from the intrinsic value instead: 42 − 20 = $22)']} />
        <Worked title="Alpha Manufacturing: pays $4 (all earnings), r = 12%, price $30" steps={['No-growth value = 4 / 0.12 = $33.33', 'PVGO = 30 − 33.33']} result="PVGO = −$3.33: growth plans are destroying value" />
      </Block>
    </>
  ),
  derivation: {
    title: 'Why growth adds value only when ROE > r',
    body: (
      <>
        <p>Use the retention model: D₁ = E₁(1 − b) and g = ROE × b. Then</p>
        <Formula><M>P<sub>0</sub></M> = <Frac n={<M>E<sub>1</sub>(1 − b)</M>} d={<M>r − ROE·b</M>} /></Formula>
        <p>Set ROE = r: the price becomes E₁(1 − b) / (r(1 − b)) = E₁ / r for every b. Retention changes growth, but not the value, so PVGO = 0.</p>
        <p>If ROE &gt; r, the denominator shrinks faster than the numerator as b rises, so the price rises above E₁/r (PVGO &gt; 0). If ROE &lt; r, it falls below (PVGO &lt; 0). That is the curve you explored.</p>
      </>
    ),
  },
  checks: [
    {
      id: 'sgr',
      kind: 'number',
      unit: '%',
      prompt: <>A firm earns an ROE of <b>15%</b> and pays out <b>40%</b> of its earnings as dividends. What is its sustainable growth rate?</>,
      answer: 9,
      traps: [{ value: 6, msg: 'You used the payout ratio. Growth comes from what is RETAINED: 1 − 40% = 60%.' }],
      explain: <>SGR = ROE × (1 − payout) = 15% × 60% = <b>9%</b>.</>,
    },
    {
      id: 'sgr-eps',
      kind: 'number',
      unit: '%',
      prompt: <>A company has an ROE of <b>12%</b>, earnings per share of <b>$5.00</b> and pays a dividend of <b>$2.00</b> per share. What is its sustainable growth rate?</>,
      answer: 7.2,
      traps: [{ value: 4.8, msg: 'Payout = 2/5 = 40%, so retention = 60%. SGR uses the retention ratio.' }],
      explain: <>Payout = 2.00 / 5.00 = 40% → retention = 60%. SGR = 12% × 0.60 = <b>7.2%</b>.</>,
    },
    {
      id: 'pvgo',
      kind: 'number',
      unit: '$',
      prompt: <>A stock trades at <b>$70</b>, its EPS is <b>$5</b>, and the required return is <b>10%</b>. What is the present value of its growth opportunities?</>,
      answer: 20,
      traps: [{ value: 50, msg: 'That is the no-growth value E/r. PVGO is the price minus it.' }],
      explain: <>No-growth value = 5 / 0.10 = $50. PVGO = 70 − 50 = <b>$20</b>: $20 of the price is for expected growth.</>,
    },
    {
      id: 'negative-pvgo',
      kind: 'mcq',
      prompt: <>A firm pays all its earnings ($4) as dividends, r = 12%, and its stock trades at $30, so its PVGO is −$3.33. What is the market telling management?</>,
      choices: [
        'Reinvest even more earnings to grow faster',
        'Its growth investments are expected to earn less than 12%, so paying out may be better',
        'The stock is risk-free at this price',
        'The market price is wrong and will soon rise to $33.33',
      ],
      answer: 1,
      why: ['More reinvestment at returns below r would destroy even more value.', undefined, 'PVGO says nothing about risk being zero.', 'Per the slides, a negative PVGO more likely points to the growth strategy than to a wrong price.'],
      explain: <>Price $30 &lt; no-growth value $33.33. Investors think reinvested earnings will earn below r, so growth is destroying value.</>,
    },
    {
      id: 'roe-below-r',
      kind: 'mcq',
      prompt: <>A firm’s ROE is <b>8%</b> and investors require <b>11%</b>. It raises its retention ratio from 30% to 60%. What happens?</>,
      choices: ['Growth rises and the price rises', 'Growth rises but the price falls', 'Growth falls and the price falls', 'Nothing changes: retention doesn’t affect value'],
      answer: 1,
      why: ['Growth does rise (8% × 60% = 4.8%), but each retained dollar earns less than investors require.', undefined, 'More retention means MORE growth: g = ROE × b.', 'Retention only leaves the price unchanged when ROE = r.'],
      explain: <>g goes from 2.4% to 4.8%, but because ROE &lt; r, the higher growth doesn’t make up for the smaller dividends: the price falls (see the “Value destroyer” preset).</>,
    },
    {
      id: 'geo-g',
      kind: 'number',
      unit: '%',
      prompt: <>A dividend rose from <b>$2.00</b> to <b>$2.80</b> over <b>4 years</b> (4 yearly changes). What is the geometric average growth rate?</>,
      answer: (1.4 ** 0.25 - 1) * 100,
      traps: [{ value: 10, msg: 'That is 40% / 4: a simple average ignores compounding. Use (2.80/2.00)^(1/4) − 1.' }, { value: (1.4 ** 0.2 - 1) * 100, msg: 'n is the number of CHANGES: 4, not 5.' }],
      explain: <>g = (2.80 / 2.00)^(1/4) − 1 = 1.4^0.25 − 1 = <b>8.78%</b>.</>,
    },
  ],
  takeaways: [
    'SGR = ROE × retention ratio (retention = 1 − payout).',
    'PVGO = P₀ − E₁/r: the part of the price that comes from growth.',
    'Growth adds value only when ROE > r. When ROE < r, more growth lowers the price.',
    'For historical growth, compound with the geometric mean over n changes.',
  ],
};

export default lesson;
