'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Game = { id: string; title: string; status: string; slug: string };

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('games').select('id,title,status,slug').eq('owner_id', user.id).order('created_at', { ascending: false });
      const rows = data || [];
      setGames(rows);
      if (rows.length) {
        const { count } = await supabase.from('predictions').select('id', { count: 'exact', head: true }).in('game_id', rows.map(g => g.id));
        setPredictionCount(count || 0);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/game/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    window.setTimeout(() => setCopied(''), 1800);
  }

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-6xl">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-rose-500">Parent dashboard</p><h1 className="mt-1 text-3xl font-bold">Your baby games</h1><p className="mt-2 text-slate-600">Create, customize and share a prediction game with family and friends.</p></div><a href="/create-game" className="rounded-2xl bg-slate-900 px-5 py-3 text-center font-semibold text-white">+ Create a game</a></header>
    <section className="mt-10 grid gap-5 sm:grid-cols-3"><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Games</p><p className="mt-2 text-3xl font-bold">{loading ? '…' : games.length}</p></div><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Predictions received</p><p className="mt-2 text-3xl font-bold">{loading ? '…' : predictionCount}</p></div><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Games published</p><p className="mt-2 text-3xl font-bold">{loading ? '…' : games.filter(g => g.status === 'published').length}</p></div></section>
    <section className="mt-10 space-y-4">{!loading && games.length === 0 && <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-slate-100"><p className="text-lg font-semibold">No games yet</p><p className="mt-2 text-slate-500">Create your first baby prediction game to get started.</p></div>}
      {games.map(game => <div key={game.id} className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xl font-bold">{game.title}</p><p className="mt-1 text-sm text-slate-500">{game.status} · /game/{game.slug}</p></div><div className="flex flex-wrap gap-2"><a href={`/game/${game.slug}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Open</a><a href={`/dashboard/${game.id}/predictions`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Predictions</a><a href={`/dashboard/${game.id}/results`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Results</a><a href={`/customize-game?gameId=${game.id}`} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Edit</a><button type="button" onClick={() => copyLink(game.slug)} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white">{copied === game.slug ? 'Copied!' : 'Share link'}</button></div></div></div>)}
    </section>
  </div></main>;
}
