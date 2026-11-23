# Finance Quest

An arcade-style practice app for any multiple-choice course. It ships with FIN 3301 (Ch. 1, 2, 5, 6, 7): 336 questions, including the full Black Book Ch. 5 bank and Black Book Ch. 6 homework exercises. It's built with Next.js 15, React 19, TypeScript and Framer Motion, and has a tiny backend for weekly leaderboards.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no environment variables set, the backend stores data in `.data/db.json` (git-ignored).

## Deploy (Vercel + Upstash Redis, both free)

1. Import this repo at [vercel.com/new](https://vercel.com/new). No settings need changing.
2. In the project, go to **Storage → Create → Upstash for Redis** (Marketplace) and connect it to the project.
   This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work.)
3. Redeploy. That's it.

## Backend

- **Accounts:** players type a username (3–16 letters, numbers or `_`; profanity is blocked in `lib/username.ts`) and pick one of 18 avatars.
  There are no passwords: the server returns a secret token that the browser keeps, and that token is required to save progress.
- **Database:** one Redis hash per week: `<course id>:<monday-date>` → `{ lowercase username: JSON record }`.
- **Weekly wipe:** a season runs from Monday 00:00 UTC to the next Monday. A new week reads a new key, so everyone starts fresh,
  and old keys expire one day after their season ends. Locally the JSON file resets itself the same way. The app shows a live countdown.
- **API** (`app/api/*`): `POST /register`, `POST /me`, `POST /sync`, `GET /leaderboard`.

## Content

All questions, chapters and course settings are JSON files in [`content/`](content/README.md). Add a file to
`content/chapters/` and a new chapter appears; edit or replace them to run a different course. No code changes are needed.
Mistakes in the files are skipped and listed in **Settings → content warnings**.

## What's inside

- **Chapters:** pick any chapter, then the **Theory** (memorize) or **Math** (solve) tab. Every lesson is open, and there are no hearts or lives.
- **Cheat sheet:** every chapter has a free page with all of its formulas and key terms.
- **Quick practice:** 10 random questions from the chapter. **Review mistakes:** only the ones you got wrong.
- **Match games:** generated from each chapter's term/formula pairs.
- **Seasons:** weekly leaderboard with a podium; everything resets Monday 00:00 UTC.
- **Coach:** "The Wolf", a cartoon banker that pops in with clean Wall Street-style hype lines (edit them in `content/course.json`).
- **Finance touches:** a scrolling progress ticker, chart-grid background, sparklines on chapter cards, coins.
- **Rewards:** XP, combos, vaults (Silver → Gold) with an opening animation, levels, streaks, badges (one per chapter).
- **Learning aids:** explanations after each answer, hints (cost coins), wrong answers come back at the end of the lesson, and an optional financial calculator.

## Project map

| Path | What |
| --- | --- |
| `content/` | Course + chapter JSON (see content/README.md) |
| `lib/content.ts` | Loads and validates the content (server) |
| `lib/course.ts` | Course types and client helpers |
| `lib/store.ts` | Game state, levels, streak, missed questions, generated badges, server sync |
| `lib/db.ts` | Storage: Upstash Redis REST, or a local JSON file |
| `lib/season.ts` | Weekly season id and countdown |
| `lib/username.ts` | Name rules and profanity filter |
| `app/api/` | Register, me, sync, leaderboard routes |
| `lib/tvm.ts` | TVM solver used by the calculator |
| `lib/sound.ts` | Web Audio sound effects (no audio files) |
| `components/` | Chapter grid, chapter view, lesson, match game, results, crate, panels |

## Credits

- Questions: course slides, cheat sheets, Black Book Ch. 5, FIN 3301 mock midterm, bond practice set.
- 3D icons: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT).
- UI icons: [Lucide](https://lucide.dev) (ISC).
- Confetti: [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC).
- Fonts: Lilita One and Nunito (Google Fonts, OFL).
