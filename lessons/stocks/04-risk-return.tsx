'use client';
// Lesson 4: risk → required return → price. CAPM (Black Book notation) turns beta into ks; the constant-growth
// model turns ks into a price. Then market equilibrium: if the expected return at today's price differs from ks,
// trading moves the price until they are equal.
import { useEffect, useRef, useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Slider, Stat, Vars, Viz, Worked, scale } from '@/components/learn/kit';
import { Btn } from '@/components/ui';
import { capm, gordon, money, pct } from './math';

const D1 = 2;
const G = 0.04;

type Risk = { krf: number; mrp: number; beta: number };

function RiskToPrice({ k, set }: { k: Risk; set: (p: Partial<Risk>) => void }) {
  const ks = capm(k.krf, k.mrp, k.beta);
  const price = gordon(D1, ks, G);
  const W = 640, H = 220, L = 44, B = 28, T = 12;
  const bMax = 2.5, kMax = 0.26;
  const x = scale(0, bMax, L, W - 10);
  const y = scale(0, kMax, H - B, T);
  const ref = gordon(D1, capm(k.krf, k.mrp, 1), G); // same firm at beta = 1, for comparison
  return (
    <Viz
      title="From risk to required return to price"
      tryThis={[
        'Raise beta: the dot climbs the line, ks rises, and the same dividends are worth less.',
        'Raise the market risk premium (investors more risk-averse): the line gets steeper.',
        'Drop beta near 0: ks falls toward the risk-free rate, and below g the model stops working.',
      ]}
      caption={<>Same firm, same dividends (D₁ = {money(D1)}, g = {pct(G, 0)}). Only the risk changes. Higher beta → higher required return k<sub>s</sub> → <b>lower price</b>.</>}
    >
      <div className="controls">
        <Slider label={<>Risk-free rate k<sub>RF</sub></>} value={k.krf} min={0.02} max={0.08} step={0.0025} onChange={(krf) => set({ krf })} format={(v) => pct(v, 2)} />
        <Slider label={<>Market risk premium k<sub>M</sub> − k<sub>RF</sub></>} value={k.mrp} min={0.03} max={0.09} step={0.0025} onChange={(mrp) => set({ mrp })} format={(v) => pct(v, 2)} />
        <Slider label="Beta b" value={k.beta} min={0} max={2.5} step={0.05} onChange={(beta) => set({ beta })} format={(v) => v.toFixed(2)} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Required return against beta">
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
        {[0.05, 0.1, 0.15, 0.2, 0.25].map((v) => (
          <g key={v}><line className="grid" x1={L} x2={W - 4} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{pct(v, 0)}</text></g>
        ))}
        <line x1={x(0)} x2={x(bMax)} y1={y(k.krf)} y2={y(capm(k.krf, k.mrp, bMax))} stroke="var(--purple)" strokeWidth={3} style={{ transition: 'all .2s' }} />
        <line x1={L} x2={W - 4} y1={y(G)} y2={y(G)} stroke="var(--red)" strokeWidth={2} strokeDasharray="6 5" />
        <text x={W - 8} y={y(G) - 6} textAnchor="end" className="lbl" style={{ fill: 'var(--red-ink)' }}>g = {pct(G, 0)}: k<tspan dy="3" fontSize="9">s</tspan><tspan dy="-3"> must stay above</tspan></text>
        <line className="grid" x1={x(k.beta)} x2={x(k.beta)} y1={y(ks)} y2={H - B} />
        <circle cx={x(k.beta)} cy={y(ks)} r={9} fill="var(--yellow)" stroke="var(--k)" strokeWidth={2.5} style={{ transition: 'cx .15s, cy .15s' }} />
        {[0, 0.5, 1, 1.5, 2, 2.5].map((b) => <text key={b} x={x(b)} y={H - 10} textAnchor="middle">{b}</text>)}
        <text className="lbl" x={W - 8} y={H - B - 8} textAnchor="end">beta →</text>
      </svg>
      <div className="readouts">
        <Stat label={<>k<sub>s</sub> = k<sub>RF</sub> + (k<sub>M</sub> − k<sub>RF</sub>) b</>} value={pct(ks, 2)} tone="purple" sub={`${pct(k.krf, 2)} + ${pct(k.mrp, 2)} × ${k.beta.toFixed(2)}`} />
        <Stat label={<>P₀ = D₁ / (k<sub>s</sub> − g)</>} value={price !== null ? money(price) : 'n/a'} tone={price !== null ? 'blue' : 'red'} sub={price !== null && ref !== null ? `${money(ref)} at beta 1` : undefined} />
      </div>
      {price === null && <div className="lverdict bad" role="alert">k<sub>s</sub> = {pct(ks, 2)} is not above g = {pct(G, 0)}, so the constant-growth model can’t give a price.</div>}
    </Viz>
  );
}

