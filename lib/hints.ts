// Formula hint cards keyed by keywords in the Black Book topic label.
export type Hint = { title: string; lines: string[] };

const H = {
  lump: { title: 'Lump sums', lines: ['FV = PV(1 + i)^{N}', 'PV = FV / (1 + i)^{N}', 'Non-annual: use i = i_{nom}/m and N = years × m'] },
  fvAnn: { title: 'FV of an annuity', lines: ['FV = PMT · [(1 + i)^{N} − 1] / i', 'Annuity due (BEGIN mode): multiply by (1 + i)'] },
  pvAnn: { title: 'PV of an annuity', lines: ['PV = PMT · [1 − (1 + i)^{−N}] / i', 'Annuity due (BEGIN mode): multiply by (1 + i)'] },
  perp: { title: 'Perpetuity', lines: ['PV = PMT / i', 'As i → 0, the value → ∞'] },
  uneven: { title: 'Uneven cash flows', lines: ['PV = Σ CF_{t} / (1 + i)^{t}', 'FV = Σ CF_{t} (1 + i)^{N − t}', 'Calculator: CF worksheet, then NPV'] },
  ear: { title: 'Effective vs nominal rate', lines: ['EAR = (1 + i_{nom}/m)^{m} − 1', 'Periodic rate = i_{nom} / m', 'More compounding periods → higher EAR'] },
  pmt: { title: 'Required payment', lines: ['PMT = PV · i / [1 − (1 + i)^{−N}]', 'Saving goal: PMT = FV · i / [(1 + i)^{N} − 1]', 'Bring every cash flow to one date first'] },
  amort: { title: 'Amortization', lines: ['Interest_{t} = balance_{t−1} × periodic rate', 'Principal_{t} = PMT − interest_{t}', 'Remaining balance = PV of the remaining payments'] },
  rate: { title: 'Solving for i or N', lines: ['(1 + i)^{N} = FV / PV', 'i = (FV/PV)^{1/N} − 1', 'N = ln(FV/PV) / ln(1 + i)'] },
  cont: { title: 'Continuous compounding', lines: ['FV = PV · e^{iN}', 'PV = FV · e^{−iN}', 'EAR = e^{i} − 1'] },
  concept: { title: 'Concept checklist', lines: ['Higher discount rate → lower PV', 'Annuity due > ordinary annuity (PV and FV)', 'EAR ≥ nominal rate; equal only with annual compounding', 'Loan payments are fixed; the interest share falls over time'] },
} satisfies Record<string, Hint>;

export function hintFor(topic: string, part: 'theory' | 'math'): Hint {
  const t = topic.toLowerCase();
  if (part === 'theory') return H.concept;
  if (t.includes('continuous')) return H.cont;
  if (t.includes('perpetuity')) return H.perp;
  if (t.includes('uneven') || t.includes('uncertain') || t.includes('missing') || t.includes('npv')) return H.uneven;
  if (t.includes('amortization') || t.includes('balance')) return H.amort;
  if (t.includes('effective') || t.includes('nominal') || t.includes('ear')) return H.ear;
  if (t.includes('required') || t.includes('payment') || t.includes('pmt') || t.includes('withdrawal') || t.includes('breakeven')) return H.pmt;
  if (t.includes('pv of an annuity') || t.includes('annuity due vs')) return H.pvAnn;
  if (t.includes('fv of an annuity') || t.includes('annuity due') || t.includes('investment account')) return H.fvAnn;
  if (t.includes('growth') || t.includes('interest rate') || t.includes('rate of return') || t.includes('time') || t.includes('double') || t.includes('inflation')) return H.rate;
  return H.lump;
}
