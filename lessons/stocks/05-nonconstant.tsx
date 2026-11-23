'use client';
// Lesson 5: nonconstant (two-stage) growth. A step-by-step builder animates the three moves of the method:
// grow each dividend, park the Gordon horizon value at year N (using D(N+1)), then discount everything to today.
// It also shows how much of the price comes from the horizon value and what the classic timing mistake costs.
import { useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Presets, Slider, Stat, SvgBar, Vars, Viz, Worked, scale } from '@/components/learn/kit';
import { Btn } from '@/components/ui';
import { money, pct, twoStage } from './math';

type S = { d0: number; g1: number; n: number; g2: number; r: number };
const PRESETS: { label: string; s: S }[] = [
  { label: 'Warren Industries (slides)', s: { d0: 1.5, g1: 0.1, n: 3, g2: 0.05, r: 0.15 } },
  { label: 'Supernormal: 20% for 2 yrs', s: { d0: 1, g1: 0.2, n: 2, g2: 0.05, r: 0.12 } },
  { label: 'Patent expires in 4 yrs', s: { d0: 2, g1: 0.15, n: 4, g2: 0.03, r: 0.12 } },
];
const STEPS = ['Set up the timeline', '1 · Grow each dividend', '2 · Park the horizon value at year N', '3 · Discount everything to today'];

