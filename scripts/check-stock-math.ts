// Checks the Ch. 7 lesson maths against the worked numbers in the slides, the study guide and the Black Book.
// Run: npm run test:math   (Node 23+ runs TypeScript directly)
import assert from 'node:assert/strict';
import * as v from '../lessons/stocks/math.ts';

let n = 0;
const near = (got: number | null | undefined, want: number, tol = 0.005, label = '') => {
  n++;
  assert.ok(got !== null && got !== undefined && Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want}`);
};

// one-period & multi-period DDM: Reliable Motors (study guide) → $39.17
near(v.pv(1.5, 0.15, 1) + v.pv(1.6, 0.15, 2) + v.pv(1.75 + 54, 0.15, 3), 39.17, 0.005, 'Reliable Motors');
// zero growth: Perry Motors $1.80 at 12% → $15; preferred $5 at 8% → $62.50
near(v.perpetuity(1.8, 0.12), 15, 1e-9, 'Perry zero growth');
near(v.perpetuity(5, 0.08), 62.5, 1e-9, 'preferred');
// preferred yield, quarterly dividends (Black Book 42, 43): 4×2.50/50 = 20%, 4×0.50/20 = 10%
near((4 * 2.5) / 50, 0.2, 1e-9, 'BB42');
near((4 * 0.5) / 20, 0.1, 1e-9, 'BB43');
// constant growth: Perry $1.80 just paid, 5%, 12% → $27; Sweet Candy D1 0.72, 7%: 10% → $24, 8% → $72, 7% → invalid
near(v.gordon(1.8 * 1.05, 0.12, 0.05), 27, 1e-9, 'Perry Gordon');
near(v.gordon(0.72, 0.1, 0.07), 24, 1e-9, 'Sweet Candy 10%');
near(v.gordon(0.72, 0.08, 0.07), 72, 1e-9, 'Sweet Candy 8%');
n++; assert.equal(v.gordon(0.72, 0.07, 0.07), null, 'Sweet Candy 7% must be invalid');
n++; assert.equal(v.gordon(1, 0.07, 0.08), null, 'g > r must be invalid');
// implied return & CAPM beta (Black Book 60): ks = 2/40 + 7% = 12%, beta = (12% − 6%)/6% = 1
near(v.impliedReturn(2, 40, 0.07), 0.12, 1e-12, 'BB60 ks');
near((v.impliedReturn(2, 40, 0.07) - 0.06) / 0.06, 1, 1e-9, 'BB60 beta');
// equilibrium change (Black Book 65): before 16.98, after 12.11, change −4.87
const before = v.gordon(0.8 * 1.04, v.capm(0.05, 0.03, 1.3), 0.04)!;
const after = v.gordon(0.8 * 1.06, v.capm(0.04, 0.06, 1.5), 0.06)!;
near(before, 16.98, 0.005, 'BB65 before');
near(after, 12.11, 0.005, 'BB65 after');
near(after - before, -4.87, 0.01, 'BB65 change');
// dividend & capital gains yield (Black Book 96): DY = 3.42×1.07/32.35 = 11.31%
near((3.42 * 1.07) / 32.35, 0.1131, 0.00005, 'BB96');
// two-stage: Warren 17.90 (slide rounds to 17.93), $1 at 20%×2 then 5% at 12% → 19.44, Perry 24.03
const warren = v.twoStage(1.5, 0.1, 3, 0.05, 0.15)!;
near(warren.price, 17.9, 0.005, 'Warren');
near(warren.horizon, 20.9633, 0.0001, 'Warren P3');
near(v.twoStage(1, 0.2, 2, 0.05, 0.12)!.price, 19.44, 0.005, 'two-stage 19.44');
near(v.twoStage(1.8, 0.05, 3, 0.04, 0.12)!.price, 24.03, 0.005, 'Perry two-stage');
// Home Place Hotels (multi-stage): 0%, 5%, 5%, 15%, then 10% at 14% → $81.00, P4 = 118.55
const hp = v.nonconstant(3.4, [0, 0.05, 0.05, 0.15], 0.1, 0.14)!;
near(hp.price, 81.0, 0.005, 'Home Place');
near(hp.horizon, 118.5463, 0.0001, 'Home Place P4');
n++; assert.equal(v.twoStage(1, 0.2, 2, 0.12, 0.12), null, 'long-run g = r must be invalid');
// holding period doesn't change value
for (const yrs of [1, 3, 10, 40]) {
  const s = v.holdingSplit(2, 0.04, 0.1, yrs)!;
  near(s.pvDivs + s.pvSale, s.p0, 1e-9, `holding ${yrs}y`);
}
// sustainable growth: DTE 10% × (1 − 2.35/4.05) = 4.2%; 15% × 60% = 9%
near(v.sgr(0.1, 2.35 / 4.05), 0.042, 0.0005, 'DTE');
near(v.sgr(0.15, 0.4), 0.09, 1e-12, 'SGR 9%');
// PVGO: $70, EPS 5, 10% → 20; Alpha $30, $4, 12% → −3.33; Reliable Inc 60, 5, 10% → 10
near(v.pvgo(70, 5, 0.1), 20, 1e-9, 'PVGO 20');
near(v.pvgo(30, 4, 0.12), -3.33, 0.005, 'Alpha');
near(v.pvgo(60, 5, 0.1), 10, 1e-9, 'Reliable Inc');
// retention model: ROE = r means retention doesn't change the price (PVGO = 0)
for (const b of [0, 0.3, 0.6]) near(v.retentionValue(5, 0.1, b, 0.1).pvgo, 0, 1e-9, `ROE=r b=${b}`);
// ROE > r: more retention → higher price; ROE < r: lower
assert.ok(v.retentionValue(5, 0.15, 0.5, 0.1).price! > v.retentionValue(5, 0.15, 0.2, 0.1).price!); n++;
assert.ok(v.retentionValue(5, 0.06, 0.5, 0.1).price! < v.retentionValue(5, 0.06, 0.2, 0.1).price!); n++;
// Broadway Joe: arithmetic 8.05%, geometric 7.96%
const bj = v.historicalGrowth([1.5, 1.7, 1.75, 1.8, 2.0, 2.2]);
near(bj.arithmetic, 0.0805, 0.00005, 'Broadway arithmetic');
near(bj.geometric, 0.0796, 0.00005, 'Broadway geometric');
// FCF model: Harkleroad 21.11, Rein 46.67, Franklin FCF 70 → 62.50, Keane FCF 300
near(v.corporateValue(25, 0.1, 0.07, 200, 30)!.price, 21.11, 0.005, 'Harkleroad');
near(v.corporateValue(300, 0.11, 0.07, 500, 150)!.price, 46.67, 0.005, 'Rein');
near(v.freeCashFlow(300, 0.4, 50, 100, 60), 70, 1e-9, 'Franklin FCF');
near(v.corporateValue(70, 0.1, 0.06, 500, 20)!.price, 62.5, 1e-9, 'Franklin price');
near(v.freeCashFlow(800, 0.4, 75, 255, 0), 300, 1e-9, 'Keane FCF');
// Burress (nonconstant FCF): 3000, 4000, 5000 then 6%, WACC 10% → firm 109,338.84 → (−25,000)/1,000 = 84.34
const burFirm = v.pv(3000, 0.1, 1) + v.pv(4000, 0.1, 2) + v.pv(5000 + (5000 * 1.06) / 0.04, 0.1, 3);
near(burFirm, 109338.84, 0.01, 'Burress firm');
near((burFirm - 25000) / 1000, 84.34, 0.005, 'Burress price');

console.log(`stock math: ${n} checks passed`);
