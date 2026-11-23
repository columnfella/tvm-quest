// BA II Plus–style TVM solver. Sign convention: PV(1+i)^N + PMT(1+i·t)[(1+i)^N − 1]/i + FV = 0
export type TvmKey = 'N' | 'IY' | 'PV' | 'PMT' | 'FV';
export type TvmInput = Partial<Record<TvmKey, number>> & { begin: boolean; py: number };

function f(N: number, i: number, PV: number, PMT: number, FV: number, t: number) {
  if (Math.abs(i) < 1e-12) return PV + PMT * N + FV;
  const g = Math.pow(1 + i, N);
  return PV * g + PMT * (1 + i * t) * ((g - 1) / i) + FV;
}

export function solve(target: TvmKey, x: TvmInput): number | null {
  const t = x.begin ? 1 : 0;
  const py = x.py || 1;
  const N = x.N ?? 0;
  const i = (x.IY ?? 0) / 100 / py;
  const PV = x.PV ?? 0;
  const PMT = x.PMT ?? 0;
  const FV = x.FV ?? 0;
  const zero = Math.abs(i) < 1e-12;
  const g = zero ? 1 : Math.pow(1 + i, N);
  const ann = zero ? N : (1 + i * t) * ((g - 1) / i);
  switch (target) {
    case 'FV':
      return -(PV * g + PMT * ann);
    case 'PV':
      return -(PMT * ann + FV) / g;
    case 'PMT':
      return ann === 0 ? null : -(PV * g + FV) / ann;
    case 'N': {
      if (zero) return PMT === 0 ? null : -(PV + FV) / PMT;
      const a = PMT * (1 + i * t);
      const num = a - FV * i;
      const den = a + PV * i;
      if (num / den <= 0) return null;
      return Math.log(num / den) / Math.log(1 + i);
    }
    case 'IY': {
      // bisection + secant on periodic rate
      let lo = -0.99, hi = 1;
      const h = (r: number) => f(N, r, PV, PMT, FV, t);
      let flo = h(lo), fhi = h(hi);
      if (flo * fhi > 0) {
        hi = 10; fhi = h(hi);
        if (flo * fhi > 0) return null;
      }
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        const fm = h(mid);
        if (Math.abs(fm) < 1e-10) { lo = hi = mid; break; }
        if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
      }
      return ((lo + hi) / 2) * 100 * py;
    }
  }
}
