'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Question = { id: string; title: string; enabled: boolean };
type Game = { id: string; slug: string; title: string; welcome_message: string | null; welcome_background_path: string | null; status: string };

export default function PreviewGamePage() {
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMessage('Your session has expired. Please log in again.'); setLoading(false); return; }
      const requestedId = new URLSearchParams(window.location.search).get('gameId');

      let query = supabase.from('games').select('id,slug,title,welcome_message,welcome_background_path,status').eq('owner_id', user.id);
      const { data, error } = requestedId
        ? await query.eq('id', requestedId).maybeSingle()
        : await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (error || !data) { setMessage(error?.message || 'No game found.'); setLoading(false); return; }
      setGame(data as Game);

      if (data.welcome_background_path) {
        const { data: publicData } = supabase.storage.from('game-images').getPublicUrl(data.welcome_background_path);
        setBackgroundUrl(publicData.publicUrl);
      }

      const { data: questionData } = await supabase
        .from('game_questions')
        .select('id,title,enabled')
        .eq('game_id', data.id)
        .order('position', { ascending: true });
      setQuestions((questionData || []) as Question[]);
      setLoading(false);
    }
    load();
  }, []);

  async function publishGame() {
    setPublishing(true); setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !game) { setMessage('Please log in and create a game first.'); setPublishing(false); return; }
    if (!questions.some(q => q.enabled)) { setMessage('Select at least one prediction question first.'); setPublishing(false); return; }

    const { error } = await supabase.from('games').update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', game.id).eq('owner_id', user.id);
    if (error) { setMessage(error.message); setPublishing(false); return; }
    setPublished(true);
    setPublishing(false);
  }

  async function shareGame() {
    if (!game) return;
    const url = `${window.location.origin}/game/${game.slug}`;
    const text = `Join ${game.title} and make your baby predictions! 👶💕`;
    if (navigator.share) {
      try { await navigator.share({ title: game.title, text, url }); setShared(true); window.setTimeout(() => setShared(false), 1800); } catch {}
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setShared(true); window.setTimeout(() => setShared(false), 1800);
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-center text-slate-500">Loading preview…</main>;

  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <a href={`/customize-game${game ? `?gameId=${game.id}` : ''}`} className="text-sm font-semibold text-slate-500">← Customize</a>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold text-rose-500">Step 3 of 4</p><h1 className="mt-2 text-4xl font-bold">Preview your game</h1><p className="mt-3 text-slate-600">This is how guests will experience your game.</p></div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">{published || game?.status === 'published' ? 'Published' : 'Draft'}</span>
        </div>

        {game && <div className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="min-h-[520px] bg-gradient-to-br from-rose-100 via-white to-sky-100 p-8 flex flex-col items-center justify-center text-center" style={backgroundUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,.68),rgba(255,255,255,.68)),url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            <div className="text-7xl">👶</div><p className="mt-6 text-sm font-semibold uppercase tracking-widest text-rose-500">A little prediction party</p><h2 className="mt-3 text-4xl font-bold">{game.title}</h2><p className="mt-4 max-w-lg text-slate-600">{game.welcome_message || 'Make your predictions and send some love!'}</p>
            <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">{questions.filter(q => q.enabled).map(q => <span key={q.id} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">{q.title}</span>)}</div>
            <button type="button" className="mt-8 rounded-2xl bg-slate-900 px-7 py-3 font-semibold text-white">Start predicting</button>
          </div>
          <div className="border-t border-slate-100 p-6"><p className="text-sm font-semibold">Game pages</p><div className="mt-4 flex flex-wrap gap-2">{['Welcome', ...questions.filter(q => q.enabled).map(q => q.title), 'Results'].map((page, index) => <span key={page + index} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium">{index + 1}. {page}</span>)}</div></div>
        </div>}

        {message && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
        <div className="mt-8 rounded-3xl bg-white p-4 ring-1 ring-slate-100 sm:p-5"><p className="text-sm font-semibold">{published ? '🎉 Game published!' : 'Ready to publish?'}</p><p className="mt-1 text-sm text-slate-500">{published ? 'Your game is live. Share the link with family and friends, then return to your dashboard to manage predictions.' : 'Review everything above before publishing your game.'}</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end"><a href={`/customize-game${game ? `?gameId=${game.id}` : ''}`} className="rounded-2xl border border-slate-200 px-6 py-3 text-center font-semibold">Edit</a>{published ? <><button type="button" onClick={shareGame} className="rounded-2xl bg-rose-500 px-6 py-3 font-semibold text-white">{shared ? 'Shared!' : 'Share game'}</button><a href={`https://wa.me/?text=${encodeURIComponent(`Join ${game?.title} and make your baby predictions! 👶💕 ${window.location.origin}/game/${game?.slug}`)}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-emerald-200 px-6 py-3 text-center font-semibold text-emerald-700">WhatsApp</a><a href="/dashboard" className="rounded-2xl bg-slate-900 px-6 py-3 text-center font-semibold text-white">Parent Dashboard →</a></> : <button type="button" onClick={publishGame} disabled={publishing || !game} className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50">{publishing ? 'Publishing…' : 'Publish game →'}</button>}</div></div>
      </div>
    </main>
  );
}
