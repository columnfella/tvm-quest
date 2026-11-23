import Game from '@/components/Game';
import { loadCourse, toClientCourse } from '@/lib/content';

export default function Page() {
  return <Game course={toClientCourse(loadCourse())} />;
}
