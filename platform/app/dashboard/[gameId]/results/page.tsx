'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';

type Question = { id: string; type: string; title: string; position: number };
type Prediction = { id: string; guest_name: string; answers: Record<string, string>; score: number | null; created_at: string };

export default function ResultsPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params?.gameId;
  const [game, setGame] = useState<{ title: string; slug: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [actual, setActual] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!gameId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Please log in again.'); setLoading(false); return; }
      const { data: gameData } = await supabase.from('games').select('title,slug').eq('id', gameId).eq('owner_id', user.id).maybeSingle();
      const { data: questionData } = await supabase.from('game_questions').select('id,type,title,position').eq('game_id', gameId).eq('enabled', true).order('position');
      const { data: predictionData } = await supabase.from('predictions').select('id,guest_name,answers,score,created_at').eq('game_id', gameId).order('created_at', { ascending: true });
      const { data: resultData } = await supabase.from('game_results').select('actual_results').eq('game_id', gameId).maybeSingle();
      setGame(gameData);
      setQuestions(questionData || []);
      setPredictions((predictionData || []) as Prediction[]);
      if (resultData?.actual_results) setActual(resultData.actual_results as Record<string, string>);
      setSaved(Boolean(resultData));
      setLoading(false);
    }
    load();
  }, [gameId]);

  const ranked = useMemo(() => [...predictions].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [predictions]);

  async function saveResults(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !gameId) { setError('Please log in again.'); setSaving(false); return; }

    const scoreable = questions.filter(q => q.type !== 'wishes');
    const scored = predictions.map(prediction => {
      let score = 0;
      for (const q of scoreable) {
        if (actual[q.id] && prediction.answers?.[q.id] && actual[q.id].trim().toLowerCase() === prediction.answers[q.id].trim().toLowerCase()) score++;
      }
      return { ...prediction, score };
    });

    const { error: resultError } = await supabase.from('game_results').upsert({
      game_id: gameId,
      actual_results: actual,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'game_id' });
    if (resultError) { setError(resultError.message); setSaving(false); return; }

    for (const prediction of scored) {
      await supabase.from('predictions').update({ score: prediction.score }).eq('id', prediction.id).eq('game_id', gameId);
    }
    setPredictions(scored);
    await supabase.from('games').update({ updated_at: new Date().toISOString() }).eq('id', gameId).eq('owner_id', user.id);
    setSaved(true);
    setSaving(false);
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-center text-slate-500">Loading results…</main>;

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-4xl">
    <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a>
    <div className="mt-5"><p className="text-sm font-semibold text-rose-500">Results</p><h1 className="mt-1 text-3xl font-bold">{game?.title || 'Baby prediction game'}</h1><p className="mt-2 text-slate-600">Enter the actual answers, then we’ll calculate the winners automatically.</p></div>
    <form onSubmit={saveResults} className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-slate-100 sm:p-8">
      <h2 className="text-xl font-bold">Actual results</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{questions.map(q => <label key={q.id} className="block text-sm font-semibold">{q.title}{q.type !== 'wishes' && <span className="ml-2 text-xs font-normal text-slate-400">scored</span>}<input value={actual[q.id] || ''} onChange={e => setActual({ ...actual, [q.id]: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" placeholder={q.type === 'arrival' ? 'YYYY-MM-DD' : 'Enter actual answer'} /></label>)}</div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button disabled={saving || !questions.length} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Calculating…' : saved ? 'Update results' : 'Calculate winners'}</button>
    </form>
    <section className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-slate-100 sm:p-8"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Leaderboard</h2><span className="text-sm text-slate-500">{predictions.length} prediction{predictions.length === 1 ? '' : 's'}</span></div>
      {!ranked.length ? <p className="mt-6 text-slate-500">No predictions yet.</p> : <div className="mt-5 space-y-3">{ranked.map((p, index) => <div key={p.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-4"><div><span className="mr-3 text-lg">{index === 0 && saved ? '🏆' : `#${index + 1}`}</span><span className="font-semibold">{p.guest_name}</span></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{p.score ?? 0} pts</span></div>)}</div>}
    </section>
  </div></main>;
}