function Equilibrium({ ks }: { ks: number }) {
  const eq = gordon(D1, ks, G);
  const [price, setPrice] = useState(eq ? Math.round(eq * 0.7) : 30);
  const [moving, setMoving] = useState(false);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const expected = D1 / price + G;
  const gap = expected - ks;
  const trade = () => {
    if (!eq) return;
    setMoving(true);
    const from = price, start = performance.now(), dur = 1400;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - (1 - t) ** 3;
      setPrice(from + (eq - from) * e);
      if (t < 1) raf.current = requestAnimationFrame(step); else setMoving(false);
    };
    raf.current = requestAnimationFrame(step);
  };
  const width = (v: number) => `${Math.max(2, Math.min(100, (v / 0.3) * 100))}%`; // bars share a 0–30% scale
  return (
    <Viz
      title="Market equilibrium: expected vs required"
      tryThis={['Set a price below the equilibrium price, then press “Let investors trade”.', 'Now set it above and trade again.']}
      caption={<>At any price, the <b>expected return</b> is k̂ = D₁/P₀ + g. If it beats the <b>required return</b> k<sub>s</sub>, the stock is a bargain: investors buy, the price rises, and k̂ falls until k̂ = k<sub>s</sub>. That price is the equilibrium price.</>}
    >
      {eq === null ? (
        <div className="lverdict bad">Pick a beta above where k<sub>s</sub> exceeds g in the visual above to see equilibrium.</div>
      ) : (
        <>
          <div className="controls">
            <Slider label="Market price P₀" value={price} min={Math.max(5, Math.round(eq * 0.4))} max={Math.round(eq * 1.8)} step={0.25} onChange={(v) => { cancelAnimationFrame(raf.current); setMoving(false); setPrice(v); }} format={(v) => money(v)} />
          </div>
          <div className="hbars" role="img" aria-label={`Expected return ${pct(expected, 2)}, required return ${pct(ks, 2)}`}>
            <div className="hbar-row">
              <span>Expected k̂ = D₁/P₀ + g <b>{pct(expected, 2)}</b></span>
              <div className="hbar-track"><div className="hbar" style={{ width: width(expected), background: gap > 0.0005 ? 'var(--green)' : gap < -0.0005 ? 'var(--red)' : 'var(--yellow)' }} /></div>
            </div>
            <div className="hbar-row">
              <span>Required k<sub>s</sub> (CAPM) <b>{pct(ks, 2)}</b></span>
              <div className="hbar-track"><div className="hbar" style={{ width: width(ks), background: 'var(--purple)' }} /></div>
            </div>
          </div>
          <div className={`lverdict ${Math.abs(gap) < 0.0005 ? 'neutral' : gap > 0 ? 'good' : 'bad'}`} role="status">
            {Math.abs(gap) < 0.0005
              ? <>Expected = required: the stock is in <b>equilibrium</b> at {money(price)}.</>
              : gap > 0
                ? <>Expected {pct(expected, 2)} &gt; required {pct(ks, 2)}: <b>undervalued</b>. Buyers bid the price up toward {money(eq)}.</>
                : <>Expected {pct(expected, 2)} &lt; required {pct(ks, 2)}: <b>overvalued</b>. Sellers push the price down toward {money(eq)}.</>}
          </div>
          <div><Btn variant="blue" onClick={trade} disabled={moving || Math.abs(gap) < 0.0005}>Let investors trade</Btn></div>
        </>
      )}
    </Viz>
  );
}

