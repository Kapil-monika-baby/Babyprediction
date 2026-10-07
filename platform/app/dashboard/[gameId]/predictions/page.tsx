'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    async function load() {
      if (!gameId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: game } = await supabase
        .from('games')
        .select('title')
        .eq('id', gameId)
        .eq('owner_id', user.id)
        .maybeSingle();

      const { data: questionData } = await supabase
        .from('game_questions')
        .select('id,title')
        .eq('game_id', gameId)
        .order('position', { ascending: true });

      const questionMap: Record<string, string> = {};
      (questionData as Question[] || []).forEach(q => { questionMap[q.id] = q.title; });

      const { data } = await supabase
        .from('predictions')
        .select('id,guest_name,answers,score,created_at')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      setTitle(game?.title || 'Baby prediction game');
      setQuestions(questionMap);
      setPredictions((data || []) as Prediction[]);
      setLoading(false);
    }
    load();
  }, [gameId]);

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-4xl">
    <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a>
    <div className="mt-5"><p className="text-sm font-semibold text-rose-500">Predictions</p><h1 className="mt-1 text-3xl font-bold">{title}</h1><p className="mt-2 text-slate-600">{predictions.length} prediction{predictions.length === 1 ? '' : 's'} received.</p></div>
    {loading ? <p className="mt-8 text-slate-500">Loading…</p> : !predictions.length ? <div className="mt-8 rounded-3xl bg-white p-8 text-center ring-1 ring-slate-100"><p className="font-semibold">No predictions yet</p><p className="mt-2 text-slate-500">Share your game link to invite family and friends.</p></div> : <div className="mt-8 space-y-4">{predictions.map(p => <article key={p.id} className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">{p.guest_name}</h2><p className="mt-1 text-xs text-slate-400">{new Date(p.created_at).toLocaleString()}</p></div>{p.score !== null && <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-600">{p.score} pts</span>}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(p.answers || {}).map(([key,value]) => <div key={key} className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">{questions[key] || 'Prediction'}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div></article>)}</div>}
  </div></main>;
}
