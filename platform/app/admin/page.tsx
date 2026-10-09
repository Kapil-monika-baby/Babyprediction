'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase-browser';

type Profile = { id: string; full_name: string | null; role: string; created_at: string };
type Game = { id: string; owner_id: string; title: string; status: string; slug: string; created_at: string };
type Baby = { id: string; owner_id: string; nickname: string | null };
type Prediction = { id: string; game_id: string; guest_name: string; created_at: string };

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [error, setError] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<'overview' | 'parents' | 'games' | 'predictions'>('overview');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        router.replace('/login?next=/admin');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('id,role').eq('id', user.id).maybeSingle();
      if (!active) return;
      if (profileError) {
        setError('Could not verify your account role. Please refresh and try again.');
        setAccess('denied');
        setLoading(false);
        return;
      }
      if (profile?.role !== 'admin') {
        setAccess('denied');
        setLoading(false);
        return;
      }
      setAccess('allowed');

      const [p, g, b, pr] = await Promise.all([
        supabase.from('profiles').select('id,full_name,role,created_at').order('created_at', { ascending: false }),
        supabase.from('games').select('id,owner_id,title,status,slug,created_at').order('created_at', { ascending: false }),
        supabase.from('babies').select('id,owner_id,nickname'),
        supabase.from('predictions').select('id,game_id,guest_name,created_at').order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      const firstError = p.error || g.error || b.error || pr.error;
      if (firstError) setError('Some admin data could not be loaded. Check the Supabase admin read policies.');
      setProfiles(p.data || []);
      setGames(g.data || []);
      setBabies(b.data || []);
      setPredictions(pr.data || []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  const profileById = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);
  const gameById = useMemo(() => Object.fromEntries(games.map(g => [g.id, g])), [games]);
  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => [p.full_name || '', p.id, p.role].some(v => v.toLowerCase().includes(q)));
  }, [profiles, search]);
  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter(g => [g.title || '', g.slug, g.status, profileById[g.owner_id]?.full_name || '', g.owner_id].some(v => v.toLowerCase().includes(q)));
  }, [games, search, profileById]);
  const filteredPredictions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return predictions;
    return predictions.filter(p => [p.guest_name || '', gameById[p.game_id]?.title || '', profileById[gameById[p.game_id]?.owner_id || '']?.full_name || ''].some(v => v.toLowerCase().includes(q)));
  }, [predictions, search, gameById, profileById]);

  const countsForOwner = (ownerId: string) => games.filter(g => g.owner_id === ownerId).length;
  const countForGame = (gameId: string) => predictions.filter(p => p.game_id === gameId).length;
  const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading || access === 'checking') return <main className="min-h-screen bg-[#fffaf7] p-6 text-slate-700"><div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm">Checking secure admin access…</div></main>;
  if (access === 'denied') return <main className="min-h-screen bg-[#fffaf7] p-6 text-slate-900"><div className="mx-auto mt-16 max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-rose-100"><div className="text-4xl">🔒</div><h1 className="mt-4 text-2xl font-extrabold">Admin access only</h1><p className="mt-2 text-sm leading-6 text-slate-600">This area is restricted to approved Baby Prediction administrators.</p>{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}<Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Back to parent dashboard</Link></div></main>;

  return (
    <main className="min-h-screen bg-[#fff9f7] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><Link href="/" className="text-sm font-bold text-rose-600">← Baby Prediction</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-rose-500">Private control room</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Admin dashboard</h1><p className="mt-2 text-sm text-slate-600">Monitor parent accounts, games and guest participation.</p></div>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">Sign out</button>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{label:'Parent accounts',value:profiles.length,icon:'👨‍👩‍👧'},{label:'Games created',value:games.length,icon:'🎲'},{label:'Published games',value:games.filter(g=>g.status==='published').length,icon:'🌟'},{label:'Guest predictions',value:predictions.length,icon:'💌'}].map(card => <article key={card.label} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{card.label}</span><span className="text-2xl">{card.icon}</span></div><p className="mt-3 text-3xl font-extrabold tabular-nums">{card.value}</p></article>)}
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          {([{id:'overview',label:'Overview'},{id:'parents',label:'Parent accounts'},{id:'games',label:'All games'},{id:'predictions',label:'Predictions'}] as const).map(item => <button key={item.id} onClick={() => { setSection(item.id); setSearch(''); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${section===item.id?'bg-slate-900 text-white':'border border-slate-200 bg-white text-slate-600 hover:bg-rose-50'}`}>{item.label}</button>)}
        </div>

        <section className="mt-4 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-extrabold">{section==='overview'?'Recent activity':section==='parents'?'Parent accounts':section==='games'?'All games':'Guest predictions'}</h2><p className="mt-1 text-sm text-slate-500">Search by parent name, game title, status, guest name or account ID.</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records…" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm sm:max-w-sm" /></div>

          {(section==='overview'||section==='parents') && <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Parent</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Games</th><th className="px-3 py-3">Joined</th><th className="px-3 py-3">Account ID</th></tr></thead><tbody>{(section==='overview'?profiles.slice(0,8):filteredProfiles).map(p=><tr key={p.id} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4 font-bold">{p.full_name||'Unnamed parent'}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.role==='admin'?'bg-violet-50 text-violet-700':'bg-slate-100 text-slate-600'}`}>{p.role}</span></td><td className="px-3 py-4">{countsForOwner(p.id)}</td><td className="px-3 py-4 text-slate-500">{dateLabel(p.created_at)}</td><td className="px-3 py-4 font-mono text-xs text-slate-500">{p.id.slice(0,8)}…</td></tr>)}</tbody></table>{(section==='parents'?filteredProfiles:profiles).length===0&&<p className="py-8 text-center text-sm text-slate-500">No parent accounts match your search.</p>}</div>}

          {(section==='overview'||section==='games') && <div className="mt-2 overflow-x-auto"><h3 className="mb-3 font-extrabold">{section==='overview'?'Latest games':'Game directory'}</h3><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Game</th><th className="px-3 py-3">Parent</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Predictions</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Link</th></tr></thead><tbody>{(section==='overview'?games.slice(0,8):filteredGames).map(g=><tr key={g.id} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4 font-bold">{g.title||'Baby Prediction Game'}</td><td className="px-3 py-4">{profileById[g.owner_id]?.full_name||'Unknown parent'}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${g.status==='published'?'bg-emerald-50 text-emerald-700':g.status==='completed'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{g.status}</span></td><td className="px-3 py-4">{countForGame(g.id)}</td><td className="px-3 py-4 text-slate-500">{dateLabel(g.created_at)}</td><td className="px-3 py-4">{g.slug&&<a href={`/game/${g.slug}`} target="_blank" rel="noreferrer" className="font-bold text-rose-600 hover:underline">Open ↗</a>}</td></tr>)}</tbody></table>{(section==='games'?filteredGames:games).length===0&&<p className="py-8 text-center text-sm text-slate-500">No games match your search.</p>}</div>}

          {section==='predictions' && <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Guest</th><th className="px-3 py-3">Game</th><th className="px-3 py-3">Parent</th><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Game link</th></tr></thead><tbody>{filteredPredictions.map(p=>{const g=gameById[p.game_id];return <tr key={p.id} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4 font-bold">{p.guest_name||'Guest'}</td><td className="px-3 py-4">{g?.title||'Unknown game'}</td><td className="px-3 py-4">{g?profileById[g.owner_id]?.full_name||'Unknown parent':'—'}</td><td className="px-3 py-4 text-slate-500">{dateLabel(p.created_at)}</td><td className="px-3 py-4">{g?.slug&&<a href={`/game/${g.slug}`} target="_blank" rel="noreferrer" className="font-bold text-rose-600 hover:underline">Open ↗</a>}</td></tr>})}</tbody></table>{filteredPredictions.length===0&&<p className="py-8 text-center text-sm text-slate-500">No predictions match your search.</p>}</div>}
        </section>
        <p className="mt-5 text-xs leading-5 text-slate-500">Privacy note: this dashboard shows profile names and account IDs. For login emails and account-level authentication controls, use Supabase → Authentication → Users.</p>
      </div>
    </main>
  );
}
