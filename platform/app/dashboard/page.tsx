'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Game = { id: string; title: string; status: string; slug: string };

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [shared, setShared] = useState('');
  const [publishedGameId, setPublishedGameId] = useState('');

  useEffect(() => {
    const published = new URLSearchParams(window.location.search).get('published');
    if (published) setPublishedGameId(published);
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

  async function shareGame(game: Game) {
    const url = `${window.location.origin}/game/${game.slug}`;
    const text = `Join ${game.title} and make your baby predictions! 👶💕`;
    if (navigator.share) {
      try { await navigator.share({ title: game.title, text, url }); setShared(game.slug); window.setTimeout(() => setShared(''), 1800); } catch {}
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setShared(game.slug); window.setTimeout(() => setShared(''), 1800);
  }

  async function shareResults(game: Game) {
    const url = `${window.location.origin}/game/${game.slug}/results`;
    const text = `🏆 ${game.title} results are here! See the winner and top predictions 🎉`;
    if (navigator.share) { try { await navigator.share({ title: `${game.title} Results`, text, url }); setShared(`${game.slug}-results`); window.setTimeout(() => setShared(''), 1800); } catch {} return; }
    await navigator.clipboard.writeText(`${text} ${url}`); setShared(`${game.slug}-results`); window.setTimeout(() => setShared(''), 1800);
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/game/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    window.setTimeout(() => setCopied(''), 1800);
  }

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-7 text-slate-900 sm:px-6 sm:py-10"><div className="mx-auto max-w-6xl">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-rose-500">Parent dashboard</p><h1 className="mt-1 text-3xl font-bold">Your baby games</h1><p className="mt-2 text-slate-600">Create, customize and share a prediction game with family and friends.</p></div><a href="/create-game" className="rounded-2xl bg-slate-900 px-5 py-3 text-center font-semibold text-white">+ Create a game</a></header>
    {publishedGameId && <div className="mt-8 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100"><p className="font-bold text-emerald-900">🎉 Game published successfully!</p><p className="mt-1 text-sm text-emerald-800">Your game is live. Use Share or WhatsApp below to invite family and friends.</p></div>}<section className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-5"><div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6"><p className="text-sm text-slate-500">Games</p><p className="mt-2 text-3xl font-bold">{loading ? '…' : games.length}</p></div><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Predictions received</p><p className="mt-2 text-3xl font-bold">{loading ? '…' : predictionCount}</p></div><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Games published</p><p className="mt-2 text-3xl font-bold">{loading ? '…' : games.filter(g => g.status === 'published').length}</p></div></section>
    <section className="mt-7 space-y-4 sm:mt-10">{!loading && games.length === 0 && <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-slate-100"><p className="text-lg font-semibold">No games yet</p><p className="mt-2 text-slate-500">Create your first baby prediction game to get started.</p></div>}
      {games.map(game => <div key={game.id} className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xl font-bold">{game.title}</p><p className="mt-1 text-sm text-slate-500">{game.status} · /game/{game.slug}</p></div><div className="flex flex-wrap gap-2"><a href={`/game/${game.slug}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Open</a><a href={`/dashboard/${game.id}/predictions`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Predictions</a><a href={`/dashboard/${game.id}/results`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">Results</a>{game.status === 'completed' && <button type="button" onClick={() => shareResults(game)} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">{shared === `${game.slug}-results` ? 'Shared!' : '🏆 Share results'}</button>}<a href={`/customize-game?gameId=${game.id}`} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Edit</a><button type="button" onClick={() => shareGame(game)} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white">{shared === game.slug ? 'Shared!' : 'Share'}</button><a href={`https://wa.me/?text=${encodeURIComponent(`Join ${game.title} and make your baby predictions! 👶💕 ${window.location.origin}/game/${game.slug}`)}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">WhatsApp</a><button type="button" onClick={() => copyLink(game.slug)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">{copied === game.slug ? 'Copied!' : 'Copy link'}</button></div></div></div>)}
    </section>
  </div></main>;
}
