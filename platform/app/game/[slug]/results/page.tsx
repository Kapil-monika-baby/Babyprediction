'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';

type Winner = { guest_name: string; score: number };

export default function PublicResultsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [title, setTitle] = useState('');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data: game } = await supabase.from('games').select('id,title').eq('slug', slug).eq('status', 'completed').maybeSingle();
      if (!game) { setFound(false); setLoading(false); return; }
      const { data: result } = await supabase.from('game_results').select('winners').eq('game_id', game.id).maybeSingle();
      setTitle(game.title);
      setWinners((result?.winners || []) as Winner[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-center text-slate-500">Loading winners…</main>;

  if (!found) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center ring-1 ring-slate-100"><div className="text-6xl">🔒</div><h1 className="mt-5 text-2xl font-bold">Results aren't available yet</h1><p className="mt-2 text-slate-500">The parents haven't published the final results.</p><a href={`/game/${slug}`} className="mt-6 inline-block rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">Back to game</a></div></main>;

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-2xl">
    <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 sm:p-12">
      <div className="text-7xl">🏆</div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-rose-500">Baby prediction results</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-3 text-slate-600">{winners.length && winners[0].score > 0 ? 'And the winner is…' : 'Here are the top predictors…'}</p>
      {!winners.length ? <div className="mt-8 rounded-2xl bg-slate-50 p-6"><p className="font-semibold">Nobody matched the final answers, but the prediction party still happened!</p><p className="mt-2 text-sm text-slate-500">Thanks everyone for joining the prediction party. 💕</p></div> : <div className="mt-8 space-y-3">{winners.map((winner, index) => <div key={winner.guest_name + index} className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5"><div className="text-3xl">{index === 0 ? '🥇' : '🏆'}</div><p className="mt-2 text-xl font-bold">{winner.guest_name}</p><p className="mt-1 text-sm text-slate-600">{winner.score} correct prediction{winner.score === 1 ? '' : 's'}</p></div>)}</div>}
      <a href={`/game/${slug}`} className="mt-8 inline-block rounded-2xl border border-slate-200 px-6 py-3 font-semibold">Back to game</a>
    </div>
  </div></main>;
}
