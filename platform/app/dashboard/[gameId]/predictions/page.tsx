'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';

type Prediction = { id: string; guest_name: string; answers: Record<string, string>; score: number | null; created_at: string };
type Question = { id: string; title: string };

export default function PredictionsPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params?.gameId;
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      if (!gameId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: game } = await supabase.from('games').select('title').eq('id', gameId).eq('owner_id', user.id).maybeSingle();
      const { data: questionData } = await supabase.from('game_questions').select('id,title').eq('game_id', gameId).order('position', { ascending: true });
      const questionMap: Record<string, string> = {};
      (questionData as Question[] || []).forEach(q => { questionMap[q.id] = q.title; });

      const { data } = await supabase.from('predictions').select('id,guest_name,answers,score,created_at').eq('game_id', gameId).order('created_at', { ascending: false });

      setTitle(game?.title || 'Baby prediction game');
      setQuestions(questionMap);
      setPredictions((data || []) as Prediction[]);
      setLoading(false);
    }
    load();
  }, [gameId]);

  const filteredPredictions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = predictions.filter((prediction) => {
      return !query || prediction.guest_name.toLocaleLowerCase().includes(query);
    });

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [predictions, search]);

  function resetSearch() { setSearch(''); }

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a>
      <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-bold uppercase tracking-widest text-rose-500">Predictions</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1><p className="mt-2 text-slate-600">{predictions.length} prediction{predictions.length === 1 ? '' : 's'} received.</p></div>
          {predictions.length > 0 && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center"><p className="text-xs font-semibold text-rose-500">PREDICTION PARTY</p><p className="mt-1 text-xl font-bold text-rose-700">{predictions.length}</p></div>}
        </div>
      </div>

      {loading ? <p className="mt-8 text-slate-500">Loading…</p> : !predictions.length ? <div className="mt-6 rounded-3xl bg-white p-10 text-center ring-1 ring-slate-100"><div className="text-5xl">💌</div><p className="mt-4 font-semibold">No predictions yet</p><p className="mt-2 text-slate-500">Share your game link to invite family and friends.</p></div> : <>
        <section aria-label="Search predictions by guest name" className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Search by guest name</span><div className="flex items-center gap-2"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Enter guest name…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100" />{search && <button type="button" onClick={resetSearch} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Clear</button>}</div></label>
          <p className="mt-2 text-xs text-slate-500">Showing {filteredPredictions.length} of {predictions.length} prediction{predictions.length === 1 ? '' : 's'}</p>
        </section>

        {filteredPredictions.length === 0 ? <div className="mt-6 rounded-3xl bg-white p-10 text-center ring-1 ring-slate-100"><div className="text-4xl">🔎</div><p className="mt-3 font-semibold">No matching predictions</p><p className="mt-2 text-slate-500">Check the spelling or try another guest name.</p><button type="button" onClick={resetSearch} className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Clear search</button></div> : <div className="mt-6 space-y-4">
          {filteredPredictions.map((p, index) => <article key={p.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 font-bold text-rose-600">{index + 1}</div>
              <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{p.guest_name}</h2><p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString()}</p></div>
              {p.score !== null ? <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{p.score} pts</span> : <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Not scored</span>}
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-3 sm:p-5">{Object.entries(p.answers || {}).map(([key,value]) => <div key={key} className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-400">{questions[key] || 'Prediction'}</p><p className="mt-1 break-words font-semibold text-slate-800">{value}</p></div>)}</div>
          </article>)}
        </div>}
      </>}
    </div>
  </main>;
}
