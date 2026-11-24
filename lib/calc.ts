// Maths behind the built-in calculator: a safe expression evaluator (no eval) and the cash-flow worksheet (NPV, IRR).

/**
 * Evaluates a typed expression such as `1.8*1.05/(0.12-0.05)`, `(1+0.18/12)^12-1`, `2√9`, `ln(2)` or `5%`.
 * Supports + − × ÷ (and * / -), ^ (right-associative), % (÷100), parentheses (missing closers are added),
 * implicit multiplication (`2(3)`, `2π`), √ / sqrt, ln, log, exp, abs, constants π, e and `ans`.
 * Returns null for anything it can't read or that has no real value.
 */
export function evaluate(src: string, ans = 0): number | null {
  const s = src
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (!s) return null;
  let i = 0;
  const peek = () => s[i];
  const fail = (): never => { throw new Error('syntax'); };

  const FUNCS: Record<string, (x: number) => number> = { sqrt: Math.sqrt, '√': Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs };
  const CONSTS: Record<string, () => number> = { 'π': () => Math.PI, pi: () => Math.PI, e: () => Math.E, ans: () => ans };
  const word = () => {
    for (const k of ['sqrt', '√', 'ln', 'log', 'exp', 'abs']) if (s.startsWith(k, i)) return { k, fn: FUNCS[k] };
    return null;
  };
  const constant = () => {
    for (const k of ['ans', 'pi', 'π', 'e']) {
      // `e` must not swallow the `e` of `exp`
      if (s.startsWith(k, i) && !(k === 'e' && s.startsWith('exp', i))) return k;
    }
    return null;
  };
  const startsPrimary = () => {
    const c = peek();
    return c !== undefined && (/[0-9.(]/.test(c) || word() !== null || constant() !== null);
  };

  function expr(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') v = s[i++] === '+' ? v + term() : v - term();
    return v;
  }
  function term(): number {
    let v = unary();
    for (;;) {
      if (peek() === '*') { i++; v *= unary(); }
      else if (peek() === '/') { i++; v /= unary(); }
      else if (startsPrimary()) v *= power(); // implicit multiplication: 2(3), 2π, (1+r)(1+g)
      else return v;
    }
  }
  function unary(): number {
    if (peek() === '-') { i++; return -unary(); }
    if (peek() === '+') { i++; return unary(); }
    return power();
  }
  function power(): number {
    const base = postfix();
    if (peek() === '^') { i++; return Math.pow(base, unary()); } // 2^-1, 2^3^2 = 2^9
    return base;
  }
  function postfix(): number {
    let v = primary();
    while (peek() === '%') { i++; v /= 100; }
    return v;
  }
  function primary(): number {
    const c = peek();
    if (c === undefined) return fail();
    if (c === '(') {
      i++;
      const v = expr();
      if (peek() === ')') i++;
      else if (i < s.length) fail(); // only a missing closer at the very end is forgiven
      return v;
    }
    const f = word();
    if (f) { i += f.k.length; return f.fn(power()); }
    const k = constant();
    if (k) { i += k.length; return CONSTS[k](); }
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
    if (!m) return fail();
    i += m[0].length;
    return parseFloat(m[0]);
  }

  try {
    const v = expr();
    if (i < s.length) return null;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** One row of the cash-flow worksheet: an amount repeated `count` times (BA II Plus "Cj" and "Fj"). */
export type CashFlow = { amount: number; count: number };

/** Expands rows into a list of flows for t = 1, 2, … */
export function expand(flows: CashFlow[]): number[] {
  const out: number[] = [];
  for (const f of flows) for (let k = 0; k < Math.max(0, Math.floor(f.count)); k++) out.push(f.amount);
  return out;
}

/** NPV = CF0 + Σ CFt / (1 + r)^t, with r in percent. */
export function npv(ratePct: number, cf0: number, flows: CashFlow[]): number {
  const r = ratePct / 100;
  return expand(flows).reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t + 1), cf0);
}

/** IRR in percent: the rate where NPV = 0. Scans for a sign change, then bisects. Null if none exists. */
export function irr(cf0: number, flows: CashFlow[]): number | null {
  const all = [cf0, ...expand(flows)];
  if (!all.some((x) => x > 0) || !all.some((x) => x < 0)) return null;
  const f = (r: number) => all.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
  // scan outward from 10% so the economically sensible root is found first when there are several
  const grid: number[] = [];
  for (let r = 0.1; r <= 10; r += r < 1 ? 0.01 : 0.1) grid.push(r);
  for (let r = 0.09; r > -0.99; r -= 0.01) grid.push(r);
  let prev = 0.1;
  let fPrev = f(prev);
  if (Math.abs(fPrev) < 1e-12) return 10;
  for (const r of grid.slice(1)) {
    // restart from 10% when the scan switches to negative rates
    if (r < prev && prev > 0.1) { prev = 0.1; fPrev = f(prev); }
    const fr = f(r);
    if (Number.isFinite(fr) && Number.isFinite(fPrev) && fPrev * fr <= 0) {
      let lo = Math.min(prev, r), hi = Math.max(prev, r);
      let flo = f(lo);
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
      }
      return ((lo + hi) / 2) * 100;
    }
    prev = r;
    fPrev = fr;
  }
  return null;
}

/** Rounds away floating-point noise: 0.1 + 0.2 → 0.3, keeps up to 10 decimals. */
export function tidy(x: number): number {
  if (!Number.isFinite(x)) return x;
  return parseFloat(x.toPrecision(12));
}

/** Display form with thousands separators: 1234567.891 → "1,234,567.891". */
export function show(x: number): string {
  const t = tidy(x);
  if (Math.abs(t) >= 1e15 || (t !== 0 && Math.abs(t) < 1e-9)) return t.toExponential(6);
  return t.toLocaleString('en-US', { maximumFractionDigits: 10 });
}
