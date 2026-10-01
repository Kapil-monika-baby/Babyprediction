import { notFound } from 'next/navigation';

export default async function PublicGamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 sm:p-12">
          <div className="text-7xl">👶</div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-slate-500">A little prediction party</p>
          <h1 className="mt-3 text-4xl font-bold">Can you predict our baby?</h1>
          <p className="mx-auto mt-4 max-w-md text-slate-600">Make your predictions, share your wishes, and see how well you know the parents.</p>
          <p className="mt-6 text-xs text-slate-400">Game: {slug}</p>
          <a href={`/game/${slug}/play`} className="mt-8 inline-block rounded-2xl bg-slate-900 px-7 py-3 font-semibold text-white">Start predicting →</a>
        </div>
      </div>
    </main>
  );
}
