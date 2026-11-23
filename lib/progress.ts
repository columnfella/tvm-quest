// Chapter progress from any player's lesson map: interactive lessons (Learn tab) and exercise sets count alike.
import { learnLessons } from '@/lessons';
import type { Chapter } from './course';

export function progressFrom(lessons: Record<string, { done: boolean; stars: number } | undefined>, ch: Chapter) {
  const ids = [...learnLessons(ch.id).map((l) => l.id), ...ch.sections.flatMap((s) => s.lessons.map((l) => l.id))];
  const done = ids.filter((id) => lessons[id]?.done).length;
  const stars = ids.reduce((a, id) => a + (lessons[id]?.stars ?? 0), 0);
  return { done, total: ids.length, stars, maxStars: ids.length * 3 };
}
