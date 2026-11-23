import Game from '@/components/Game';
import { loadCourse } from '@/lib/content';

export default function Page() {
  return <Game course={loadCourse()} />;
}