function Builder() {
  const [s, setS] = useState<S>(PRESETS[0].s);
  const [step, setStep] = useState(0);
  const [mistake, setMistake] = useState(false);
  const set = (p: Partial<S>) => setS((x) => ({ ...x, ...p }));
  const v = twoStage(s.d0, s.g1, s.n, s.g2, s.r);
  const W = 640, H = 250, L = 40, B = 30, T = 18;
  const x = scale(-0.6, s.n + 1.6, L, W - 6);
  const bw = Math.min(46, ((W - L) / (s.n + 2.2)) * 0.6);

  if (!v) {
    return (
      <Viz title="Two-stage builder">
        <Controls s={s} set={set} />
        <div className="lverdict bad" role="alert">The long-run growth rate g₂ = {pct(s.g2, 1)} must be below r = {pct(s.r, 1)}: the horizon value P<sub>N</sub> = D<sub>N+1</sub> / (r − g₂) only exists when r &gt; g₂. (The first-stage rate g₁ may exceed r: that stage is finite.)</div>
      </Viz>
    );
  }
  const maxY = (v.horizon + v.divs[s.n - 1]) * 1.12;
  const y = scale(0, maxY, H - B, T);
  const base = H - B;
  const pvSum = v.pvDivs.reduce((a, b) => a + b, 0);
  const wrong = pvSum + v.horizon / (1 + s.r) ** (s.n + 1);
  const shareH = v.pvHorizon / v.price;
  const disc = step >= 3;
  return (
    <Viz
      title="Two-stage builder"
      tryThis={[
        'Press “Next step” three times and watch each move of the method.',
        'Make g₁ bigger than r (try 30%): still fine, because that stage only lasts N years.',
        'Lengthen the high-growth stage N: more of the value sits in dividends, but the horizon value still dominates.',
      ]}
      caption={<>{STEPS[step]}. {step === 0 && 'Dividends grow at g₁ for N years, then at g₂ forever.'}{step === 1 && `D₁…D${sub(s.n)} each grow by (1 + g₁). D${sub(s.n + 1)} grows by (1 + g₂): it is the first “constant” dividend and is only used for the horizon value.`}{step === 2 && `From year ${s.n} on, the stock is a constant-growth stock, so its price then is P${sub(s.n)} = D${sub(s.n + 1)} / (r − g₂) = ${money(v.dNext)} / ${pct(s.r - s.g2, 1)} = ${money(v.horizon)}.`}{step === 3 && `Each dividend is discounted by its own year and P${sub(s.n)} by ${s.n} years. ${pct(shareH, 0)} of today’s value comes from the horizon value.`}</>}
    >
      <Presets items={PRESETS.map((p) => ({ label: p.label, onClick: () => { setS(p.s); setStep(0); }, active: JSON.stringify(p.s) === JSON.stringify(s) }))} />
      <Controls s={s} set={set} />
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two-stage dividend timeline">
        <rect x={x(0.5)} y={T - 14} width={x(s.n + 0.5) - x(0.5)} height={H - B - T + 14} fill="color-mix(in srgb, var(--orange) 22%, transparent)" />
        <rect x={x(s.n + 0.5)} y={T - 14} width={W - 6 - x(s.n + 0.5)} height={H - B - T + 14} fill="color-mix(in srgb, var(--cyan) 20%, transparent)" />
        <text className="lbl" x={(x(0.5) + x(s.n + 0.5)) / 2} y={T - 2} textAnchor="middle">g₁ = {pct(s.g1, 1)} for {s.n} yr</text>
        <text className="lbl" x={Math.min(W - 50, x(s.n + 1))} y={T - 2} textAnchor="middle">g₂ = {pct(s.g2, 1)} forever →</text>
        <line className="axis" x1={L} x2={W - 4} y1={base} y2={base} />
        {/* today: P0 stack after discounting */}
        <SvgBar x={x(0) - bw / 2} width={bw} base={base} top={disc ? y(pvSum) : base} fill="var(--yellow)" delay={disc ? 0.5 : 0} label={`PV of dividends ${money(pvSum)}`} />
        <SvgBar x={x(0) - bw / 2} width={bw} base={disc ? y(pvSum) : base} top={disc ? y(v.price) : base} fill="var(--green)" strokeWidth={2} delay={disc ? 0.7 : 0} label={`PV of horizon value ${money(v.pvHorizon)}`} />
        {disc && <text className="lbl" x={x(0)} y={y(v.price) - 6} textAnchor="middle">P₀ {money(v.price)}</text>}
        {v.divs.map((d, i) => {
          const t = i + 1;
          const h = step >= 1 ? (disc ? v.pvDivs[i] : d) : 0;
          return <SvgBar key={t} x={x(t) - bw / 2} width={bw} base={base} top={y(h)} fill="var(--yellow)" delay={step === 1 ? i * 0.12 : 0} label={`D${t} = ${money(d)}, PV ${money(v.pvDivs[i])}`} />;
        })}
        {/* horizon value stacked on D_N */}
        <SvgBar
          x={x(s.n) - bw / 2}
          width={bw}
          base={y(step >= 1 ? (disc ? v.pvDivs[s.n - 1] : v.divs[s.n - 1]) : 0)}
          top={y((step >= 1 ? (disc ? v.pvDivs[s.n - 1] : v.divs[s.n - 1]) : 0) + (step >= 2 ? (disc ? v.pvHorizon : v.horizon) : 0))}
          fill="var(--green)"
          strokeWidth={2}
          label={`Horizon value P${s.n} = ${money(v.horizon)}`}
        />
        {step >= 2 && (
          <text className="lbl" x={x(s.n)} y={y(v.divs[s.n - 1] * (disc ? 0 : 1) + (disc ? v.pvDivs[s.n - 1] + v.pvHorizon : v.horizon)) - 6} textAnchor="middle">
            {disc ? `PV ${money(v.pvHorizon)}` : `P${sub(s.n)} = ${money(v.horizon)}`}
          </text>
        )}
        {/* D(N+1): only feeds the horizon value */}
        {step >= 1 && (
          <g opacity={disc ? 0.25 : 1}>
            <rect x={x(s.n + 1) - bw / 2} y={y(v.dNext)} width={bw} height={base - y(v.dNext)} fill="none" stroke="var(--k)" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={x(s.n + 1)} y={y(v.dNext) - 6} textAnchor="middle">D{sub(s.n + 1)} {money(v.dNext)}</text>
          </g>
        )}
        {step === 2 && (
          <path d={`M ${x(s.n + 1) - bw / 2} ${y(v.dNext) - 18} Q ${x(s.n + 0.5)} ${y(v.horizon * 0.6)} ${x(s.n) + bw / 2 + 2} ${y(v.horizon * 0.55)}`} fill="none" stroke="var(--k)" strokeWidth={2} markerEnd="url(#arrow5)" />
        )}
        <defs><marker id="arrow5" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--k)" /></marker></defs>
        {Array.from({ length: s.n + 2 }, (_, t) => <text key={t} x={x(t)} y={H - 10} textAnchor="middle">{t === 0 ? 'today' : `yr ${t}`}</text>)}
      </svg>
      <div className="presets" role="group" aria-label="Steps">
        {STEPS.map((label, i) => <button key={i} className={step === i ? 'on' : ''} onClick={() => setStep(i)}>{i === 0 ? 'Start' : `Step ${i}`}</button>)}
        <span style={{ flex: 1 }} />
        <Btn variant="blue" onClick={() => setStep((k) => (k + 1) % STEPS.length)}>{step === 3 ? 'Replay' : 'Next step'}</Btn>
      </div>
      {step === 3 && (
        <>
          <div className="split-bar" aria-label="Where the value comes from">
            <div style={{ width: `${(1 - shareH) * 100}%`, background: 'var(--yellow)' }}>{1 - shareH > 0.18 ? `dividends ${money(pvSum)}` : ''}</div>
            <div style={{ width: `${shareH * 100}%`, background: 'var(--green)' }}>{shareH > 0.18 ? `horizon value ${money(v.pvHorizon)}` : ''}</div>
          </div>
          <div className="readouts">
            <Stat label="PV of D₁…D_N" value={money(pvSum)} tone="gold" />
            <Stat label={`PV of P${sub(s.n)}`} value={money(v.pvHorizon)} tone="green" sub={`${money(v.horizon)} / ${(1 + s.r).toFixed(2)}^${s.n}`} />
            <Stat label="P₀" value={money(v.price)} tone="blue" />
          </div>
          <label className="toggle-inline">
            <input type="checkbox" checked={mistake} onChange={(e) => setMistake(e.target.checked)} /> Show the classic mistake: discounting P{sub(s.n)} for {s.n + 1} years
          </label>
          {mistake && (
            <div className="lverdict bad">P{sub(s.n)} is a price <b>at year {s.n}</b> (it is computed from D{sub(s.n + 1)}, one year later). Discounting it {s.n + 1} years gives {money(wrong)}: {money(v.price - wrong)} too low.</div>
          )}
        </>
      )}
    </Viz>
  );
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
function sub(n: number) { return String(n).split('').map((c) => SUBS[Number(c)]).join(''); }

