# TVM Quest

A Duolingo-style trainer for the Time Value of Money chapter. It's built with Next.js 15, React 19, TypeScript and Framer Motion.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in ./out (open out/index.html via any static server)
```

## What's inside

- **Part 1 – Theory:** the Black Book's 15 conceptual MCQs, plus 3 "Formula Match" mini-games.
- **Part 2 – Math:** all 137 problems from the Black Book, sorted by the book's difficulty tag:
  - Seedling Meadow = Easy
  - Snowcap Ridge = Medium
  - Volcano Vault = Tough
- **Gamification:**
  - XP (Easy 10 / Medium 15 / Tough 25, plus a combo bonus)
  - Combos with a "5 in a row" burst
  - Hearts that refill over time or with gems
  - Gems, hints and a daily streak
  - A daily XP goal, levels, 3-star ratings and 13 badges
  - Confetti and synthesized sound effects
- **Learning aids:**
  - A wrong answer shows the correct one and comes back at the end of the lesson.
  - The Black Book's worked solution is one tap away.
  - Formula hints, plus a BA II Plus-style TVM calculator (N, I/Y, PV, PMT, FV, END/BGN, P/Y).
- **Settings:** sound, free play (unlock everything), unlimited hearts, daily goal, reset.
- Progress is saved in `localStorage`.

## Project map

| Path | What |
| --- | --- |
| `data/questions.json` | 152 questions parsed from the Black Book PDF (stem, options, answer, difficulty, topic, book solution) |
| `lib/data.ts` | Builds worlds, sections and lessons; formula-match pairs |
| `lib/store.ts` | Game state, levels, hearts, streak, achievements |
| `lib/tvm.ts` | TVM solver used by the calculator |
| `lib/hints.ts` | Formula hint cards by topic |
| `lib/sound.ts` | Web Audio sound effects (no audio files) |
| `components/` | Home path, Lesson, Match game, Results, panels |

## Credits

- 3D icons: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT).
- UI icons: [Lucide](https://lucide.dev) (ISC).
- Confetti: [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC).
- Font: Nunito (Google Fonts, OFL).
