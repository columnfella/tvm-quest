'use client';
// Lesson 1: the Dividend Discount Model idea. A share is worth the PV of the cash it pays you; the holding
// period does not change that value because the sale price is itself the PV of the dividends after it.
import { useState } from 'react';
import type { LessonContent } from '@/lib/learn';
import { Block, Callout, Formula, Frac, M, Slider, Stat, SvgBar, Vars, Viz, Worked, scale } from '@/components/learn/kit';
import { holdingSplit, money, pct, pv } from './math';

const D1 = 2;
const G = 0.04;

/** PV of every cash flow a holder receives over N years: dividends (gold) and the sale price (green). */
function HoldingPeriod({ r, setR }: { r: number; setR: (v: number) => void }) {
  const [years, setYears] = useState(3);
  const s = holdingSplit(D1, G, r, years)!;
  const W = 640, H = 210, L = 34, B = 26, T = 14;
  const lastPv = pv(D1 * (1 + G) ** (years - 1), r, years); // the year-N dividend; the sale bar stacks on it
  const top = s.pvSale + lastPv;
  const maxY = top * 1.15;
  const x = scale(0, years + 1, L, W - 8);
  const y = scale(0, maxY, H - B, T);
  const bw = Math.max(3, Math.min(34, ((W - L) / (years + 1)) * 0.7));
  const divShare = s.pvDivs / s.p0;
  return (
    <Viz
      title="Holding-period explorer"
      tryThis={[
        'Drag the holding period from 1 to 40 years. Watch the total stay put while its make-up changes.',
        'Raise the required return: every bar shrinks, so the value falls, whatever the holding period.',
      ]}
      caption={
        <>Holding {years} year{years === 1 ? '' : 's'}: <b>{pct(divShare, 0)}</b> of today’s value comes from dividends you collect, <b>{pct(1 - divShare, 0)}</b> from the sale price. The total is always <b>{money(s.p0)}</b>, because the buyer pays you the PV of the dividends that come after you sell.</>
      }
    >
      <p className="small muted">Company: next dividend <M>D<sub>1</sub></M> = {money(D1)}, dividends grow 4% a year. You buy today, collect dividends for N years, then sell at the price the next investor will pay.</p>
      <div className="controls">
        <Slider label="Holding period N" value={years} min={1} max={40} step={1} onChange={setYears} format={(v) => `${v} yr`} />
        <Slider label="Required return r" value={r} min={0.06} max={0.16} step={0.005} onChange={setR} format={(v) => pct(v, 1)} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Present value of dividends and of the year-${years} sale price`}>
        <line className="axis" x1={L} x2={W - 4} y1={H - B} y2={H - B} />
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line className="grid" x1={L} x2={W - 4} y1={y(maxY * f)} y2={y(maxY * f)} />
            <text x={L - 4} y={y(maxY * f) + 4} textAnchor="end">{money(maxY * f, 0)}</text>
          </g>
        ))}
        {Array.from({ length: years }, (_, i) => {
          const t = i + 1;
          const v = pv(D1 * (1 + G) ** i, r, t);
          return <SvgBar key={t} x={x(t) - bw / 2} width={bw} base={H - B} top={y(v)} fill="var(--yellow)" label={`Year ${t} dividend, PV ${money(v)}`} />;
        })}
        <SvgBar x={x(years) - bw / 2} width={bw} base={y(lastPv)} top={y(top)} fill="var(--green)" strokeWidth={2} label={`Sale price at year ${years}, PV ${money(s.pvSale)}`} />
        <text className="lbl" x={Math.max(L + 50, Math.min(x(years), W - 60))} y={y(top) - 6} textAnchor="middle">PV of sale {money(s.pvSale)}</text>
        {[1, years].filter((t, i, a) => a.indexOf(t) === i).map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle">yr {t}</text>)}
      </svg>
      <div className="legend"><span><i style={{ background: 'var(--yellow)' }} />PV of each dividend</span><span><i style={{ background: 'var(--green)' }} />PV of the sale price P<sub>N</sub></span></div>
      <div className="split-bar" aria-label="Value split">
        <div style={{ width: `${divShare * 100}%`, background: 'var(--yellow)' }}>{divShare > 0.18 ? `Dividends ${money(s.pvDivs)}` : ''}</div>
        <div style={{ width: `${(1 - divShare) * 100}%`, background: 'var(--green)' }}>{1 - divShare > 0.18 ? `Sale ${money(s.pvSale)}` : ''}</div>
      </div>
      <div className="readouts">
        <Stat label="PV of dividends" value={money(s.pvDivs)} tone="gold" />
        <Stat label={`PV of the sale (yr ${years})`} value={money(s.pvSale)} tone="green" sub={`sale price ${money(s.sale)}`} />
        <Stat label="Value today P₀" value={money(s.p0)} tone="blue" sub="same for every N" />
      </div>
    </Viz>
  );
}

/** Market price vs intrinsic value: the buy / sell rule, with its caveat. */
function PriceVsValue({ value }: { value: number }) {
  const [price, setPrice] = useState(Math.round(value * 0.85));
  const gap = (price - value) / value;
  const verdict = Math.abs(gap) < 0.02 ? 'fair' : gap < 0 ? 'under' : 'over';
  return (
    <Viz title="Market price vs intrinsic value" tryThis={['Slide the market price above and below the intrinsic value from the explorer.']}>
      <div className="controls">
        <Slider label="Market price (what it trades at)" value={price} min={Math.round(value * 0.5)} max={Math.round(value * 1.5)} step={0.5} onChange={setPrice} format={(v) => money(v)} />
      </div>
      <div className="readouts">
        <Stat label="Intrinsic value (your model)" value={money(value)} tone="blue" />
        <Stat label="Market price" value={money(price)} tone="purple" />
      </div>
      <div className={`lverdict ${verdict === 'under' ? 'good' : verdict === 'over' ? 'bad' : 'neutral'}`} role="status">
        {verdict === 'under' && <>Market price &lt; intrinsic value → <u>underpriced</u> → BUY (by your estimate).</>}
        {verdict === 'over' && <>Market price &gt; intrinsic value → <u>overpriced</u> → SELL / don’t buy (by your estimate).</>}
        {verdict === 'fair' && <>Market price ≈ intrinsic value → <u>fairly priced</u>.</>}
      </div>
      <p className="small muted">The verdict is only as good as your inputs (expected dividends, r, g). A stock that looks mispriced may be priced correctly for reasons the analyst doesn’t see.</p>
    </Viz>
  );
}

function Explore() {
  const [r, setR] = useState(0.1);
  const value = holdingSplit(D1, G, r, 1)!.p0;
  return (
    <>
      <HoldingPeriod r={r} setR={setR} />
      <PriceVsValue key={Math.round(value * 100)} value={Math.round(value * 100) / 100} />
    </>
  );
}

const lesson: LessonContent = {
  intro: (
    <>
      <Block title="Two ways a share pays you">
        <p>Buy one share and you can earn money in exactly two ways:</p>
        <ul>
          <li><strong>Dividends</strong>: cash the firm pays out while you hold the share.</li>
          <li><strong>Capital gain</strong>: selling the share for more than you paid.</li>
        </ul>
        <p>Investor return = dividends + capital gain.</p>
      </Block>
      <Block title="Price is not the same as value">
        <p>The <strong>market price</strong> is what you can observe: it is set by supply and demand. The <strong>intrinsic (true) value</strong> is an <em>estimate</em> that comes from a valuation model. This chapter is about building that estimate.</p>
        <p>Compare the two: market price below intrinsic value means the stock looks <strong>underpriced (buy)</strong>; above means <strong>overpriced (sell)</strong>; equal means <strong>fairly priced</strong>.</p>
      </Block>
      <Block title="The big idea">
        <p>A share is worth the <strong>present value of the cash it is expected to pay you</strong>. Say a share will pay a $2 dividend next year and you expect to sell it right after for $34. If you require 10% a year, it is worth (2 + 34) / 1.10 = <strong>$32.73</strong> to you today.</p>
        <p>But where does that $34 sale price come from? The next buyer pays it because of the dividends <em>they</em> will receive. Keep pulling that thread and only dividends are left. You will see this happen in the next step.</p>
      </Block>
      <Callout tone="key" title="Required return r">
        r is the return investors demand for the stock’s risk, so it is the rate we discount at. It is not a guaranteed return, and it is not the same thing as the dividend growth rate g.
      </Callout>
    </>
  ),
  explore: <Explore />,
  formula: (
    <>
      <Block title="One period">
        <p>Hold for one year, collect <M>D<sub>1</sub></M>, then sell at <M>P<sub>1</sub></M>:</p>
        <Formula big><M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub> + P<sub>1</sub></M>} d={<M>1 + r</M>} /></Formula>
      </Block>
      <Block title="Several periods, then forever">
        <Formula note="Hold N years: discount each dividend by its own year, and the sale price by N years.">
          <M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>(1+r)</M>} /> + <Frac n={<M>D<sub>2</sub></M>} d={<M>(1+r)<sup>2</sup></M>} /> + … + <Frac n={<M>D<sub>N</sub> + P<sub>N</sub></M>} d={<M>(1+r)<sup>N</sup></M>} />
        </Formula>
        <Formula big note="Dividend Discount Model (DDM): PV(share) = PV(expected future dividends per share).">
          <M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>(1+r)</M>} /> + <Frac n={<M>D<sub>2</sub></M>} d={<M>(1+r)<sup>2</sup></M>} /> + <Frac n={<M>D<sub>3</sub></M>} d={<M>(1+r)<sup>3</sup></M>} /> + …
        </Formula>
        <Vars rows={[
          [<>P<sub>0</sub></>, 'Value of the stock today (t = 0)'],
          [<>D<sub>t</sub></>, 'Dividend expected at the end of year t'],
          [<>P<sub>N</sub></>, 'Price you expect to sell at, at the end of year N'],
          ['r', 'Required rate of return on the stock (the discount rate)'],
        ]} />
      </Block>
      <Block title="Assumptions">
        <ul>
          <li>Dividends and the sale price are <strong>expected</strong> values: forecasts, not promises.</li>
          <li>r stays the same every year.</li>
          <li>Cash arrives at the end of each year.</li>
        </ul>
        <p>The next lessons are all this one formula with a different assumption about how dividends grow.</p>
      </Block>
      <Block title="Worked example">
        <Worked
          title="Reliable Motors: D₁ = $1.50, D₂ = $1.60, D₃ = $1.75, sell for P₃ = $54, r = 15%"
          steps={[
            <>Year 1: 1.50 / 1.15 = 1.3043</>,
            <>Year 2: 1.60 / 1.15² = 1.2098</>,
            <>Year 3: (1.75 + 54.00) / 1.15³ = 55.75 / 1.5209 = 36.6565</>,
            <>Add them: 1.3043 + 1.2098 + 36.6565</>,
          ]}
          result="P₀ = $39.17"
        />
        <p className="small muted">BA II Plus: CF0 = 0, C01 = 1.50, C02 = 1.60, C03 = 55.75, I = 15, NPV → 39.17.</p>
      </Block>
    </>
  ),
  derivation: {
    title: 'Why the holding period doesn’t matter',
    body: (
      <>
        <p>Start with one period: <M>P<sub>0</sub> = (D<sub>1</sub> + P<sub>1</sub>) / (1 + r)</M>.</p>
        <p>The buyer at year 1 prices the share the same way: <M>P<sub>1</sub> = (D<sub>2</sub> + P<sub>2</sub>) / (1 + r)</M>. Substitute:</p>
        <Formula><M>P<sub>0</sub></M> = <Frac n={<M>D<sub>1</sub></M>} d={<M>1+r</M>} /> + <Frac n={<M>D<sub>2</sub> + P<sub>2</sub></M>} d={<M>(1+r)<sup>2</sup></M>} /></Formula>
        <p>Repeat N times and the last term is <M>P<sub>N</sub> / (1+r)<sup>N</sup></M>. As N grows, that term shrinks toward 0 (a price can’t grow faster than r forever), so only the dividends remain. A 1-year holder and a forever holder compute the <strong>same</strong> value: the short-term holder is paid for the later dividends through the sale price.</p>
      </>
    ),
  },
  checks: [
    {
      id: 'one-period',
      kind: 'number',
      unit: '$',
      prompt: <>A share will pay a <b>$2.00</b> dividend in one year, and you expect to sell it right after for <b>$44.00</b>. Your required return is <b>12%</b>. What is the most you should pay today?</>,
      answer: (2 + 44) / 1.12,
      traps: [
        { value: 46, msg: 'That is the cash you receive, not its value today. Discount it back one year at 12%.' },
        { value: 44 / 1.12 + 2, msg: 'The dividend also arrives in one year, so discount it too: (2 + 44) / 1.12.' },
      ],
      explain: <>Both the dividend and the sale price arrive at t = 1, so P₀ = (2.00 + 44.00) / 1.12 = <b>$41.07</b>.</>,
    },
    {
      id: 'two-period',
      kind: 'number',
      unit: '$',
      prompt: <>Dividends of <b>$1.20</b> (year 1) and <b>$1.30</b> (year 2) are expected, and you plan to sell at the end of year 2 for <b>$30.00</b>. r = <b>10%</b>. What is the share worth today?</>,
      answer: 1.2 / 1.1 + (1.3 + 30) / 1.21,
      traps: [
        { value: 32.5, msg: 'You added the cash flows without discounting them. Each needs dividing by (1 + r)^t.' },
        { value: 1.2 / 1.1 + 1.3 / 1.21 + 30 / 1.1, msg: 'The sale happens at the end of year 2, so it is discounted two years, not one.' },
      ],
      explain: <>P₀ = 1.20/1.10 + (1.30 + 30.00)/1.10² = 1.0909 + 25.8678 = <b>$26.96</b>.</>,
      solution: (
        <ol>
          <li>PV of D₁ = 1.20 / 1.10 = 1.0909</li>
          <li>D₂ and P₂ arrive together at t = 2: (1.30 + 30.00) / 1.21 = 25.8678</li>
          <li>P₀ = 1.0909 + 25.8678 = 26.96</li>
        </ol>
      ),
    },
    {
      id: 'holding',
      kind: 'mcq',
      prompt: <>Ana plans to hold a stock for 2 years; Ben plans to hold it forever. They agree on every future dividend, on future prices and on r. Who should value the stock higher today?</>,
      choices: ['Ben, because he receives more dividends', 'Ana, because she gets her money back sooner', 'Neither: they get the same value', 'It depends on whether the stock pays dividends this year'],
      answer: 2,
      why: [
        'Ben gets more dividends, but Ana gets a sale price that pays her for exactly those later dividends.',
        'Getting cash sooner doesn’t help here: the sale price is the PV of the later dividends, discounted at the same r.',
        undefined,
        'The timing of the first dividend affects both of them equally.',
      ],
      explain: <>The sale price Ana receives is the PV of all dividends after year 2, so her value equals Ben’s: the holding period doesn’t change the value (try it in the explorer).</>,
    },
    {
      id: 'verdict',
      kind: 'mcq',
      prompt: <>Your DDM estimate for a share is <b>$41.07</b>. It trades at <b>$45.00</b>. Based on your estimate, the stock is:</>,
      choices: ['Underpriced, so buy', 'Overpriced, so don’t buy (or sell)', 'Fairly priced', 'Impossible to judge without its par value'],
      answer: 1,
      why: ['Underpriced means the market price is BELOW the intrinsic value. Here it is above.', undefined, 'A $3.93 gap is about 10%: not fairly priced.', 'Par value is a legal number with nothing to do with value.'],
      explain: <>Market price ($45.00) &gt; intrinsic value ($41.07) → overpriced. Remember it’s a conclusion from <i>your</i> assumptions: the market may know something your model doesn’t.</>,
    },
    {
      id: 'r-up',
      kind: 'mcq',
      prompt: <>Investors decide the stock is riskier and raise their required return from 10% to 12%. Expected dividends don’t change. What happens to the intrinsic value?</>,
      choices: ['It rises, because investors now earn more', 'It falls, because each future dividend is discounted more heavily', 'It stays the same, because dividends didn’t change', 'It falls only for investors who sell early'],
      answer: 1,
      why: ['A higher required return means future cash is worth LESS today, not more.', undefined, 'Value depends on both the cash flows and the discount rate.', 'The holding period doesn’t matter: everyone’s value falls.'],
      explain: <>Value = PV of dividends. A higher r makes every (1 + r)<sup>t</sup> bigger, so every PV is smaller and the value falls (drag r in the explorer).</>,
    },
  ],
  takeaways: [
    'Value = PV of expected future dividends (the DDM).',
    'The holding period doesn’t change the value: the sale price is the PV of later dividends.',
    'Market price < intrinsic value → underpriced → buy; > → overpriced → sell. It’s only an estimate.',
    'Higher required return r → lower value.',
  ],
};

export default lesson;
