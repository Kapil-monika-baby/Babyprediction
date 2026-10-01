'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Prediction = { id: string; guest_name: string; answers: Record<string, string>; created_at: string };

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setLoading(false); return; }
      const { data: games } = await supabase.from('games').select('id').eq('owner_id', user.user.id);
      const ids = (games || []).map(game => game.id);
      if (ids.length) {
        const { data } = await supabase.from('predictions').select('id,guest_name,answers,created_at').in('game_id', ids).order('created_at', { ascending: false });
        setPredictions(data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-6xl"><a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a><div className="mt-8"><p className="text-sm font-semibold text-rose-500">Predictions</p><h1 className="mt-2 text-4xl font-bold">Who predicted what?</h1><p className="mt-3 text-slate-600">All predictions received across your games.</p></div>{loading ? <p className="mt-10 text-slate-500">Loading predictions…</p> : predictions.length === 0 ? <div className="mt-10 rounded-3xl bg-white p-10 text-center ring-1 ring-slate-100"><div className="text-5xl">📝</div><h2 className="mt-4 text-xl font-bold">No predictions yet</h2><p className="mt-2 text-slate-500">Share your published game to start collecting predictions.</p></div> : <div className="mt-10 grid gap-4">{predictions.map(prediction => <article key={prediction.id} className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{prediction.guest_name}</h2><span className="text-xs text-slate-400">{new Date(prediction.created_at).toLocaleString()}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(prediction.answers).map(([key, value]) => <div key={key} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{key}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div></article>)}</div>}</div></main>;
}