function Explore() {
  const [k, setK] = useState<Risk>({ krf: 0.05, mrp: 0.06, beta: 1.2 });
  const set = (p: Partial<Risk>) => setK((x) => ({ ...x, ...p }));
  const ks = capm(k.krf, k.mrp, k.beta);
  return (
    <>
      <RiskToPrice k={k} set={set} />
      <Equilibrium key={ks.toFixed(4)} ks={ks} />
    </>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="Where does r come from?">
        <p>So far the required return was simply given. But r isn’t arbitrary: it is the return investors demand for bearing the stock’s <strong>risk</strong>. Riskier stock, higher required return. Higher required return, lower value for the same dividends.</p>
        <p>The Black Book measures that risk with <strong>beta (b)</strong>: how much the stock tends to move with the market. b = 1 moves like the market; b = 2 swings about twice as much; b = 0.5 about half as much.</p>
      </Block>
      <Block title="Two returns that must agree">
        <ul>
          <li><strong>Required return k<sub>s</sub></strong>: what investors demand, set by risk (CAPM).</li>
          <li><strong>Expected return k̂<sub>s</sub></strong>: what you’d earn buying at today’s price, D₁/P₀ + g.</li>
        </ul>
        <p>If the expected return is higher than the required one, the stock is a bargain and people buy it, which pushes the price up. In <strong>equilibrium</strong> the two are equal.</p>
      </Block>
      <Callout tone="tip" title="Notation">
        The slides write the required return as r; the Black Book writes k<sub>s</sub> (or r<sub>s</sub>). Same thing. k<sub>RF</sub> is the risk-free rate and k<sub>M</sub> the required return on the market.
      </Callout>
    </>
  ),
  explore: <Explore />,
  formula: (
    <>
      <Block title="CAPM: risk → required return">
        <Formula big><M>k<sub>s</sub> = k<sub>RF</sub> + (k<sub>M</sub> − k<sub>RF</sub>) × b</M></Formula>
        <Vars rows={[
          [<>k<sub>s</sub></>, 'Required return on the stock'],
          [<>k<sub>RF</sub></>, 'Risk-free rate'],
          [<>k<sub>M</sub> − k<sub>RF</sub></>, 'Market risk premium (extra return demanded for average market risk)'],
          ['b', 'Beta: the stock’s market risk relative to the market (market = 1)'],
        ]} />
      </Block>
      <Block title="Required return → price, and equilibrium">
        <Formula note="Constant growth, discounting at the CAPM required return."><M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>k<sub>s</sub> − g</M>} /></Formula>
        <Formula note="Expected return at the market price; equilibrium when it equals k_s."><M>k̂<sub>s</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>P<sub>0</sub></M>} /> + <M>g</M> &nbsp;=&nbsp; <M>k<sub>s</sub></M></Formula>
      </Block>
      <Block title="Assumptions">
        <ul>
          <li>Investors price stocks with the CAPM, and beta captures the risk that matters.</li>
          <li>Dividends grow at a constant g, with k<sub>s</sub> &gt; g.</li>
          <li>Markets are in equilibrium: if they weren’t, trading would push the price there.</li>
        </ul>
      </Block>
      <Block title="Worked example">
        <Worked
          title="Black Book Q65: last dividend $0.80, g = 4%, k_RF = 5%, k_M = 8%, b = 1.3. Then k_RF falls to 4%, k_M rises to 10%, g rises to 6%, b rises to 1.5."
          steps={[
            'Before: k_s = 5% + (8% − 5%) × 1.3 = 8.9%',
            'P₀ = 0.80 × 1.04 / (0.089 − 0.04) = 0.832 / 0.049 = $16.98',
            'After: k_s = 4% + (10% − 4%) × 1.5 = 13%',
            'P₀ = 0.80 × 1.06 / (0.13 − 0.06) = 0.848 / 0.07 = $12.11',
          ]}
          result="Change in price = 12.11 − 16.98 = −$4.87"
        />
      </Block>
    </>
  ),
  checks: [
    {
      id: 'capm',
      kind: 'number',
      unit: '%',
      prompt: <>The risk-free rate is <b>5%</b>, the market risk premium is <b>6%</b>, and the stock’s beta is <b>1.2</b>. What is its required return?</>,
      answer: 12.2,
      traps: [{ value: 7.2, msg: 'That is only the risk premium for this stock (6% × 1.2). Add the risk-free rate.' }, { value: 11, msg: 'You used beta = 1. Multiply the market risk premium by 1.2.' }],
      explain: <>k<sub>s</sub> = 5% + 6% × 1.2 = 5% + 7.2% = <b>12.2%</b>.</>,
    },
    {
      id: 'capm-price',
      kind: 'number',
      unit: '$',
      prompt: <>The same stock will pay <b>$2.44</b> next year and dividends grow at <b>4%</b> forever. Using the required return from question 1, what is it worth?</>,
      answer: 2.44 / (0.122 - 0.04),
      traps: [{ value: 2.44 / 0.122, msg: 'Don’t forget growth: divide by (k_s − g).' }, { value: (2.44 * 1.04) / 0.082, msg: '$2.44 is already next year’s dividend. Don’t grow it again.' }],
      explain: <>P₀ = 2.44 / (0.122 − 0.04) = 2.44 / 0.082 = <b>$29.76</b>.</>,
    },
    {
      id: 'beta',
      kind: 'number',
      unit: '',
      prompt: <>A stock sells for <b>$40</b>, will pay <b>$2</b> at year-end, and grows at <b>7%</b> forever. k<sub>RF</sub> = <b>6%</b> and the market risk premium is <b>6%</b>. If the stock is in equilibrium, what is its beta?</>,
      answer: 1,
      tol: 0.01,
      traps: [{ value: 2, msg: 'Check k_s first: k_s = D₁/P₀ + g = 5% + 7% = 12%. Then 12% = 6% + 6% × b.' }],
      explain: <>Equilibrium: k<sub>s</sub> = D₁/P₀ + g = 2/40 + 0.07 = 12%. CAPM: 12% = 6% + 6% × b, so b = <b>1.00</b> (Black Book Q60).</>,
    },
    {
      id: 'beta-up',
      kind: 'mcq',
      prompt: <>A firm takes on a risky new project. Its beta rises, while its expected dividends and growth stay the same. What happens to its equilibrium price?</>,
      choices: ['It rises: riskier stocks offer higher returns', 'It falls: the required return rises, so the same dividends are worth less', 'It doesn’t change: the dividends didn’t change', 'It rises only if the market risk premium falls'],
      answer: 1,
      why: ['Higher required returns are achieved by paying a LOWER price for the same dividends.', undefined, 'Value depends on both the dividends and the rate they are discounted at.', 'With the premium unchanged, a higher beta always raises k_s.'],
      explain: <>Higher b → higher k<sub>s</sub> (CAPM) → larger denominator k<sub>s</sub> − g → lower P₀. The price falls until the expected return is high enough to compensate for the extra risk.</>,
    },
    {
      id: 'equilibrium',
      kind: 'mcq',
      prompt: <>A stock trades at <b>$40</b>, will pay <b>$2.40</b> next year, and grows at <b>6%</b>. Its CAPM required return is <b>10%</b>. What should happen?</>,
      choices: [
        'Expected return is 12% > 10%: undervalued, so the price rises (to $60)',
        'Expected return is 12% > 10%: overvalued, so the price falls',
        'Expected return is 6%: below 10%, so the price falls',
        'Nothing: the market price is always correct',
      ],
      answer: 0,
      why: [undefined, 'An expected return ABOVE the required return means the stock is cheap, not expensive.', 'The expected return includes the dividend yield: 2.40/40 = 6%, plus g = 6%.', 'Equilibrium is where the market price settles, but only once expected = required.'],
      explain: <>k̂ = 2.40/40 + 6% = 12% &gt; 10%. Investors buy, the price rises, and it stops at D₁/(k<sub>s</sub> − g) = 2.40 / 0.04 = $60, where the expected return is exactly 10%.</>,
    },
  ],
  takeaways: [
    'CAPM: k_s = k_RF + (k_M − k_RF) × b. More market risk → higher required return.',
    'Higher required return → lower price for the same dividends.',
    'Expected return = D₁/P₀ + g. Equilibrium: expected = required.',
    'Expected > required → undervalued → the price rises (and vice versa).',
  ],
};

export default lesson;
