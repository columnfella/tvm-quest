// Registry of interactive lessons, grouped by chapter id (the chapter JSON file name without .json,
// or its "id" field). Only this metadata ships with the page; each lesson's code loads when it is opened.
// To add a lesson: write a file exporting a LessonContent (see lessons/README.md) and list it here.
import { learnId, type LearnLesson, type LearnMeta } from '@/lib/learn';

const registry: Record<string, LearnMeta[]> = {
  '07-valuing-stocks': [
    { slug: 'what-a-share-is-worth', title: 'What is a share worth?', summary: 'Dividends, the sale price, and why your holding period doesn’t change the value.', minutes: 8, icon: 'money_bag_3d.png', load: () => import('./stocks/01-share-value') },
    { slug: 'zero-growth', title: 'Zero growth & preferred stock', summary: 'Why a dividend that lasts forever is worth a finite D / r.', minutes: 7, icon: 'coin_3d.png', load: () => import('./stocks/02-zero-growth') },
    { slug: 'constant-growth', title: 'Constant growth (Gordon)', summary: 'Growth races discounting: why r must beat g, and how sensitive the price is.', minutes: 10, icon: 'chart_increasing_3d.png', load: () => import('./stocks/03-constant-growth') },
    { slug: 'risk-and-return', title: 'Risk, required return & price', summary: 'Beta sets the required return; the market trades until expected = required.', minutes: 9, icon: 'high_voltage_3d.png', load: () => import('./stocks/04-risk-return') },
    { slug: 'nonconstant-growth', title: 'Nonconstant growth', summary: 'Grow the dividends, park a horizon value, discount it all back.', minutes: 11, icon: 'rocket_3d.png', load: () => import('./stocks/05-nonconstant') },
    { slug: 'growth-and-pvgo', title: 'Where growth comes from: SGR & PVGO', summary: 'Retained earnings, ROE versus r, and when growth destroys value.', minutes: 10, icon: 'seedling_3d.png', load: () => import('./stocks/06-pvgo') },
    { slug: 'fcf-model', title: 'Free cash flow model', summary: 'Value the whole firm, subtract the other claims, divide by shares.', minutes: 8, icon: 'bank_3d.png', load: () => import('./stocks/07-fcf') },
  ],
};

const cache: Record<string, LearnLesson[]> = {};

/** Interactive lessons of a chapter, in order (empty when it has none). */
export function learnLessons(chapterId: string): LearnLesson[] {
  return (cache[chapterId] ??= (registry[chapterId] ?? []).map((m) => ({ ...m, id: learnId(chapterId, m.slug), chapterId })));
}
