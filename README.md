# TVM Quest

An arcade-style trainer for the Time Value of Money chapter. It's built with Next.js 15, React 19, TypeScript and Framer Motion, and has a tiny backend for weekly leaderboards.

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
- **Database:** one Redis hash per week: `tvmq:<monday-date>` → `{ lowercase username: JSON record }`.
- **Weekly wipe:** a season runs from Monday 00:00 UTC to the next Monday. A new week reads a new key, so everyone starts fresh,
  and old keys expire one day after their season ends. Locally the JSON file resets itself the same way. The app shows a live countdown.
- **API** (`app/api/*`): `POST /register`, `POST /me`, `POST /sync`, `GET /leaderboard`.

## What's inside

- **Part 1 – Theory:** the Black Book's 15 conceptual MCQs, plus 3 "Formula Match" mini-games.
- **Part 2 – Math:** all 137 problems from the Black Book, sorted by the book's difficulty tag:
  - Seedling Meadow = Easy
  - Snowcap Ridge = Medium
  - Volcano Vault = Tough
- **Seasons:** a live leaderboard with a podium, and a reset countdown.
- **Gamification:**
  - Reward chests after every lesson (Wooden / Silver / Golden / Magic, by stars) with a tap-to-open animation
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
- Progress is saved in `localStorage` and synced to the server.

## Project map

| Path | What |
| --- | --- |
| `data/questions.json` | 152 questions parsed from the Black Book PDF (stem, options, answer, difficulty, topic, book solution) |
| `lib/data.ts` | Builds worlds, sections and lessons; formula-match pairs |
| `lib/store.ts` | Game state, levels, hearts, streak, achievements, server sync |
| `lib/db.ts` | Storage: Upstash Redis REST, or a local JSON file |
| `lib/season.ts` | Weekly season id and countdown |
| `lib/username.ts` | Name rules and profanity filter |
| `app/api/` | Register, me, sync, leaderboard routes |
| `lib/tvm.ts` | TVM solver used by the calculator |
| `lib/hints.ts` | Formula hint cards by topic |
| `lib/sound.ts` | Web Audio sound effects (no audio files) |
| `components/` | Home path, Lesson, Match game, Results, panels |

## Credits

- 3D icons: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT).
- UI icons: [Lucide](https://lucide.dev) (ISC).
- Confetti: [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC).
- Fonts: Lilita One and Nunito (Google Fonts, OFL).
