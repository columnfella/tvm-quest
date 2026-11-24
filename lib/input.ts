// Keeps number fields numeric. Each filter takes whatever was typed or pasted and returns only the allowed
// characters, so letters never reach the field (keyboard, paste, autofill or a phone's text keyboard alike).

/** A plain number: digits, one decimal point, thousands commas, and a minus sign only at the start. */
export function onlyNumber(v: string): string {
  let s = v.replace(/[−–]/g, '-').replace(/[^0-9.,-]/g, '');
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  return (neg ? '-' : '') + s;
}

/** A whole number (counts, payments per year). */
export const onlyDigits = (v: string): string => v.replace(/\D/g, '');

/** A number or simple arithmetic (calculator fields, e.g. "4*12" or "2.42*1.05/0.07"): no letters. */
export const onlyArithmetic = (v: string): string => v.replace(/[^0-9.,+\-−–*/×÷^%() ]/g, '');

// the Basic calculator also understands these words, inserted by its keys (√, ln, Ans) or typed
const WORDS = ['ans', 'sqrt', 'log', 'exp', 'ln', 'pi'];

/** Keeps the letters of a run that spell function names, plus a name still being typed ("a", "an", "sq"). */
function letters(run: string): string {
  let out = '';
  let rest = run.toLowerCase();
  while (rest) {
    const w = WORDS.find((x) => rest.startsWith(x));
    if (w) { out += w; rest = rest.slice(w.length); continue; }
    if (WORDS.some((x) => x.startsWith(rest))) return out + rest; // a name in progress
    rest = rest.slice(1); // a letter that can't start a name: drop it
  }
  return out;
}

/**
 * The Basic calculator's expression: arithmetic, √ and π, and the function names it understands
 * (ans, sqrt, ln, log, exp, pi). Any other letter is dropped.
 */
export function onlyExpression(v: string): string {
  return v.replace(/[a-zA-Z]+/g, letters).replace(/[^0-9.,+\-−–*/×÷^%() a-z√π]/g, '');
}

/**
 * onChange helper: filters the typed value, stores it, and keeps the cursor where the user was typing
 * (a rejected letter would otherwise make a controlled input jump to the end).
 */
export function filtered(filter: (v: string) => string, set: (v: string) => void) {
  return (e: { target: HTMLInputElement }) => {
    const el = e.target;
    const raw = el.value;
    const clean = filter(raw);
    if (clean !== raw) {
      // Fix the field right now, in this same event: React then finds the value already matching its state
      // and leaves the cursor alone. (Deferring this lets the next keystroke land at the wrong place.)
      const caret = Math.max(0, (el.selectionStart ?? raw.length) - (raw.length - clean.length));
      el.value = clean;
      if (document.activeElement === el) el.setSelectionRange(caret, caret);
    }
    set(clean);
  };
}
