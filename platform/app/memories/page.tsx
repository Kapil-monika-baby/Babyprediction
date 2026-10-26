'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase-browser';

type Timeline = { id: string; title: string; created_at: string; baby_id: string | null };
type Baby = { id: string; nickname: string | null; parent_one_name: string | null; parent_two_name: string | null };

export default function MemoriesPage() {
  const router = useRouter();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [title, setTitle] = useState('Family Memories');
  const [babyId, setBabyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) { window.location.replace('/login?next=%2Fmemories'); return; }
      setUserEmail(user.email ?? '');
      const [timelineResult, babyResult] = await Promise.all([
        supabase.from('memory_timelines').select('id,title,created_at,baby_id').order('created_at', { ascending: false }),
        supabase.from('babies').select('id,nickname,parent_one_name,parent_two_name').eq('owner_id', user.id).order('created_at', { ascending: false })
      ]);
      if (!active) return;
      if (timelineResult.error) setError('Memories is not ready yet. The private Memories database migration must be applied before you can create a timeline.');
      else setTimelines(timelineResult.data ?? []);
      if (!babyResult.error) setBabies(babyResult.data ?? []);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function createTimeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace('/login?next=%2Fmemories'); return; }
    const payload: { owner_id: string; title: string; baby_id?: string | null } = { owner_id: user.id, title: title.trim() || 'Family Memories' };
    if (babyId) payload.baby_id = babyId;
    const { data, error: insertError } = await supabase.from('memory_timelines').insert(payload).select('id').single();
    setSaving(false);
    if (insertError) { setError(insertError.message.includes('duplicate') ? 'A timeline already exists for this child.' : insertError.message); return; }
    router.push('/memories/' + data.id);
  }

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Parent dashboard</Link>
      <header className="mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-rose-700">GoodNews Baby · Family space</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Memories that grow with them.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">Keep the little moments, milestones and stories together in one private family timeline. Your memories are private by default.</p>
        {userEmail && <p className="mt-5 text-sm text-slate-600">Signed in as {userEmail}</p>}
      </header>
      {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{error}</div>}
      <section className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <form onSubmit={createTimeline} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100 sm:p-7">
          <div className="text-2xl">📖</div><h2 className="mt-3 text-xl font-extrabold">Start a timeline</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Create a space for photos, stories and special firsts. Only you can manage its privacy and family access.</p>
          <label htmlFor="timeline-title" className="mt-5 block text-sm font-bold">Timeline name</label>
          <input id="timeline-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
          {babies.length > 0 && <><label htmlFor="timeline-baby" className="mt-4 block text-sm font-bold">For a child (optional)</label><select id="timeline-baby" value={babyId} onChange={e => setBabyId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">No child linked yet</option>{babies.map(b => <option key={b.id} value={b.id}>{b.nickname || [b.parent_one_name, b.parent_two_name].filter(Boolean).join(' & ') || 'My child'}</option>)}</select></>}
          <button disabled={saving || loading} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-slate-700 disabled:opacity-50">{saving ? 'Creating…' : 'Create private timeline'}</button>
          <p className="mt-3 text-xs leading-5 text-slate-500">Family invitations are created from an individual timeline. Invitees must verify their email and sign in with the invited address before joining.</p>
        </form>
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100 sm:p-7">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Your timelines</h2><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">{timelines.length}</span></div>
          {loading ? <p className="mt-6 text-sm text-slate-500">Loading your private timelines…</p> : timelines.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-6 text-center"><div className="text-3xl">🌱</div><p className="mt-3 font-bold">Your story starts here</p><p className="mt-2 text-sm leading-6 text-slate-600">Create your first timeline to begin collecting the moments you want to remember.</p></div> : <ul className="mt-5 space-y-3">{timelines.map(t => <li key={t.id}><Link href={'/memories/' + t.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-rose-200 hover:bg-rose-50/50"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl">📚</span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{t.title}</span><span className="mt-1 block text-xs text-slate-500">Created {new Date(t.created_at).toLocaleDateString()}</span></span><span aria-hidden="true" className="text-xl text-slate-400">›</span></Link></li>)}</ul>}
        </section>
      </section>
      <p className="mt-8 text-center text-xs leading-5 text-slate-500">Private by default. No public child profiles. You control what you keep and share.</p>
    </div>
  </main>;
}
