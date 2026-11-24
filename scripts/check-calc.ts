// Checks the built-in calculator (expression evaluator, TVM solver, NPV/IRR) against worked course numbers.
// Run: npm run test:math
import assert from 'node:assert/strict';
import { evaluate, irr, npv, show, tidy } from '../lib/calc.ts';
import { solve } from '../lib/tvm.ts';

let n = 0;
const near = (got: number | null | undefined, want: number, tol = 0.005, label = '') => {
  n++;
  assert.ok(got !== null && got !== undefined && Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want}`);
};
const bad = (src: string) => { n++; assert.equal(evaluate(src), null, `${src} should be rejected`); };

// expressions
near(evaluate('1+2*3'), 7, 1e-12, 'precedence');
near(evaluate('(1+2)*3'), 9, 1e-12, 'parens');
near(evaluate('2^3^2'), 512, 1e-9, 'right-assoc power');
near(evaluate('-2^2'), -4, 1e-12, 'unary minus below power');
near(evaluate('2^-1'), 0.5, 1e-12, 'negative exponent');
near(evaluate('1.8×1.05÷(0.12−0.05)'), 27, 1e-9, 'Perry Gordon with symbols');
near(evaluate('(1+0.18/12)^12-1'), 0.195618, 1e-6, 'EAR 18% monthly');
near(evaluate('2(3+4)'), 14, 1e-12, 'implicit multiplication');
near(evaluate('(1+0.1)(1+0.05)'), 1.155, 1e-12, 'implicit between parens');
near(evaluate('√9+sqrt(16)'), 7, 1e-12, 'roots');
near(evaluate('2√9'), 6, 1e-12, 'implicit root');
near(evaluate('ln(e)'), 1, 1e-12, 'ln e');
near(evaluate('log(1000)'), 3, 1e-12, 'log');
near(evaluate('exp(0.05*3)'), Math.exp(0.15), 1e-12, 'exp, not e×xp');
near(evaluate('50%'), 0.5, 1e-12, 'percent');
near(evaluate('200*5%'), 10, 1e-12, 'percent of');
near(evaluate('1,000/4'), 250, 1e-12, 'thousands separators');
near(evaluate('ans*2', 21), 42, 1e-12, 'ans');
near(evaluate('(1+2'), 3, 1e-12, 'missing closer forgiven');
near(evaluate('1e3+1'), 1001, 1e-12, 'scientific notation');
near(evaluate('.5+.25'), 0.75, 1e-12, 'leading dot');
bad('');
bad('1+');
bad('2**3');
bad('1/0');
bad('sqrt(-1)');
bad('(1+2))');
bad('abc');
n++; assert.equal(tidy(0.1 + 0.2), 0.3, 'tidy');
n++; assert.equal(show(1234567.891), '1,234,567.891', 'show');

// TVM (ch. 5 worked answers)
const tvm = (k: Parameters<typeof solve>[0], x: Omit<Parameters<typeof solve>[1], 'begin' | 'py'> & { begin?: boolean; py?: number }) => solve(k, { begin: false, py: 1, ...x });
near(tvm('FV', { N: 6, IY: 2, PV: -1000, PMT: 0 }), 1126.16, 0.005, 'FV quarterly');
near(tvm('FV', { N: 5, IY: 15, PV: 0, PMT: -200 }), 1348.48, 0.005, 'FV annuity');
near(tvm('PV', { N: 5, IY: 15, PMT: -200, FV: 0 }), 670.43, 0.005, 'PV annuity');
near(tvm('PMT', { N: 5, IY: 10, PV: -1000, FV: 0 }), 263.8, 0.005, 'PMT');
near(tvm('IY', { N: 30, PV: -1800, PMT: 0, FV: 13700 }), 7.0, 0.01, 'I/Y');
near(tvm('IY', { N: 5, PV: 10000, PMT: -2504.56, FV: 0 }), 8, 0.001, 'I/Y annuity');
near(tvm('N', { IY: 10, PV: -300000, PMT: 0, FV: 1000000 }), 12.63, 0.005, 'N');
near(tvm('FV', { N: 42, IY: 10, PV: 10000, PMT: 1000, begin: true }), -1139037.68, 0.01, 'FV BGN');

// cash flows (ch. 5 worked answers)
near(npv(8, 0, [{ amount: 10000, count: 1 }, { amount: 25000, count: 1 }, { amount: 50000, count: 1 }, { amount: 35000, count: 1 }]), 96110.39, 0.01, 'NPV uneven');
near(npv(14, 0, [{ amount: 2000, count: 5 }, { amount: 3000, count: 3 }, { amount: 4000, count: 1 }]), 11713.54, 0.01, 'NPV with Nj');
near(irr(10000, [{ amount: -2504.56, count: 5 }]), 8, 0.001, 'IRR annuity');
near(irr(-1000, [{ amount: 10, count: 11 }, { amount: 1010, count: 1 }]), 1, 0.0001, 'IRR monthly loan');
near(irr(-100, [{ amount: 50, count: 1 }]), -50, 0.0001, 'negative IRR');
n++; assert.equal(irr(100, [{ amount: 50, count: 2 }]), null, 'no sign change → no IRR');
// Ch. 7 nonconstant growth as an NPV: D1 2.20, D2 2.42, P2 = 2.42×1.05/(0.12−0.05) at 12%
near(npv(12, 0, [{ amount: 2.2, count: 1 }, { amount: 2.42 + (2.42 * 1.05) / 0.07, count: 1 }]), 32.83, 0.005, 'two-stage via NPV');

console.log(`calculator: ${n} checks passed`);
