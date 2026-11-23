'use client';
// Lesson 7: the free cash flow (corporate value) model from the Black Book. Two waterfalls: building FCF from
// operating numbers, then going from firm value to equity value to price per share.
import { useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Presets, Slider, Stat, SvgBar, Vars, Viz, Worked, scale } from '@/components/learn/kit';
import { corporateValue, freeCashFlow, money, pct } from './math';

type F = { ebit: number; tax: number; dep: number; capex: number; nowc: number };
type V = { fcf: number; wacc: number; g: number; claims: number; shares: number };

/** Generic waterfall: steps add (+) or subtract (−) from a running total; `total` steps draw from zero. */
function Waterfall({ steps, unit }: { steps: { label: string; value: number; kind: 'add' | 'sub' | 'total' }[]; unit: string }) {
  let run = 0;
  const bars = steps.map((s) => {
    const start = s.kind === 'total' ? 0 : run;
    const end = s.kind === 'total' ? s.value : s.kind === 'add' ? run + s.value : run - s.value;
    run = end;
    return { ...s, start, end };
  });
  const lo = Math.min(0, ...bars.map((b) => Math.min(b.start, b.end)));
  const hi = Math.max(...bars.map((b) => Math.max(b.start, b.end))) * 1.12 || 1;
  const W = 640, H = 220, L = 8, B = 40, T = 22;
  const x = scale(0, steps.length, L, W - 8);
  const y = scale(lo, hi, H - B, T);
  const bw = Math.min(90, ((W - L) / steps.length) * 0.66);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Waterfall">
      <line className="axis" x1={L} x2={W - 4} y1={y(0)} y2={y(0)} />
      {bars.map((b, i) => {
        const cx = x(i + 0.5);
        const fill = b.kind === 'total' ? (b.end < 0 ? 'var(--red)' : 'var(--cyan)') : b.kind === 'add' ? 'var(--green)' : 'var(--red)';
        return (
          <g key={b.label}>
            <SvgBar x={cx - bw / 2} width={bw} base={y(b.start)} top={y(b.end)} fill={fill} strokeWidth={2} label={`${b.label}: ${money(b.value, 0)}${unit}`} />
            {i < bars.length - 1 && <line x1={cx + bw / 2} x2={x(i + 1.5) - bw / 2} y1={y(b.end)} y2={y(b.end)} stroke="var(--muted)" strokeDasharray="3 3" />}
            <text className="lbl" x={cx} y={Math.min(y(b.start), y(b.end)) - 6} textAnchor="middle">{b.kind === 'sub' ? '−' : b.kind === 'add' && i > 0 ? '+' : ''}{money(Math.abs(b.value), 0)}{unit}</text>
            <text className="wf" x={cx} y={H - 22} textAnchor="middle">{b.label.split('|')[0]}</text>
            {b.label.includes('|') && <text className="wf" x={cx} y={H - 8} textAnchor="middle">{b.label.split('|')[1]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function BuildFcf({ f, set }: { f: F; set: (p: Partial<F>) => void }) {
  const fcf = freeCashFlow(f.ebit, f.tax, f.dep, f.capex, f.nowc);
  const is = (p: F) => JSON.stringify(p) === JSON.stringify(f);
  const franklin = { ebit: 300, tax: 0.4, dep: 50, capex: 100, nowc: 60 };
  const keane = { ebit: 800, tax: 0.4, dep: 75, capex: 255, nowc: 0 };
  return (
    <Viz
      title="1 · Build next year’s free cash flow"
      tryThis={['Raise capital expenditures: profits stay the same, but the cash left for investors shrinks.', 'Raise depreciation: it is subtracted to get EBIT but isn’t a cash payment, so FCF adds it back.']}
      caption={<>Free cash flow is the cash left for <b>all</b> investors (debt, preferred and common) after the firm pays its operating taxes and funds its investments: <b>FCF₁ = {money(fcf, 0)}M</b>.</>}
    >
      <Presets items={[{ label: 'Franklin Electric (BB)', onClick: () => set(franklin), active: is(franklin) }, { label: 'Keane Investment (BB)', onClick: () => set(keane), active: is(keane) }]} />
      <div className="controls">
        <Slider label="EBIT ($M)" value={f.ebit} min={50} max={1000} step={5} onChange={(ebit) => set({ ebit })} format={(v) => money(v, 0)} />
        <Slider label="Tax rate T" value={f.tax} min={0} max={0.5} step={0.01} onChange={(tax) => set({ tax })} format={(v) => pct(v, 0)} />
        <Slider label="Depreciation ($M)" value={f.dep} min={0} max={200} step={5} onChange={(dep) => set({ dep })} format={(v) => money(v, 0)} />
        <Slider label="Capital expenditures ($M)" value={f.capex} min={0} max={400} step={5} onChange={(capex) => set({ capex })} format={(v) => money(v, 0)} />
        <Slider label="Increase in NOWC ($M)" value={f.nowc} min={0} max={150} step={5} onChange={(nowc) => set({ nowc })} format={(v) => money(v, 0)} />
      </div>
      <Waterfall unit="M" steps={[
        { label: 'EBIT(1−T)|after-tax', value: f.ebit * (1 - f.tax), kind: 'total' },
        { label: 'Depreciation|added back', value: f.dep, kind: 'add' },
        { label: 'CapEx|invested', value: f.capex, kind: 'sub' },
        { label: 'Δ NOWC|invested', value: f.nowc, kind: 'sub' },
        { label: 'FCF₁', value: fcf, kind: 'total' },
      ]} />
    </Viz>
  );
}

function ValueFirm({ v, set, fcfFromAbove }: { v: V; set: (p: Partial<V>) => void; fcfFromAbove: number }) {
  const res = corporateValue(v.fcf, v.wacc, v.g, v.claims, v.shares);
  const hark = { fcf: 25, wacc: 0.1, g: 0.07, claims: 200, shares: 30 };
  const rein = { fcf: 300, wacc: 0.11, g: 0.07, claims: 500, shares: 150 };
  const is = (p: V) => JSON.stringify(p) === JSON.stringify(v);
  return (
    <Viz
      title="2 · From firm value to price per share"
      tryThis={['Load Harkleroad, then double the debt & preferred: the price per share drops dollar for dollar.', 'Move g toward WACC: the firm value explodes, just like Gordon.']}
      caption={res
        ? <>The FCFs belong to everyone who financed the firm, so discounting them at the <b>WACC</b> gives the value of the <b>whole firm</b>. Subtract the claims that come before common stock (debt and preferred) to get the equity, then divide by the shares.</>
        : <>g must be below the WACC for the constant-growth firm value to exist.</>}
    >
      <Presets items={[
        { label: 'Harkleroad (BB)', onClick: () => set(hark), active: is(hark) },
        { label: 'Rein Corp (BB)', onClick: () => set(rein), active: is(rein) },
        { label: `Use FCF from step 1 (${money(fcfFromAbove, 0)}M)`, onClick: () => set({ fcf: Math.max(1, Math.round(fcfFromAbove)) }) },
      ]} />
      <div className="controls">
        <Slider label="Next year’s FCF₁ ($M)" value={v.fcf} min={1} max={600} step={1} onChange={(fcf) => set({ fcf })} format={(x) => money(x, 0)} />
        <Slider label="WACC" value={v.wacc} min={0.05} max={0.16} step={0.0025} onChange={(wacc) => set({ wacc })} format={(x) => pct(x, 2)} />
        <Slider label="FCF growth g" value={v.g} min={0} max={0.12} step={0.0025} onChange={(g) => set({ g })} format={(x) => pct(x, 2)} />
        <Slider label="Debt + preferred ($M)" value={v.claims} min={0} max={10000} step={25} onChange={(claims) => set({ claims })} format={(x) => money(x, 0)} />
        <Slider label="Shares outstanding (M)" value={v.shares} min={1} max={300} step={1} onChange={(shares) => set({ shares })} format={(x) => `${x}M`} />
      </div>
      {res ? (
        <>
          <Waterfall unit="M" steps={[
            { label: 'Firm value|FCF₁/(WACC−g)', value: res.firm, kind: 'total' },
            { label: 'Debt &|preferred', value: v.claims, kind: 'sub' },
            { label: 'Equity|value', value: res.equity, kind: 'total' },
          ]} />
          <div className="readouts">
            <Stat label="Firm value" value={`${money(res.firm, 0)}M`} tone="blue" sub={`${money(v.fcf, 0)} / ${pct(v.wacc - v.g, 2)}`} />
            <Stat label="Equity value" value={`${money(res.equity, 0)}M`} tone={res.equity > 0 ? 'green' : 'red'} />
            <Stat label="Price per share" value={res.equity > 0 ? money(res.price) : '$0.00'} tone="gold" sub={`÷ ${v.shares}M shares`} />
          </div>
          {res.equity <= 0 && <div className="lverdict bad" role="alert">The debt and preferred claims exceed the firm’s value, so nothing is left for common stockholders under these assumptions.</div>}
        </>
      ) : (
        <div className="lverdict bad" role="alert">g = {pct(v.g, 2)} is not below WACC = {pct(v.wacc, 2)}: the formula FCF₁ / (WACC − g) doesn’t apply.</div>
      )}
    </Viz>
  );
}

function Explore() {
  const [f, setF] = useState<F>({ ebit: 300, tax: 0.4, dep: 50, capex: 100, nowc: 60 });
  const [v, setV] = useState<V>({ fcf: 25, wacc: 0.1, g: 0.07, claims: 200, shares: 30 });
  return (
    <>
      <BuildFcf f={f} set={(p) => setF((x) => ({ ...x, ...p }))} />
      <ValueFirm v={v} set={(p) => setV((x) => ({ ...x, ...p }))} fcfFromAbove={freeCashFlow(f.ebit, f.tax, f.dep, f.capex, f.nowc)} />
    </>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="Value the whole company, then take your slice">
        <p>The dividend models value one share through the dividends it pays. The <strong>free cash flow model</strong> (the corporate value model) takes a different route: it values the <strong>entire firm</strong> from the cash its operations generate, then works out what belongs to common stockholders.</p>
        <p>Think of the firm as a pie owned by its debt holders, preferred stockholders and common stockholders. The FCF model sizes the whole pie, removes the debt and preferred slices, and splits what’s left across the shares.</p>
      </Block>
      <Block title="What is free cash flow?">
        <p>The cash the business throws off after paying taxes on its operating profit and after investing what it needs to keep growing (new fixed assets and working capital). It is “free” to be paid to <strong>all</strong> investors.</p>
      </Block>
      <Callout tone="tip" title="Same maths, new inputs">
        If FCF grows at a constant rate, firm value = FCF₁ / (WACC − g): the Gordon formula again, with FCF instead of dividends and the WACC instead of r<sub>s</sub>.
      </Callout>
    </>
  ),
  explore: <Explore />,
  formula: (
    <>
      <Block title="Free cash flow">
        <Formula big><M>FCF = EBIT(1 − T) + Depreciation − Capital expenditures − ΔNOWC</M></Formula>
        <Vars rows={[
          ['EBIT(1 − T)', 'After-tax operating income'],
          ['Depreciation', 'Non-cash expense, added back'],
          ['CapEx', 'Gross capital expenditures'],
          ['ΔNOWC', 'Increase in net operating working capital'],
        ]} />
      </Block>
      <Block title="Corporate value model">
        <Formula note="Constant growth from next year. Valid only when g < WACC."><M>V<sub>firm</sub></M> = <Frac n={<M>FCF<sub>1</sub></M>} d={<M>WACC − g</M>} /></Formula>
        <Formula note="Subtract the claims ahead of common stock, then divide by the shares."><M>V<sub>equity</sub> = V<sub>firm</sub> − Debt − Preferred</M>,&nbsp;&nbsp; <M>P<sub>0</sub></M> = <Frac n={<M>V<sub>equity</sub></M>} d="shares" /></Formula>
        <p>Nonconstant FCFs work exactly like lesson 5: discount each explicit FCF at the WACC, add a horizon value FCF<sub>N+1</sub> / (WACC − g) at year N, discounted N years.</p>
      </Block>
      <Block title="Assumptions">
        <ul>
          <li>FCF goes to all investors, so it is discounted at the WACC (the blended required return of all of them).</li>
          <li>FCF eventually grows at a constant g &lt; WACC forever.</li>
          <li>Debt and preferred are taken at their market values today.</li>
        </ul>
      </Block>
      <Block title="Worked examples">
        <Worked title="Rein Corp (BB): FCF₁ = $300M, g = 7%, WACC = 11%, debt + preferred = $500M, 150M shares" steps={['Firm value = 300 / (0.11 − 0.07) = $7,500M', 'Equity = 7,500 − 500 = $7,000M', 'Price = 7,000 / 150']} result="P₀ = $46.67" />
        <Worked title="Burress (BB): FCF = $3,000, $4,000, $5,000 in years 1–3, then 6% growth; WACC 10%; debt + preferred $25,000; 1,000 shares" steps={['Horizon value at year 3: 5,000 × 1.06 / (0.10 − 0.06) = 132,500', 'Firm value = 3,000/1.10 + 4,000/1.10² + (5,000 + 132,500)/1.10³ = 109,338.84', 'Equity = 109,338.84 − 25,000 = 84,338.84', 'Price = 84,338.84 / 1,000']} result="P₀ = $84.34" />
      </Block>
    </>
  ),
  checks: [
    {
      id: 'harkleroad',
      kind: 'number',
      unit: '$',
      prompt: <>Next year’s free cash flow is <b>$25 million</b>, growing at <b>7%</b> a year forever. The WACC is <b>10%</b>. The firm has <b>$200 million</b> of debt and preferred stock and <b>30 million</b> shares. What is the price per share?</>,
      answer: (25 / 0.03 - 200) / 30,
      traps: [{ value: 25 / 0.03 / 30, msg: 'That is the whole firm per share. Subtract the $200M of debt and preferred first.' }, { value: (25 / 0.1 - 200) / 30, msg: 'Firm value uses (WACC − g) = 3%, not the WACC alone.' }],
      explain: <>Firm = 25 / (0.10 − 0.07) = $833.33M. Equity = 833.33 − 200 = $633.33M. Price = 633.33 / 30 = <b>$21.11</b> (Black Book Q62).</>,
    },
    {
      id: 'build-fcf',
      kind: 'number',
      unit: '$',
      prompt: <>Projected EBIT is <b>$300M</b>, the tax rate is <b>40%</b>, depreciation is <b>$50M</b>, capital expenditures are <b>$100M</b>, and net operating working capital increases by <b>$60M</b>. What is next year’s FCF, in $ millions?</>,
      answer: 70,
      traps: [{ value: 130, msg: 'The increase in working capital is an investment too: subtract it.' }, { value: 190, msg: 'Apply the tax rate to EBIT first: 300 × (1 − 0.40) = 180.' }, { value: -30, msg: 'Depreciation is added back: it was subtracted to get EBIT but no cash left the firm.' }],
      explain: <>FCF = 300(1 − 0.40) + 50 − 100 − 60 = 180 + 50 − 100 − 60 = <b>$70M</b> (Black Book Q112, step 1).</>,
    },
    {
      id: 'fcf-price',
      kind: 'number',
      unit: '$',
      prompt: <>Continuing: FCF of <b>$70M</b> grows at <b>6%</b> forever, the WACC is <b>10%</b>, debt and preferred total <b>$500M</b>, and there are <b>20M</b> shares. What is the price per share?</>,
      answer: 62.5,
      traps: [{ value: 87.5, msg: 'That is firm value per share. Subtract debt and preferred before dividing.' }],
      explain: <>Firm = 70 / 0.04 = $1,750M. Equity = 1,750 − 500 = $1,250M. Price = 1,250 / 20 = <b>$62.50</b>.</>,
    },
    {
      id: 'why-wacc',
      kind: 'mcq',
      prompt: <>Why does the corporate value model discount free cash flows at the WACC rather than at the cost of equity?</>,
      choices: [
        'Because the WACC is always lower, which gives a higher, safer value',
        'Because FCF is available to all investors (debt, preferred and common), so its value is the value of the whole firm',
        'Because the cost of equity can’t be estimated with the CAPM',
        'Because free cash flows don’t grow',
      ],
      answer: 1,
      why: ['The rate must match whose cash flows they are, not give a convenient number.', undefined, 'It can, but it’s the wrong rate for cash that belongs to everyone.', 'FCFs can grow; the model even assumes they do, at g.'],
      explain: <>FCF is the cash available to everyone who financed the firm, so discounting it at their blended required return (the WACC) gives the value of the whole company. That is why debt and preferred are subtracted afterwards.</>,
    },
    {
      id: 'more-debt',
      kind: 'mcq',
      prompt: <>Two firms have identical FCFs, growth and WACC, so the same firm value. Firm B has $300M more debt; both have 30M shares. How do their share prices compare?</>,
      choices: ['They are equal: firm values are equal', 'Firm B’s price is $10 lower per share', 'Firm B’s price is higher: debt is cheaper than equity', 'Firm B’s price is $300 lower per share'],
      answer: 1,
      why: ['Equal firm values, but more of B’s value belongs to its creditors.', undefined, 'Here the WACC is the same by assumption, so the extra debt just reduces equity.', '$300M spread across 30M shares is $10 per share, not $300.'],
      explain: <>Equity = firm value − debt − preferred. $300M more debt means $300M less equity: $300M / 30M shares = <b>$10 less per share</b>.</>,
    },
  ],
  takeaways: [
    'FCF = EBIT(1 − T) + depreciation − CapEx − ΔNOWC.',
    'Firm value = FCF₁ / (WACC − g), discounted at the WACC because FCF belongs to all investors.',
    'Equity = firm value − debt − preferred; price = equity / shares.',
    'Nonconstant FCFs: same horizon-value method as nonconstant dividends.',
  ],
};

export default lesson;
