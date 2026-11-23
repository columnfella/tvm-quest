# Interactive lessons (the "Learn" tab)

Hand-written React lessons that sit next to a chapter's exercises. Each lesson goes through the same template:

**Concept → Explore → Formula (+ optional derivation) → Practice → Complete**

The template (`components/learn/LessonShell.tsx`) handles navigation, the stepper, the question engine, XP, progress and the completion screen. Each lesson file supplies its own content, including any custom visual it needs.

## Add a lesson

1. Create a file, e.g. `lessons/bonds/01-bond-prices.tsx`, that default-exports a `LessonContent`:

   ```tsx
   'use client';
   import type { LessonContent } from '@/lib/learn';
   import { Block, Formula, Frac, M, Viz, Slider } from '@/components/learn/kit';

   function MyVisual() { /* any React: state, SVG, framer-motion, buttons… */ }

   const lesson: LessonContent = {
     intro: <Block title="…">…</Block>,            // A. concept, intuition first
     explore: <MyVisual />,                          // B. your custom interactive component(s)
     formula: <Formula big>…</Formula>,              // C. formula, variables, assumptions, worked example
     derivation: { title: 'Why it works', body: … }, // optional, collapsible
     checks: [ … ],                                  // D. assessment (see below)
     takeaways: ['…'],                               // shown on the completion screen
   };
   export default lesson;
   ```

2. Register it in `lessons/index.ts` under the chapter id (the chapter JSON file name without `.json`):

   ```ts
   '06-valuing-bonds': [
     { slug: 'bond-prices', title: 'Bond prices', summary: '…', minutes: 8, icon: 'bank_3d.png', load: () => import('./bonds/01-bond-prices') },
   ],
   ```

   The Learn tab, chapter progress and XP then pick it up automatically. **Never rename a published `slug`**: it is the key players' progress is saved under.

## Assessment items (`checks`)

| kind | what it checks | key fields |
|---|---|---|
| `number` | the typed value, within tolerance | `answer`, `unit` (`'$'`, `'%'`, `''`), `tol` (abs, default 0.01), `relTol` (default 0.5%), `traps` (common wrong answers with targeted feedback) |
| `mcq` | the chosen option | `choices`, `answer` (index), `why` (feedback per wrong choice) |
| `custom` | anything you build | `render({ submit, locked })`: call `submit(correct, feedback?)` |

Every item has a `prompt`, an `explain` (shown after a correct answer or the second miss), and an optional step-by-step `solution`. Students can retry until they get it right; stars are based on first tries.

Percent answers are written in percent (`answer: 4.2` for 4.2%); typing the decimal (0.042) is accepted too. Inputs like `$1,234.50` and `−3.33` are parsed.

## Rules the template enforces

- **XP:** the first completion pays 30 XP + 10 per star, plus 15 coins. Later completions pay only for new stars (10 XP each), so replaying can't farm XP.
- **Progress:** saved in `GameState.lessons` as `learn:<chapterId>/<slug>`, so it syncs, counts toward chapter progress, and resets with the weekly season like everything else.

## Building blocks (`components/learn/kit.tsx`)

`Block`, `Callout`, `Formula`, `Frac`, `M` (inline maths), `Vars`, `Worked`, `Expand`, `Viz` (frame for a visual, with "Try this" prompts), `Slider`, `Stat`, `Seg`, `Presets`, `SvgBar` (animated SVG bar) and `scale` (linear scale for hand-drawn charts). They are optional: a lesson can render anything.

## Maths

Keep calculations in a plain module (like `lessons/stocks/math.ts`) and check them against the course's worked numbers in `scripts/check-stock-math.ts`:

```
npm run test:math
```
