import { chapterQuestions, loadCourse } from '@/lib/content';

// One static JSON file per chapter, generated at build time and served from Vercel's CDN.
// The page itself only ships a light question index; full questions load when a chapter is opened.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return loadCourse().chapters.map((c) => ({ id: c.id }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qs = chapterQuestions(id);
  if (!qs) return new Response('Not found', { status: 404 });
  return Response.json(qs);
}
