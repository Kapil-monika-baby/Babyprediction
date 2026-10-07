'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Question = { id: string; type: string; title: string; description: string | null; position: number; enabled: boolean };

const sections = ['Welcome page', 'Baby gender', 'Arrival date', 'Lookalike', 'Name suggestions', 'Tips & wishes'];

export default function CustomizeGamePage() {
  const [requestedGameId, setRequestedGameId] = useState('');
  const [gameId, setGameId] = useState('');
  const [slug, setSlug] = useState('');
  const [headline, setHeadline] = useState('Can you predict our baby?');
  const [message, setMessage] = useState('Join our baby prediction game and see who knows us best!');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequestedGameId(new URLSearchParams(window.location.search).get('gameId') || '');
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let query = supabase.from('games').select('id,slug,title,welcome_message,welcome_background_path').eq('owner_id', user.id);
      const { data } = requestedGameId
        ? await query.eq('id', requestedGameId).maybeSingle()
        : await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return;
      setGameId(data.id);
      setSlug(data.slug || '');
      setHeadline(data.title || 'Can you predict our baby?');
      setMessage(data.welcome_message || 'Join our baby prediction game and see who knows us best!');
      if (data.welcome_background_path) {
        const { data: publicData } = supabase.storage.from('game-images').getPublicUrl(data.welcome_background_path);
        setBackgroundUrl(publicData.publicUrl);
      } else setBackgroundUrl('');
      const { data: questionData } = await supabase.from('game_questions').select('id,type,title,description,position,enabled').eq('game_id', data.id).order('position', { ascending: true });
      setQuestions((questionData || []) as Question[]);
    };
    load();
  }, [requestedGameId]);

  async function uploadBackground(file: File) {
    setUploading(true); setError(''); setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !gameId) { setError('Please create a game and log in first.'); setUploading(false); return; }
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); setUploading(false); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Please keep the image under 5 MB.'); setUploading(false); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${gameId}/welcome-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('game-images').upload(path, file, { contentType: file.type, cacheControl: '3600' });
    if (uploadError) { setError(uploadError.message); setUploading(false); return; }
    const { data: publicData } = supabase.storage.from('game-images').getPublicUrl(path);
    const { error: dbError } = await supabase.from('games').update({ welcome_background_path: path, updated_at: new Date().toISOString() }).eq('id', gameId).eq('owner_id', user.id);
    if (dbError) setError(dbError.message); else { setBackgroundUrl(publicData.publicUrl); setSaved(true); }
    setUploading(false);
  }

  function toggleQuestion(id: string) {
    setQuestions(current => current.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q));
  }

  async function save(publish = false) {
    setSaving(true); setSaved(false); setError('');
    if (!gameId) { setError('No game found. Please create a game first.'); setSaving(false); return; }
    if (!questions.some(q => q.enabled)) { setError('Select at least one prediction question.'); setSaving(false); return; }

    const { error: updateError } = await supabase.from('games').update({
      title: headline,
      welcome_message: message,
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', gameId);

    if (updateError) { setError(updateError.message); setSaving(false); return; }

    const ordered = [...questions].sort((a, b) => a.position - b.position);
    for (let index = 0; index < ordered.length; index++) {
      const q = ordered[index];
      const { error } = await supabase.from('game_questions').update({ enabled: q.enabled, position: index }).eq('id', q.id).eq('game_id', gameId);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setQuestions(ordered.map((q, index) => ({ ...q, position: index })));
    setSaved(!publish);
    setSaving(false);
    if (publish && slug) window.location.href = `/game/${slug}`;
  }

  const enabledCount = questions.filter(q => q.enabled).length;

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-6xl">
    <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a>
    <div className="mt-8"><p className="text-sm font-semibold text-rose-500">Step 2 of 4</p><h1 className="mt-2 text-4xl font-bold">Make it yours</h1><p className="mt-3 text-slate-600">Customize the welcome page and choose exactly what guests can predict.</p></div>
    <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
      <nav className="h-fit rounded-3xl bg-white p-3 ring-1 ring-slate-100">{sections.map((section, index) => <div key={section} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${index === 0 ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{section}</div>)}</nav>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><h2 className="text-xl font-bold">Welcome page</h2><div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Headline<input value={headline} onChange={e => setHeadline(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">Message<textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">Background image<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) uploadBackground(file); }} disabled={uploading} /></label>
            <p className="text-xs text-slate-500">JPG, PNG or WebP · maximum 5 MB</p>{uploading && <p className="text-sm text-slate-500">Uploading image…</p>}
          </div></div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Prediction questions</h2><p className="mt-1 text-sm text-slate-500">Turn questions on or off before publishing.</p></div><span className="text-sm font-semibold text-slate-500">{enabledCount} selected</span></div>
            <div className="mt-5 space-y-3">{questions.map(q => <label key={q.id} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={q.enabled} onChange={() => toggleQuestion(q.id)} className="h-5 w-5" /><span className="flex-1"><span className="block font-semibold">{q.title}</span>{q.description && <span className="mt-1 block text-sm text-slate-500">{q.description}</span>}</span></label>)}</div>
          </div>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {saved && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">Draft saved.</p>}
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm font-semibold text-rose-500">Live preview</p>
          <div className="relative mt-4 min-h-[520px] overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-white to-sky-100 p-8 text-center flex flex-col items-center justify-center" style={backgroundUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,.68),rgba(255,255,255,.68)),url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            <div className="text-6xl">🍼</div><h3 className="mt-6 text-3xl font-bold">{headline}</h3><p className="mt-3 max-w-xs text-slate-700">{message}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">{questions.filter(q => q.enabled).map(q => <span key={q.id} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">{q.title}</span>)}</div>
            <button type="button" className="mt-8 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">Start predicting</button>
          </div>
        </div>
      </section>
    </div>
    <div className="mt-8 rounded-3xl bg-white p-4 ring-1 ring-slate-100 sm:p-5"><p className="text-sm font-semibold">Ready to publish?</p><p className="mt-1 text-sm text-slate-500">Use Preview to check the guest experience, or Publish game to make this link live immediately.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => save(false)} disabled={saving || uploading} className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold">{saving ? 'Saving…' : 'Save draft'}</button><a href={`/preview-game${gameId ? `?gameId=${gameId}` : ''}`} className="rounded-2xl border border-slate-200 px-6 py-3 text-center font-semibold">Preview</a><button type="button" onClick={() => save(true)} disabled={saving || uploading || !slug} className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">{saving ? 'Publishing…' : 'Publish game →'}</button></div></div>
  </div></main>;
}
