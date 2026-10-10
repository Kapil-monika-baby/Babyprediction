'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';

type Profile = { id: string; full_name: string | null; role: string; created_at: string };
type Game = { id: string; owner_id: string; title: string; status: string; slug: string; created_at: string };
type Prediction = { id: string; game_id: string; guest_name: string; created_at: string };

export default function AdminParentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parentId = params.id;
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');
  const [parent, setParent] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) { router.replace('/login?next=/admin'); return; }
      const { data: me, error: meError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!active) return;
      if (meError || me?.role !== 'admin') { setError('Admin access is required to view parent account details.'); setLoading(false); return; }
      setAllowed(true);
      const [p, g] = await Promise.all([
        supabase.from('profiles').select('id,full_name,role,created_at').eq('id', parentId).maybeSingle(),
        supabase.from('games').select('id,owner_id,title,status,slug,created_at').eq('owner_id', parentId).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (p.error || g.error) setError('Some account details could not be loaded. Check the admin read policies.');
      setParent(p.data || null);
      setGames(g.data || []);
      const gameIds = (g.data || []).map(game => game.id);
      if (gameIds.length) {
        const { data: preds, error: predError } = await supabase.from('predictions').select('id,game_id,guest_name,created_at').in('game_id', gameIds).order('created_at', { ascending: false });
        if (!active) return;
        if (predError) setError('The games loaded, but guest predictions could not be loaded.');
        setPredictions(preds || []);
      } else {
        setPredictions([]);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [parentId, router]);

  const gameById = useMemo(() => Object.fromEntries(games.map(g => [g.id, g])), [games]);
  const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <main className="min-h-screen bg-[#fff9f7] p-6 text-slate-700">Loading parent account…</main>;
  if (!allowed) return <main className="min-h-screen bg-[#fff9f7] p-6 text-slate-900"><div className="mx-auto mt-12 max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-extrabold">Admin access only</h1><p className="mt-3 text-sm text-slate-600">{error || 'This page is restricted.'}</p><Link href="/admin" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Back to admin</Link></div></main>;

  return <main className="min-h-screen bg-[#fff9f7] text-slate-900"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <Link href="/admin" className="text-sm font-bold text-rose-600">← Back to admin dashboard</Link>
    <header className="mt-5 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-rose-500">Parent account</p>
      <h1 className="mt-2 text-3xl font-extrabold">{parent?.full_name || 'Unnamed parent'}</h1>
      <p className="mt-2 break-all font-mono text-xs text-slate-500">Account ID: {parent?.id || parentId}</p>
      {parent && <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold">{parent.role}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm">Joined {dateLabel(parent.created_at)}</span></div>}
    </header>
    {error && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
    <section className="mt-5 grid gap-3 sm:grid-cols-3">
      {[{label:'Games created',value:games.length},{label:'Guest predictions',value:predictions.length},{label:'Published games',value:games.filter(g=>g.status==='published').length}].map(item=><article key={item.label} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-extrabold">{item.value}</p></article>)}
    </section>
    <section className="mt-5 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-extrabold">Games</h2>
      {games.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase text-slate-400"><th className="px-3 py-3">Game</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Predictions</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Link</th></tr></thead><tbody>{games.map(g=><tr key={g.id} className="border-b border-slate-50"><td className="px-3 py-4 font-bold">{g.title || 'Baby Prediction Game'}</td><td className="px-3 py-4">{g.status}</td><td className="px-3 py-4">{predictions.filter(p=>p.game_id===g.id).length}</td><td className="px-3 py-4 text-slate-500">{dateLabel(g.created_at)}</td><td className="px-3 py-4">{g.slug && <a href={`/game/${g.slug}`} target="_blank" rel="noreferrer" className="font-bold text-rose-600">Open ↗</a>}</td></tr>)}</tbody></table></div> : <p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">This parent hasn't created a game yet.</p>}
    </section>
    <section className="mt-5 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-extrabold">Guest predictions</h2>
      {predictions.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase text-slate-400"><th className="px-3 py-3">Guest</th><th className="px-3 py-3">Game</th><th className="px-3 py-3">Submitted</th></tr></thead><tbody>{predictions.map(p=><tr key={p.id} className="border-b border-slate-50"><td className="px-3 py-4 font-bold">{p.guest_name || 'Guest'}</td><td className="px-3 py-4">{gameById[p.game_id]?.title || 'Unknown game'}</td><td className="px-3 py-4 text-slate-500">{dateLabel(p.created_at)}</td></tr>)}</tbody></table></div> : <p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No guest predictions for this parent's games yet.</p>}
    </section>
  </div></main>;
}
