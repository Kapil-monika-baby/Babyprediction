'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';

type Game = { id: string; slug: string; title: string; welcome_message: string | null; welcome_background_path: string | null; status: string; customization: Record<string, any> | null };

export default function PublicGamePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data } = await supabase.from('games').select('id,slug,title,welcome_message,welcome_background_path,status,customization').eq('slug', slug).in('status', ['published', 'completed']).maybeSingle();
      setGame(data as Game | null);
      if (data?.welcome_background_path) {
        const { data: publicData } = supabase.storage.from('game-images').getPublicUrl(data.welcome_background_path);
        setBackgroundUrl(publicData.publicUrl);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  async function shareGame() {
    if (!game) return;
    const url = window.location.href;
    const text = `Join ${game.title} and make your baby predictions! 👶💕`;
    if (navigator.share) { try { await navigator.share({ title: game.title, text, url }); setShared(true); window.setTimeout(() => setShared(false), 1800); } catch {} return; }
    await navigator.clipboard.writeText(`${text} ${url}`); setShared(true); window.setTimeout(() => setShared(false), 1800);
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg text-center text-slate-500">Loading game…</div></main>;
  if (!game) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><div className="text-6xl">🔒</div><h1 className="mt-5 text-2xl font-bold">Game not available</h1><p className="mt-2 text-slate-500">This game is unpublished or the link is incorrect.</p></div></main>;

  const c = game.customization || {};
  const themes: Record<string, { bg: string; accent: string }> = { blush: { bg: '#fff1f2', accent: '#e11d48' }, sky: { bg: '#eff6ff', accent: '#2563eb' }, lavender: { bg: '#f5f3ff', accent: '#7c3aed' }, mint: { bg: '#ecfdf5', accent: '#059669' }, sunshine: { bg: '#fffbeb', accent: '#d97706' }, custom: { bg: '#fffaf7', accent: c.accent || '#e11d48' } };
  const theme = themes[c.theme] || themes.blush;
  const accent = c.theme === 'custom' ? (c.accent || theme.accent) : theme.accent;
  const bg = c.theme === 'custom' ? (c.background || theme.bg) : theme.bg;
  const radius = c.cardStyle === 'clean' ? '1.25rem' : '2rem';

  return <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 sm:py-10" style={{ background: bg }}>
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden bg-white shadow-sm ring-1 ring-slate-100" style={{ borderRadius: radius }}>
        {backgroundUrl && <img src={backgroundUrl} alt="" className="h-56 w-full object-cover sm:h-64" />}
        <div className="relative overflow-hidden p-5 text-center sm:p-12" style={{ background: backgroundUrl ? undefined : bg }}>
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 10% 10%, ${accent} 0, transparent 25%), radial-gradient(circle at 90% 90%, ${accent} 0, transparent 25%)` }} />
          <div className="relative">
            <div className="text-7xl">{c.emoji || '👶'}</div>
            {c.showBadge !== false && <p className="mt-6 text-sm font-semibold uppercase tracking-widest" style={{ color: accent }}>A little prediction party</p>}
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{game.title}</h1>
            <p className="mx-auto mt-4 max-w-md text-slate-600">{game.welcome_message || 'Make your predictions, share your wishes, and see how well you know the parents.'}</p>
            {c.showQuestionChips !== false && <p className="mt-5 text-xs font-semibold text-slate-400">Make your guesses • Have fun • Share the love 💕</p>}
            {game.status === 'completed'
              ? <a href={`/game/${game.slug}/results`} className="mt-8 inline-block rounded-2xl px-7 py-3 font-semibold text-white" style={{ background: accent }}>See the winners 🏆</a>
              : <a href={`/game/${game.slug}/play`} className="mt-8 inline-block rounded-2xl px-7 py-3 font-semibold text-white" style={{ background: accent }}>{c.buttonText || 'Start predicting →'}</a>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={shareGame} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold">{shared ? 'Shared!' : 'Share game'}</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Join ${game.title} and make your baby predictions! 👶💕 ${window.location.href}`)}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-700">Share on WhatsApp</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>;
}