function Controls({ s, set }: { s: S; set: (p: Partial<S>) => void }) {
  return (
    <div className="controls">
      <Slider label="Dividend just paid D₀" value={s.d0} min={0.5} max={4} step={0.05} onChange={(d0) => set({ d0 })} format={(v) => money(v)} />
      <Slider label="High growth g₁" value={s.g1} min={-0.1} max={0.4} step={0.01} onChange={(g1) => set({ g1 })} format={(v) => pct(v, 0)} />
      <Slider label="Years of high growth N" value={s.n} min={1} max={8} step={1} onChange={(n) => set({ n })} format={(v) => `${v} yr`} />
      <Slider label="Long-run growth g₂" value={s.g2} min={0} max={0.12} step={0.005} onChange={(g2) => set({ g2 })} format={(v) => pct(v, 1)} />
      <Slider label="Required return r" value={s.r} min={0.06} max={0.2} step={0.005} onChange={(r) => set({ r })} format={(v) => pct(v, 1)} />
    </div>
  );
}

/** Custom assessment: tap the year where the horizon value belongs (Home Place Hotels). */
function HorizonYear({ submit, locked }: { submit: (ok: boolean, msg?: React.ReactNode) => void; locked: boolean }) {
  const [pick, setPick] = useState<number | null>(null);
  const growth = ['0%', '5%', '5%', '15%', '10% → forever', '10%'];
  return (
    <div className="chk">
      <div className="tap-years" role="radiogroup" aria-label="Year of the horizon value">
        {growth.map((g, i) => (
          <button key={i} role="radio" aria-checked={pick === i + 1} className={pick === i + 1 ? 'sel' : ''} disabled={locked} onClick={() => setPick(i + 1)}>
            Yr {i + 1}<br /><small style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}>g = {g}</small>
          </button>
        ))}
      </div>
      <div>
        <Btn variant="primary" disabled={pick === null || locked} onClick={() => pick !== null && submit(pick === 4, pick === 5 ? 'Year 5 is where constant growth STARTS: D₅ is the first constant dividend. The Gordon value that uses D₅ is a price one year earlier.' : pick === 4 ? undefined : 'Look for the last year before growth becomes constant.')}>Check</Btn>
      </div>
    </div>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="When constant growth is unrealistic">
        <p>Assuming one growth rate forever doesn’t fit many firms. A company with a patent, a new product or a competitive advantage may grow <strong>faster than r</strong> for a few years, then settle down to a normal rate. Others grow slowly during a restructuring, then speed up.</p>
        <p>The slides’ example: a firm grows 15% until its patents expire in four years, then 3% forever. That is a <strong>two-stage</strong> (variable growth) stock.</p>
      </Block>
      <Block title="The method in one sentence">
        <p>Grow the dividend year by year until growth becomes constant; at that point the stock <em>is</em> a constant-growth stock, so price it with Gordon; then discount everything back to today.</p>
      </Block>
      <Callout tone="warn" title="Where students lose marks">
        Timing. The horizon value P<sub>N</sub> = D<sub>N+1</sub> / (r − g₂) is a price at year <b>N</b>, the last year before constant growth, even though it uses the dividend at N + 1. Discount it N years, not N + 1.
      </Callout>
    </>
  ),
  explore: <Builder />,
  formula: (
    <>
      <Block title="Two-stage valuation">
        <Formula note="Step 1: list each dividend through D(N+1). Step 2: horizon value at year N.">
          <M>D<sub>t</sub> = D<sub>0</sub>(1 + g<sub>1</sub>)<sup>t</sup></M>&nbsp;(t ≤ N),&nbsp;&nbsp; <M>D<sub>N+1</sub> = D<sub>N</sub>(1 + g<sub>2</sub>)</M>,&nbsp;&nbsp; <M>P<sub>N</sub></M> = <Frac n={<M>D<sub>N+1</sub></M>} d={<M>r − g<sub>2</sub></M>} />
        </Formula>
        <Formula big note="Step 3: discount each dividend by its own year and P_N by N years.">
          <M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>(1+r)</M>} /> + … + <Frac n={<M>D<sub>N</sub></M>} d={<M>(1+r)<sup>N</sup></M>} /> + <Frac n={<M>P<sub>N</sub></M>} d={<M>(1+r)<sup>N</sup></M>} />
        </Formula>
        <Vars rows={[
          [<>g<sub>1</sub></>, 'Growth rate during the first N years (may be above r)'],
          [<>g<sub>2</sub></>, 'Constant growth rate from year N + 1 on, forever (must be below r)'],
          ['N', 'Last year of nonconstant growth'],
          [<>P<sub>N</sub></>, 'Horizon (terminal) value: the stock’s price at year N'],
        ]} />
      </Block>
      <Block title="Assumptions">
        <ul>
          <li>Growth eventually becomes constant at g₂ &lt; r, forever. Without that, there is no horizon value.</li>
          <li>The early growth rates can be anything, even above r or negative, because that stage is finite.</li>
          <li>The horizon value often makes up most of the price, so the long-run assumptions matter a lot.</li>
        </ul>
      </Block>
      <Block title="Worked example (multi-stage): Home Place Hotels">
        <p>Last dividend $3.40. Growth 0% in year 1, 5% in years 2 and 3, 15% in year 4, then 10% forever. r = 14%.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>t</th><th>g</th><th>Dividend</th><th>PV at 14%</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>0%</td><td>3.4000</td><td>2.9825</td></tr>
              <tr><td>2</td><td>5%</td><td>3.5700</td><td>2.7470</td></tr>
              <tr><td>3</td><td>5%</td><td>3.7485</td><td>2.5301</td></tr>
              <tr><td>4</td><td>15%</td><td>4.3108</td><td>2.5523</td></tr>
              <tr><td>5</td><td>10%</td><td>4.7419 (only for P₄)</td><td>—</td></tr>
              <tr><td>P₄</td><td></td><td>4.7419 / 0.04 = 118.5463</td><td>70.1889</td></tr>
            </tbody>
          </table>
        </div>
        <Worked title="Add the PVs" steps={['2.9825 + 2.7470 + 2.5301 + 2.5523 + 70.1889']} result="P₀ = $81.00 (the most an investor requiring 14% should pay)" />
        <p className="small muted">Constant growth starts in year 5, so the horizon value sits at year 4. The slides’ Warren example gives $17.93 from rounded dividends; unrounded it is $17.90. Both are accepted here.</p>
      </Block>
    </>
  ),
  derivation: {
    title: 'Why g₁ may exceed r, but g₂ may not',
    body: (
      <>
        <p>The first stage is a <strong>finite</strong> growing annuity. Its sum has a closed form that works for any g₁ ≠ r:</p>
        <Formula><M>Σ<sub>t=1..N</sub> D<sub>1</sub>(1+g<sub>1</sub>)<sup>t−1</sup>/(1+r)<sup>t</sup></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>r − g<sub>1</sub></M>} /><M>[1 − ((1+g<sub>1</sub>)/(1+r))<sup>N</sup>]</M></Formula>
        <p>If g₁ &gt; r, both the bracket and the denominator are negative, so the result is still a positive, finite number: N terms always add up to something finite.</p>
        <p>The second stage runs <strong>forever</strong>, so it needs the infinite geometric series to converge, which requires (1 + g₂)/(1 + r) &lt; 1, i.e. g₂ &lt; r. That is why a temporary growth rate above r is allowed but a permanent one is not.</p>
      </>
    ),
  },
  checks: [
    {
      id: 'two-stage',
      kind: 'number',
      unit: '$',
      prompt: <>A stock <b>just paid $1.00</b>. Dividends grow <b>20%</b> for 2 years, then <b>5%</b> forever. r = <b>12%</b>. What is it worth?</>,
      answer: 19.4388,
      traps: [
        { value: 1.2 / 1.12 + 1.44 / 1.12 ** 2 + 21.6 / 1.12 ** 3, msg: 'P₂ is a price at year 2: discount it 2 years, not 3.' },
        { value: 1.05 / 0.07, msg: 'That ignores the high-growth years. Grow the dividends at 20% first.' },
        { value: 21.6, msg: 'That is P₂, the price at year 2. Discount it (and the dividends) back to today.' },
      ],
      explain: <>D₁ = 1.20, D₂ = 1.44, D₃ = 1.512. P₂ = 1.512 / (0.12 − 0.05) = 21.60. P₀ = 1.20/1.12 + (1.44 + 21.60)/1.12² = <b>$19.44</b>.</>,
      solution: (
        <ol>
          <li>Grow at 20%: D₁ = 1.00 × 1.20 = 1.20; D₂ = 1.20 × 1.20 = 1.44</li>
          <li>First constant dividend: D₃ = 1.44 × 1.05 = 1.512</li>
          <li>Horizon value at year 2: P₂ = 1.512 / 0.07 = 21.60</li>
          <li>PV: 1.20 / 1.12 = 1.0714; (1.44 + 21.60) / 1.2544 = 18.3673</li>
          <li>P₀ = 1.0714 + 18.3673 = 19.44</li>
        </ol>
      ),
    },
    {
      id: 'horizon-year',
      kind: 'custom',
      prompt: <>Home Place Hotels: growth is 0% in year 1, 5% in years 2–3, 15% in year 4, then a constant <b>10% from year 5 on</b>. At which year should the horizon value P<sub>N</sub> = D<sub>N+1</sub> / (r − g) sit? Tap it.</>,
      render: ({ submit, locked }) => <HorizonYear submit={submit} locked={locked} />,
      explain: <>Year <b>4</b>. D₅ is the first dividend of the constant-growth stage, and Gordon values that stream one period before it starts: P₄ = D₅ / (0.14 − 0.10) = $118.55, discounted 4 years.</>,
    },
    {
      id: 'warren-horizon',
      kind: 'number',
      unit: '$',
      prompt: <>Warren Industries: last dividend $1.50, growth <b>10%</b> for 3 years, then <b>5%</b> forever, r = <b>15%</b>. What is the horizon value P₃ (the price at year 3)?</>,
      answer: 20.96325,
      traps: [{ value: 1.9965 / 0.1, msg: 'P₃ uses D₄, the first constant-growth dividend: D₄ = D₃ × 1.05.' }, { value: 13.7837, msg: 'That is P₃ discounted to today. The question asks for the price at year 3.' }],
      explain: <>D₃ = 1.50 × 1.10³ = 1.9965; D₄ = 1.9965 × 1.05 = 2.0963; P₃ = 2.0963 / (0.15 − 0.05) = <b>$20.96</b> (the slide rounds to $21).</>,
    },
    {
      id: 'supernormal',
      kind: 'number',
      unit: '$',
      prompt: <>A firm just paid <b>$2.00</b>. Dividends grow <b>25%</b> a year for 3 years, then <b>6%</b> forever. r = <b>13%</b>. What is the stock worth today?</>,
      answer: 48.3621,
      traps: [
        { value: 2.212389 + 2.447333 + 2.707227 + 59.151786 / 1.13 ** 4, msg: 'P₃ is a price at year 3: discount it 3 years, not 4.' },
        { value: 59.1518, msg: 'That is P₃, the price at year 3. Discount it and the dividends back to today.' },
      ],
      explain: <>D₁ = 2.50, D₂ = 3.125, D₃ = 3.9063, D₄ = 4.1406. P₃ = 4.1406 / 0.07 = 59.15. P₀ = 2.2124 + 2.4473 + (3.9063 + 59.1518)/1.13³ = <b>$48.36</b>.</>,
      solution: (
        <ol>
          <li>D₁ = 2.00 × 1.25 = 2.50; D₂ = 3.125; D₃ = 3.90625</li>
          <li>D₄ = 3.90625 × 1.06 = 4.140625</li>
          <li>P₃ = 4.140625 / (0.13 − 0.06) = 59.1518</li>
          <li>PVs: 2.50/1.13 = 2.2124; 3.125/1.13² = 2.4473; (3.90625 + 59.1518)/1.13³ = 43.7024</li>
          <li>P₀ = 2.2124 + 2.4473 + 43.7024 = 48.36</li>
        </ol>
      ),
    },
    {
      id: 'why-allowed',
      kind: 'mcq',
      prompt: <>In the last question, dividends grew at 25% while r was only 13%. Why is that allowed here, when the constant-growth model needs r &gt; g?</>,
      choices: [
        'It isn’t allowed: the answer is meaningless',
        'Because the 25% stage lasts only 3 years, so its PV is a finite sum; only the stage that lasts forever needs g < r',
        'Because 25% is applied to D₀, not to D₁',
        'Because r is always assumed to be above every growth rate',
      ],
      answer: 1,
      why: ['The method is valid: g > r is only a problem for a stage that lasts forever.', undefined, 'Which dividend you start from doesn’t change the convergence condition.', 'Here r = 13% is clearly below 25%, and that’s fine for a finite stage.'],
      explain: <>A finite number of dividends always has a finite PV, whatever their growth. The perpetual stage (6% &lt; 13%) is the only one priced with Gordon, so it’s the only one that needs g &lt; r.</>,
    },
  ],
  takeaways: [
    'Grow each dividend through D(N+1), park P_N = D(N+1)/(r − g₂) at year N, discount it all back.',
    'P_N is discounted N years, not N + 1.',
    'Early growth may exceed r (finite stage); the perpetual rate g₂ must be below r.',
    'The horizon value is usually most of the price: long-run assumptions drive the estimate.',
  ],
};

export default lesson;
