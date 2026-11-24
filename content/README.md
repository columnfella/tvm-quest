# Editing the course content

Everything course-specific lives in this folder. **You never need to touch the code** to add a chapter,
change a question or even swap in a completely different course.

```
content/
  course.json            ← course name, settings, difficulty levels
  chapters/
    01-goals-and-governance.json
    02-financial-markets.json
    ...                  ← one file per chapter; drop a new file in and it appears
```

Restart `npm run dev` (or just refresh) to see changes. If something is wrong in a file, the app **skips the
broken bit and keeps working**. Every problem is listed in **Settings → content warnings** and in the terminal.

## course.json

| Field | Meaning | Default |
| --- | --- | --- |
| `id` | Short id; also namespaces the leaderboard database | `course` |
| `title`, `subtitle`, `tagline` | Shown on the sign-up screen, top bar and browser tab | — |
| `mascot` | Image file from `public/assets/` | `pig_face_3d.png` |
| `lessonSize` | Questions per lesson | `5` |
| `quickPracticeSize` | Questions in "Quick practice" / "Review mistakes" | `10` |
| `shuffleChoices` | Shuffle answer order each time a question is shown | `true` |
| `calculator` | `true` shows the financial calculator (chapters opt in too) | `false` |
| `difficulties` | Levels as `{ "key": { "label", "xp", "color" } }` | easy / medium / hard |
| `parts` | Tabs inside every chapter, e.g. Theory / Math: `[{ "id", "label", "tagline", "icon" }]`. Each section picks one with `"part"` | one tab |
| `credits` | Shown in Settings | — |
| `coach` | Optional pop-up character: `{ "name", "image", "lines": [...] }`. Appears after every 3 correct answers in a row and on good results. Add `"photo": true` to show `image` as a round photo (any .png/.jpg/.webp in `public/assets/`) instead of the drawn suit, or `"cutout": true` for a transparent cut-out of a person (trimmed .webp/.png) that rises from the bottom corner | none |

## A chapter file

The file name sets the order when chapters have no `number`. Only `questions` is required.

```json
{
  "number": 8,
  "title": "Risk & Return",
  "tagline": "Shown under the title",
  "icon": "chart_increasing_3d.png",
  "color": "#22c55e",
  "calculator": true,
  "lessonSize": 5,
  "sections": [
    { "name": "Basics", "blurb": "Optional description shown above the lessons.", "part": "theory" }
  ],
  "pairsTitle": "Term Match",
  "pairsMono": false,
  "pairs": [ { "left": "Beta", "right": "Sensitivity to the market" } ],
  "hints": [
    { "title": "CAPM", "topics": ["capm", "beta"], "lines": ["r = r_{f} + β(r_{m} − r_{f})"] },
    { "title": "General tips", "topics": ["*"], "lines": ["Used when no other hint matches"] }
  ],
  "questions": [
    {
      "id": "1",
      "section": "Basics",
      "difficulty": "easy",
      "topic": "Beta",
      "question": "A stock with a beta of 1.5 is…",
      "choices": ["Less risky than the market", "50% more volatile than the market", "Risk-free"],
      "answer": "B",
      "explanation": "Optional. Shown after answering.",
      "source": "Optional label, e.g. Midterm Q4",
      "hint": "Optional hint for just this question"
    }
  ]
}
```

### Question fields

- **`question`** (required): plain text. Separate paragraphs with a blank line. Wrap tables or cash-flow listings in
  triple backticks and they render in a monospace box.
- **`choices`** (required): 2 or more answers. Any number works; keys 1–9 select them.
- **`answer`** (required): a letter (`"B"`), a 0-based index (`1`), or the exact text of the right choice.
- **`difficulty`**: one of the keys in `course.json` (`easy`/`medium`/`hard` by default; `E`/`M`/`T` also work).
- **`section`**: groups questions into a section. Sections listed in `sections` come first, in that order.
  Questions without a section are grouped by difficulty.
- **`topic`**: used for lesson titles and to pick a hint. Defaults to the section name.
- `id`, `explanation`, `source`, `hint` are optional. Set `"shuffle": false` to keep a question's choice order.
  Choices that mention other letters ("Statements a and c", "All of the above") and True/False are never shuffled.
- **Tip:** keep the right answer about as long as the wrong ones; students learn to pick the longest choice.

Lessons are built automatically: each section's questions are cut into lessons of `lessonSize`.
Progress is stored per lesson, so re-ordering questions can reset a few lessons' stars. Nothing breaks.

### Parts and the cheat sheet

- Each section belongs to one **part** (a tab such as Theory or Math). Set it with `"part"` in `sections`; a question can also carry `"part"`. Sections without one go to the first part. Match games use `"pairsPart"` (default: first part).
- Quick practice and Review mistakes work per part.
- Every chapter gets a free **Cheat sheet** listing all its hints and match pairs.

### Hints, match games, icons

- **Hints**: a question shows the first hint whose `topics` keyword appears in its topic or section.
  A hint with `"topics": ["*"]` is the chapter's fallback. Without any hint, the Hint button is hidden.
  `^{…}` and `_{…}` render as superscript and subscript.
- **Match games** appear automatically when a chapter has 4+ `pairs` (a speed-run version unlocks at 7+).
  `pairsMono: true` shows the right side in a monospace font, which suits formulas.
- **Icons**: any PNG in `public/assets/`. Missing files fall back to a default and show a warning.

## Switching to another course

Replace `course.json` (with a new `id`) and the files in `chapters/`. The leaderboard, badges and progress are all
generated from the content, so nothing else changes.
