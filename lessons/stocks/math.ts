// Pure stock-valuation maths used by the Ch. 7 lessons (visuals, worked examples and answer keys).
// Rates are decimals (0.12 = 12%). Every function returns null instead of a number when the model
// does not apply (e.g. Gordon with r ≤ g), so the UI can explain why instead of showing nonsense.
// Checked against the slides, the study guide and the Black Book in scripts/check-stock-math.ts.

/** Present value of one cash flow received at the end of year t. */
export const pv = (cf: number, r: number, t: number) => cf / (1 + r) ** t;

/** Zero growth (perpetuity): P0 = D / r. Also preferred stock: Vp = Dp / rp. */
export const perpetuity = (d: number, r: number): number | null => (r > 0 ? d / r : null);

/** Constant growth (Gordon): P0 = D1 / (r − g). Valid only when r > g. */
export const gordon = (d1: number, r: number, g: number): number | null => (r - g > 1e-9 ? d1 / (r - g) : null); // slider values can make r and g equal up to float noise

/** Required return implied by a price under constant growth: r = D1/P0 + g (dividend yield + capital gains yield). */
export const impliedReturn = (d1: number, p0: number, g: number) => d1 / p0 + g;

/** CAPM (Black Book notation): ks = kRF + (kM − kRF) × b. `mrp` is the market risk premium kM − kRF. */
export const capm = (krf: number, mrp: number, beta: number) => krf + mrp * beta;

/** Sustainable growth rate: SGR = ROE × retention ratio, retention = 1 − payout. */
export const sgr = (roe: number, payout: number) => roe * (1 - payout);

/** Dividends D1…Dn grown from D0 with one growth rate per year. */
export function growDividends(d0: number, growth: number[]): number[] {
  const out: number[] = [];
  let d = d0;
  for (const g of growth) out.push((d *= 1 + g));
  return out;
}

export type StageValuation = {
  divs: number[]; // D1…DN
  pvDivs: number[]; // PV of each D_t at r
  dNext: number; // D(N+1), first dividend of the constant-growth stage
  horizon: number; // P_N = D(N+1) / (r − gLong)
  pvHorizon: number; // P_N / (1+r)^N
  price: number; // P0
};

/**
 * Nonconstant growth: grow the dividend year by year through the nonconstant years (`growth`, one rate per year),
 * put the Gordon horizon value at the LAST nonconstant year N, then discount everything to today.
 * Returns null when the long-run growth rate is not below r (the horizon value would not exist).
 */
export function nonconstant(d0: number, growth: number[], gLong: number, r: number): StageValuation | null {
  if (!(r - gLong > 1e-9) || growth.length === 0) return null;
  const divs = growDividends(d0, growth);
  const n = divs.length;
  const dNext = divs[n - 1] * (1 + gLong);
  const horizon = dNext / (r - gLong);
  const pvDivs = divs.map((d, i) => pv(d, r, i + 1));
  const pvHorizon = pv(horizon, r, n);
  return { divs, pvDivs, dNext, horizon, pvHorizon, price: pvDivs.reduce((a, b) => a + b, 0) + pvHorizon };
}

/** Two-stage shortcut: g1 for n years, then g2 forever. */
export const twoStage = (d0: number, g1: number, n: number, g2: number, r: number) => nonconstant(d0, Array(n).fill(g1), g2, r);

/** Value of a share held N years: PV of D1…DN plus PV of the sale price P_N (all from a constant-growth world). */
export function holdingSplit(d1: number, g: number, r: number, years: number) {
  const p0 = gordon(d1, r, g);
  if (p0 === null) return null;
  let pvDivs = 0;
  for (let t = 1; t <= years; t++) pvDivs += pv(d1 * (1 + g) ** (t - 1), r, t);
  const sale = p0 * (1 + g) ** years; // P_N = D(N+1)/(r − g)
  return { p0, pvDivs, sale, pvSale: pv(sale, r, years) };
}

/** PVGO = P0 − E1/r (the part of the price that comes from growth opportunities). */
export const pvgo = (price: number, e1: number, r: number) => price - e1 / r;

/** Retention model behind PVGO: the firm keeps a fraction b of E1 and reinvests it at ROE forever. */
export function retentionValue(e1: number, roe: number, b: number, r: number) {
  const g = roe * b;
  const d1 = e1 * (1 - b);
  const price = gordon(d1, r, g);
  const noGrowth = e1 / r;
  return { g, d1, price, noGrowth, pvgo: price === null ? null : price - noGrowth };
}

/** Historical dividend growth: arithmetic mean of yearly changes and geometric (compound) rate. */
export function historicalGrowth(divs: number[]) {
  const changes = divs.slice(1).map((d, i) => d / divs[i] - 1);
  const arithmetic = changes.reduce((a, b) => a + b, 0) / changes.length;
  const geometric = (divs[divs.length - 1] / divs[0]) ** (1 / changes.length) - 1;
  return { changes, arithmetic, geometric };
}

/** Free cash flow: EBIT(1 − T) + depreciation − capital expenditures − increase in net operating working capital. */
export const freeCashFlow = (ebit: number, tax: number, dep: number, capex: number, dNowc: number) => ebit * (1 - tax) + dep - capex - dNowc;

/** Corporate value model with constant growth: firm = FCF1/(WACC − g); equity = firm − debt & preferred; price = equity / shares. */
export function corporateValue(fcf1: number, wacc: number, g: number, claims: number, shares: number) {
  const firm = gordon(fcf1, wacc, g);
  if (firm === null || shares <= 0) return null;
  const equity = firm - claims;
  return { firm, equity, price: equity / shares };
}

// ---------- formatting & answer checking ----------
export const money = (x: number, dp = 2) =>
  `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const pct = (x: number, dp = 1) => `${(x * 100).toFixed(dp).replace('-', '−')}%`;
export const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;
