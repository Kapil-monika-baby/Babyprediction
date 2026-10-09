'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Game = { id: string; title: string; status: string; slug: string };

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [gamePredictionCounts, setGamePredictionCounts] = useState<Record<string, number>>({});
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
        const { data: predictionRows, count } = await supabase.from('predictions').select('game_id', { count: 'exact' }).in('game_id', rows.map(g => g.id));
        setPredictionCount(count || 0);
        const counts: Record<string, number> = {};
        (predictionRows || []).forEach((prediction: { game_id: string }) => {
          counts[prediction.game_id] = (counts[prediction.game_id] || 0) + 1;
        });
        setGamePredictionCounts(counts);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function shareGame(game: Game) {
    const url = `${window.location.origin}/game/${game.slug}`;
    const message = `Join ${game.title} and make your baby predictions! 👶💕`;
    if (navigator.share) {
      try { await navigator.share({ title: game.title, text: message, url }); setShared(game.slug); window.setTimeout(() => setShared(''), 1800); } catch {}
      return;
    }
    await navigator.clipboard.writeText(`${message} ${url}`);
    setShared(game.slug); window.setTimeout(() => setShared(''), 1800);
  }

  async function shareResults(game: Game) {
    const url = `${window.location.origin}/game/${game.slug}/results`;
    const message = `🏆 ${game.title} results are here! See the winner and top predictions 🎉`;
    if (navigator.share) { try { await navigator.share({ title: `${game.title} Results`, text: message, url }); setShared(`${game.slug}-results`); window.setTimeout(() => setShared(''), 1800); } catch {} return; }
    await navigator.clipboard.writeText(`${message} ${url}`); setShared(`${game.slug}-results`); window.setTimeout(() => setShared(''), 1800);
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/game/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    window.setTimeout(() => setCopied(''), 1800);
  }

  const publishedCount = games.filter(game => game.status === 'published').length;

  return (
    <main className="min-h-screen bg-[#fff9f7] text-slate-900">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-72 bg-gradient-to-br from-rose-100/80 via-orange-50 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <nav className="mb-10 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2.5" aria-label="Baby Prediction home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-rose-100">👶</span>
            <span className="text-base font-extrabold tracking-tight">little <span className="text-rose-500">moments</span></span>
          </a>
          <span className="rounded-full border border-white/90 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm">Parent space ✨</span>
        </nav>

        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">Your family, your memories</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Your baby games</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">A little fun for everyone who loves your growing family. Manage your games, see predictions and share the excitement.</p>
          </div>
          <a href="/create-game" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-rose-600">
            <span className="text-lg leading-none">＋</span> Create a game
          </a>
        </header>

        {publishedGameId && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg">🎉</span>
            <div><p className="font-bold text-emerald-900">Your game is live!</p><p className="mt-1 text-sm leading-5 text-emerald-800">The fun can begin. Share the game link with family and friends so they can join in.</p></div>
          </div>
        )}

        <section className="mt-10 sm:mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Your games <span className="ml-1 text-sm font-semibold text-slate-400">{loading ? '' : games.length}</span></h2>
              <p className="mt-1 text-sm text-slate-500">Everything for your baby celebration, in one place.</p>
            </div>
            {!loading && games.length > 0 && <p className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{publishedCount} live {publishedCount === 1 ? 'game' : 'games'} · {predictionCount} {predictionCount === 1 ? 'prediction' : 'predictions'}</p>}
          </div>

          {loading && <div className="grid gap-4 md:grid-cols-2"><div className="h-52 animate-pulse rounded-3xl bg-white/80 ring-1 ring-slate-100" /><div className="h-52 animate-pulse rounded-3xl bg-white/80 ring-1 ring-slate-100" /></div>}

          {!loading && games.length === 0 && (
            <div className="overflow-hidden rounded-[2rem] border border-rose-100 bg-white text-center shadow-sm">
              <div className="bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 px-6 py-10 sm:py-14">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white text-4xl shadow-sm ring-1 ring-rose-100">🧸</div>
                <h3 className="mt-5 text-xl font-extrabold">Your first little celebration starts here</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Create a baby prediction game, invite your favourite people and collect their guesses, names and wishes.</p>
                <a href="/create-game" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600">Create your first game <span className="ml-2">→</span></a>
              </div>
              <div className="grid gap-3 px-5 py-5 text-left sm:grid-cols-3 sm:px-8">
                <div className="flex items-center gap-3"><span className="text-xl">🎲</span><div><p className="text-sm font-bold">Make it yours</p><p className="text-xs text-slate-500">Choose questions and a look</p></div></div>
                <div className="flex items-center gap-3"><span className="text-xl">💌</span><div><p className="text-sm font-bold">Invite your people</p><p className="text-xs text-slate-500">Share a simple game link</p></div></div>
                <div className="flex items-center gap-3"><span className="text-xl">🏆</span><div><p className="text-sm font-bold">Enjoy the reveal</p><p className="text-xs text-slate-500">See predictions and winners</p></div></div>
              </div>
            </div>
          )}

          {!loading && games.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {games.map((game) => {
                const completed = game.status === 'completed';
                const isPublished = game.status === 'published';
                return (
                  <article key={game.id} className="group overflow-hidden rounded-[1.75rem] border border-rose-100/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-900/5">
                    <div className="h-1.5 bg-gradient-to-r from-rose-400 via-pink-300 to-amber-200" />
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${completed ? 'bg-amber-50' : 'bg-rose-50'}`}>{completed ? '🏆' : '👶'}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{game.title || 'Baby prediction game'}</h3>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${completed ? 'bg-amber-50 text-amber-700' : isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${completed ? 'bg-amber-500' : isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`} />{game.status || 'draft'}</span>
                          </div>
                          <p className="mt-1.5 break-all text-xs text-slate-400">babyprediction.vercel.app/game/{game.slug}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${ (gamePredictionCounts[game.id] || 0) > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>
                              <span aria-hidden="true">💌</span>{gamePredictionCounts[game.id] || 0} {(gamePredictionCounts[game.id] || 0) === 1 ? 'prediction' : 'predictions'}
                            </span>
                            {(gamePredictionCounts[game.id] || 0) === 0 && isPublished && <span className="text-xs font-medium text-slate-500">Share your game to invite guests</span>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-2">
                        <a href={`/game/${game.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50">Preview game ↗</a>
                        <a href={`/dashboard/${game.id}/predictions`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">View predictions</a>
                        <a href={`/customize-game?gameId=${game.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50">Customize</a>
                        {completed ? <a href={`/dashboard/${game.id}/results`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100">View results 🏆</a> : <a href={`/dashboard/${game.id}/results`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Results</a>}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={() => shareGame(game)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-rose-500/15 hover:bg-rose-600">{shared === game.slug ? '✓ Ready to share' : '↗ Share game'}</button>
                        <a href={`https://wa.me/?text=${encodeURIComponent(`Join ${game.title} and make your baby predictions! 👶💕 ${window.location.origin}/game/${game.slug}`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">WhatsApp</a>
                        <button type="button" onClick={() => copyLink(game.slug)} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">{copied === game.slug ? '✓ Copied' : 'Copy link'}</button>
                      </div>
                      {completed && <button type="button" onClick={() => shareResults(game)} className="mt-3 w-full rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100">{shared === `${game.slug}-results` ? '✓ Results ready to share' : '🏆 Share the results with everyone'}</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {!loading && games.length > 0 && <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-rose-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><p className="text-sm font-bold text-slate-800">Every guess becomes a memory 💗</p><p className="mt-1 text-xs leading-5 text-slate-500">Tip: share your game in the family WhatsApp group to get everyone involved.</p></div><a href="/create-game" className="shrink-0 text-sm font-bold text-rose-600 hover:text-rose-700">Create another game →</a></div>}
      </div>
    </main>
  );
}
