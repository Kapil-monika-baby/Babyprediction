'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';

type Game = {
  id: string;
  slug: string;
  title: string;
  welcome_message: string | null;
  welcome_background_path: string | null;
  status: string;
};

export default function PublicGamePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [game, setGame] = useState<Game | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data } = await supabase
        .from('games')
        .select('id,slug,title,welcome_message,welcome_background_path,status')
        .eq('slug', slug)
        .in('status', ['published', 'completed'])
        .maybeSingle();

      setGame(data);

      if (data?.welcome_background_path) {
        const { data: publicData } = supabase.storage
          .from('game-images')
          .getPublicUrl(data.welcome_background_path);
        setBackgroundUrl(publicData.publicUrl);
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg text-center text-slate-500">Loading game…</div></main>;
  }

  if (!game) {
    return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><div className="text-6xl">🔒</div><h1 className="mt-5 text-2xl font-bold">Game not available</h1><p className="mt-2 text-slate-500">This game is unpublished or the link is incorrect.</p></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          {backgroundUrl && <img src={backgroundUrl} alt="" className="h-56 w-full object-cover sm:h-64" />}
          <div className="p-8 text-center sm:p-12">
            <div className="text-7xl">👶</div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-rose-500">A little prediction party</p>
            <h1 className="mt-3 text-4xl font-bold">{game.title}</h1>
            <p className="mx-auto mt-4 max-w-md text-slate-600">{game.welcome_message || 'Make your predictions, share your wishes, and see how well you know the parents.'}</p>
            {game.status === 'completed'
              ? <a href={`/game/${game.slug}/results`} className="mt-8 inline-block rounded-2xl bg-rose-500 px-7 py-3 font-semibold text-white">See the winners 🏆</a>
              : <a href={`/game/${game.slug}/play`} className="mt-8 inline-block rounded-2xl bg-slate-900 px-7 py-3 font-semibold text-white">Start predicting →</a>}
          </div>
        </div>
      </div>
    </main>
  );
}
