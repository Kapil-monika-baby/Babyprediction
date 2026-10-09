'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';

type Winner = { guest_name: string; score: number };
type Prediction = { id: string; guest_name: string; answers: Record<string, string>; score: number | null; created_at: string };
type Question = { id: string; title: string };
type ActualResults = Record<string, string>;

export default function PublicResultsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [title, setTitle] = useState('');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const [actualResults, setActualResults] = useState<Record<string, string>>({});
  const [actualResults, setActualResults] = useState<ActualResults>({});
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(true);
  const [view, setView] = useState<'top' | 'all'>('top');
  const [shared, setShared] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data: game } = await supabase.from('games').select('id,title').eq('slug', slug).eq('status', 'completed').maybeSingle();
      if (!game) { setFound(false); setLoading(false); return; }

      const [{ data: result }, { data: predictionData }, { data: questionData }, { data: savedResults }] = await Promise.all([
        supabase.from('game_results').select('winners,actual_results').eq('game_id', game.id).maybeSingle(),
        supabase.from('predictions').select('id,guest_name,answers,score,created_at').eq('game_id', game.id).order('score', { ascending: false }).order('created_at', { ascending: true }),
        supabase.from('game_questions').select('id,title').eq('game_id', game.id).order('position', { ascending: true }),
        supabase.from('game_results').select('actual_results').eq('game_id', game.id).maybeSingle(),
      ]);

      const questionMap: Record<string, string> = {};
      (questionData as Question[] || []).forEach(q => { questionMap[q.id] = q.title; });
      setTitle(game.title);
      setWinners((result?.winners || []) as Winner[]);
      setActualResults((result?.actual_results || {}) as ActualResults);
      setQuestions(questionMap);
      setActualResults((savedResults?.actual_results || {}) as Record<string, string>);
      setPredictions((predictionData || []) as Prediction[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  const topPredictions = useMemo(() => {
    const max = Math.max(...predictions.map(p => p.score ?? 0), 0);
    return predictions.filter(p => (p.score ?? 0) === max).slice(0, 10);
  }, [predictions]);
  const visible = view === 'top' ? topPredictions : predictions;

  async function shareResults() {
    const url = window.location.href;
    const text = winners.length && winners[0].score > 0
      ? `🏆 ${title} — the winner is ${winners.map(w => w.guest_name).join(', ')}! See the full prediction results:`
      : `🎉 ${title} — see who predicted the baby best!`;
    try {
      if (navigator.share) await navigator.share({ title: `${title} Results`, text, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2200); }
    } catch {}
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-center text-slate-500">Loading results…</main>;

  if (!found) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center ring-1 ring-slate-100"><div className="text-6xl">🔒</div><h1 className="mt-5 text-2xl font-bold">Results aren't available yet</h1><p className="mt-2 text-slate-500">The parents haven't published the final results.</p><a href={`/game/${slug}`} className="mt-6 inline-block rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">Back to game</a></div></main>;

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
        <div className="relative px-5 pb-8 pt-8 text-center sm:px-10 sm:pt-12">
          <div className="text-7xl">🏆</div>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-rose-500">Baby prediction results</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">{winners.length && winners[0].score > 0 ? 'The prediction party has a winner!' : 'Here are the top predictors from your prediction party.'}</p>

          {winners.length > 0 && winners[0].score > 0 && <div className="mt-7 rounded-[2rem] bg-gradient-to-br from-amber-50 via-white to-rose-50 p-6 ring-1 ring-amber-100 sm:p-8">
            <div className="text-6xl">🎉</div>
            <p className="mt-3 text-sm font-bold uppercase tracking-widest text-amber-600">{winners.length > 1 ? 'We have a tie!' : 'And the winner is…'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">{winners.map((w, i) => <div key={w.guest_name + i} className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-amber-100"><p className="text-2xl font-black">{i === 0 ? '👑' : '🥇'} {w.guest_name}</p><p className="mt-1 text-sm font-semibold text-slate-500">{w.score} correct prediction{w.score === 1 ? '' : 's'}</p></div>)}</div>
            <p className="mt-5 text-sm text-slate-500">Congratulations! You know the parents best. 💕</p>
          </div>}

          {winners.length === 0 || winners[0].score === 0 ? <div className="mt-7 rounded-3xl bg-slate-50 p-6"><p className="font-bold">Nobody matched the final answers — but the prediction party still happened! 🎈</p><p className="mt-2 text-sm text-slate-500">Thanks everyone for joining and sending love to the parents.</p></div> : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={shareResults} className="rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white shadow-sm">📤 Share results</button>
            <a href={`/game/${slug}`} className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold">Back to game</a>
          </div>
          {shared && <p className="mt-3 text-sm font-semibold text-emerald-600">✓ Results link copied!</p>}
        </div>

        {Object.values(actualResults).some(value => typeof value === 'string' && value.trim()) && <section className="border-t border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3">
              <span><span className="block text-sm font-bold text-rose-700">👶 Parents’ actual answers</span><span className="mt-0.5 block text-xs text-rose-600">Compare your guesses with the real answers</span></span>
              <span className="text-rose-600 transition group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(actualResults).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">{questions[key] || 'Actual answer'}</p>
                <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value}</p>
              </div>)}
            </div>
          </details>
        </section>}

        {predictions.length > 0 && <section className="border-t border-slate-100 px-4 py-6 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-bold">Prediction leaderboard</h2><p className="mt-1 text-sm text-slate-500">{predictions.length} prediction{predictions.length === 1 ? '' : 's'} received</p></div>
            <div className="flex rounded-2xl bg-slate-100 p-1"><button type="button" onClick={() => setView('top')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'top' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Top predictions</button><button type="button" onClick={() => setView('all')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'all' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>All predictions</button></div>
          </div>
          <div className="mt-5 space-y-3">{visible.map((p, index) => <article key={p.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-bold text-rose-600 shadow-sm">{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{p.guest_name}</p><p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</p></div><span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700 shadow-sm">{p.score ?? 0} pts</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(p.answers || {}).map(([key,value]) => <div key={key} className="rounded-2xl bg-white px-3 py-2"><p className="text-xs text-slate-400">{questions[key] || 'Prediction'}</p><p className="mt-1 text-sm font-semibold">{value}</p>{actualResults[key]?.trim() && <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-xs text-emerald-700"><span className="font-semibold">Parents’ answer:</span> {actualResults[key]}</p>}</div>)}</div>
          </article>)}</div>
        </section>}
      </div>
    </div>
  </main>;
}
