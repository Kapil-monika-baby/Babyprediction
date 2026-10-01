'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

const sections = ['Welcome page', 'Baby gender', 'Arrival date', 'Lookalike', 'Name suggestions', 'Tips & wishes'];

export default function CustomizeGamePage() {
  const [gameId, setGameId] = useState('');
  const [headline, setHeadline] = useState('Can you predict our baby?');
  const [message, setMessage] = useState('Join our baby prediction game and see who knows us best!');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('games').select('id,title,welcome_message').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      if (data) { setGameId(data.id); setHeadline(data.title || headline); setMessage(data.welcome_message || message); }
    };
    load();
  }, []);

  async function save(publish = false) {
    setSaving(true); setSaved(false); setError('');
    if (!gameId) { setError('No game found. Please create a game first.'); setSaving(false); return; }
    const { error: updateError } = await supabase.from('games').update({ title: headline, welcome_message: message, status: publish ? 'published' : 'draft', published_at: publish ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', gameId);
    if (updateError) setError(updateError.message); else setSaved(true);
    setSaving(false);
  }

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-6xl"><a href="/create-game" className="text-sm font-semibold text-slate-500">← Game setup</a><div className="mt-8"><p className="text-sm font-semibold text-rose-500">Step 2 of 4</p><h1 className="mt-2 text-4xl font-bold">Make it yours</h1><p className="mt-3 text-slate-600">Customize the words and save your game. More page-level customization will follow.</p></div><div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]"><nav className="rounded-3xl bg-white p-3 ring-1 ring-slate-100">{sections.map((section, index) => <button type="button" key={section} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${index === 0 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{section}</button>)}</nav><section className="grid gap-8 lg:grid-cols-2"><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><h2 className="text-xl font-bold">Welcome page</h2><div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Headline<input value={headline} onChange={e => setHeadline(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="block text-sm font-semibold">Message<textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label><p className="text-xs text-slate-500">Background image storage will be connected next.</p>{error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{saved && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">Game saved successfully.</p>}</div></div><div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm font-semibold text-rose-500">Preview</p><div className="mt-4 min-h-[420px] rounded-3xl bg-gradient-to-br from-rose-100 via-white to-sky-100 p-8 text-center flex flex-col items-center justify-center"><div className="text-6xl">🍼</div><h3 className="mt-6 text-3xl font-bold">{headline}</h3><p className="mt-3 max-w-xs text-slate-600">{message}</p><button type="button" className="mt-8 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">Start predicting</button></div></div></section></div><div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => save(false)} disabled={saving} className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold">{saving ? 'Saving…' : 'Save draft'}</button><a href="/preview-game" className="rounded-2xl border border-slate-200 px-6 py-3 text-center font-semibold">Preview</a><button type="button" onClick={() => save(true)} disabled={saving} className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">{saving ? 'Publishing…' : 'Publish game →'}</button></div></div></main>;
}
