'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

type Question = { id: string; type: string; title: string; description: string | null; position: number; enabled: boolean; options?: string[] };
type Customization = { theme?: string; accent?: string; background?: string; emoji?: string; buttonText?: string; cardStyle?: string; showBadge?: boolean; showQuestionChips?: boolean };

const sections = ['Welcome page', 'Look & feel', 'Questions', 'Guest experience'];
const themes = [
  { id: 'blush', name: 'Blush', bg: '#fff1f2', accent: '#e11d48' },
  { id: 'sky', name: 'Baby blue', bg: '#eff6ff', accent: '#2563eb' },
  { id: 'lavender', name: 'Lavender', bg: '#f5f3ff', accent: '#7c3aed' },
  { id: 'mint', name: 'Mint', bg: '#ecfdf5', accent: '#059669' },
  { id: 'sunshine', name: 'Sunshine', bg: '#fffbeb', accent: '#d97706' },
  { id: 'custom', name: 'Custom', bg: '#fffaf7', accent: '#e11d48' },
];

const emojis = ['👶', '🍼', '🧸', '💗', '🌈', '⭐', '🦋', '🎀'];
const accents = ['#e11d48', '#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777'];

export default function CustomizeGamePage() {
  const [requestedGameId, setRequestedGameId] = useState('');
  const [gameId, setGameId] = useState('');
  const [headline, setHeadline] = useState('Can you predict our baby?');
  const [message, setMessage] = useState('Join our baby prediction game and see who knows us best!');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [custom, setCustom] = useState<Customization>({ theme: 'blush', accent: '#e11d48', emoji: '👶', buttonText: 'Start predicting →', cardStyle: 'soft', showBadge: true, showQuestionChips: true });
  const [customBg, setCustomBg] = useState('#fffaf7');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const theme = useMemo(() => themes.find(t => t.id === custom.theme) || themes[0], [custom.theme]);
  const accent = custom.theme === 'custom' ? (custom.accent || '#e11d48') : theme.accent;
  const previewBg = custom.theme === 'custom' ? customBg : theme.bg;

  useEffect(() => setRequestedGameId(new URLSearchParams(window.location.search).get('gameId') || ''), []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const query = supabase.from('games').select('id,slug,title,welcome_message,welcome_background_path,customization').eq('owner_id', user.id);
      const { data } = requestedGameId ? await query.eq('id', requestedGameId).maybeSingle() : await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return;
      setGameId(data.id);
      setHeadline(data.title || 'Can you predict our baby?');
      setMessage(data.welcome_message || 'Join our baby prediction game and see who knows us best!');
      setCustom({ ...custom, ...((data.customization || {}) as Customization) });
      if ((data.customization as Customization | null)?.background) setCustomBg((data.customization as Customization).background!);
      if (data.welcome_background_path) {
        const { data: publicData } = supabase.storage.from('game-images').getPublicUrl(data.welcome_background_path);
        setBackgroundUrl(publicData.publicUrl);
      }
      const { data: questionData } = await supabase.from('game_questions').select('id,type,title,description,position,enabled,options').eq('game_id', data.id).order('position', { ascending: true });
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
    const path = user.id + '/' + gameId + '/welcome-' + Date.now() + '.' + ext;
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

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions(current => current.map(q => q.id === id ? { ...q, ...patch } : q));
    setSaved(false);
  }

  function addQuestion() {
    const id = 'new-' + Date.now();
    setQuestions(current => [...current, {
      id,
      type: 'choice',
      title: 'New prediction question',
      description: 'What do you think?',
      position: current.length,
      enabled: true,
      options: ['Option 1', 'Option 2']
    }]);
    setSaved(false);
  }

  function removeQuestion(id: string) {
    setQuestions(current => current.filter(q => q.id !== id));
    setSaved(false);
  }

  function addOption(id: string) {
    setQuestions(current => current.map(q => q.id === id ? { ...q, options: [...(q.options || []), 'New option'] } : q));
    setSaved(false);
  }

  function updateOption(id: string, index: number, value: string) {
    setQuestions(current => current.map(q => q.id === id ? { ...q, options: (q.options || []).map((o, i) => i === index ? value : o) } : q));
    setSaved(false);
  }

  function removeOption(id: string, index: number) {
    setQuestions(current => current.map(q => q.id === id ? { ...q, options: (q.options || []).filter((_, i) => i !== index) } : q));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setSaved(false); setError('');
    if (!gameId) { setError('No game found. Please create a game first.'); setSaving(false); return; }
    if (!questions.some(q => q.enabled)) { setError('Select at least one prediction question.'); setSaving(false); return; }
    const invalid = questions.find(q => !q.title.trim() || (q.type === 'choice' && (q.options || []).filter(Boolean).length < 2));
    if (invalid) { setError('Every question needs a title, and choice questions need at least 2 options.'); setSaving(false); return; }
    const { error: updateError } = await supabase.from('games').update({
      title: headline, welcome_message: message, customization: { ...custom, background: custom.theme === 'custom' ? customBg : undefined, accent: custom.theme === 'custom' ? accent : theme.accent }, status: 'draft', updated_at: new Date().toISOString(),
    }).eq('id', gameId).eq('owner_id', (await supabase.auth.getUser()).data.user?.id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }
    const ordered = [...questions].sort((a, b) => a.position - b.position);
    const existingIds = new Set(ordered.filter(q => !q.id.startsWith('new-')).map(q => q.id));
    const { data: dbQuestions } = await supabase.from('game_questions').select('id').eq('game_id', gameId);
    for (const row of dbQuestions || []) {
      if (!existingIds.has(row.id)) {
        const { error } = await supabase.from('game_questions').delete().eq('id', row.id).eq('game_id', gameId);
        if (error) { setError(error.message); setSaving(false); return; }
      }
    }
    for (let index = 0; index < ordered.length; index++) {
      const q = ordered[index];
      const payload = {
        type: q.type,
        title: q.title.trim(),
        description: q.description?.trim() || null,
        enabled: q.enabled,
        position: index,
        options: q.type === 'choice' ? (q.options || []).map(o => o.trim()).filter(Boolean) : []
      };
      const result = q.id.startsWith('new-')
        ? await supabase.from('game_questions').insert({ game_id: gameId, ...payload })
        : await supabase.from('game_questions').update(payload).eq('id', q.id).eq('game_id', gameId);
      if (result.error) { setError(result.error.message); setSaving(false); return; }
    }
    const { data: refreshed } = await supabase.from('game_questions').select('id,type,title,description,position,enabled,options').eq('game_id', gameId).order('position', { ascending: true });
    setQuestions((refreshed || []) as Question[]);
    setSaved(true); setSaving(false);
  }

  const update = (patch: Customization) => { setCustom(current => ({ ...current, ...patch })); setSaved(false); };

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-slate-900 sm:px-6 sm:py-10"><div className="mx-auto max-w-6xl">
    <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a>
    <div className="mt-7"><p className="text-sm font-semibold text-rose-500">Step 2 of 4</p><h1 className="mt-2 text-4xl font-bold">Make it yours ✨</h1><p className="mt-3 max-w-2xl text-slate-600">Turn your prediction game into a celebration. Pick a theme, add your personality, choose what guests see, and preview it live.</p></div>

    <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
      <nav className="h-fit rounded-3xl bg-white p-3 ring-1 ring-slate-100 lg:sticky lg:top-5">
        {sections.map((section, index) => <div key={section} className={`mb-1 rounded-2xl px-4 py-3 text-sm font-semibold ${index === 0 ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{index + 1}. {section}</div>)}
        <div className="mt-4 rounded-2xl bg-rose-50 p-4"><p className="text-sm font-bold text-rose-700">✨ Make it memorable</p><p className="mt-1 text-xs leading-5 text-rose-600">Your choices are saved with the game and shown to every guest.</p></div>
      </nav>

      <section className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><h2 className="text-xl font-bold">👋 Welcome page</h2><p className="mt-1 text-sm text-slate-500">Give guests the first impression.</p><div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Headline<input value={headline} onChange={e => { setHeadline(e.target.value); setSaved(false); }} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">Welcome message<textarea value={message} onChange={e => { setMessage(e.target.value); setSaved(false); }} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">Cover / background image<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) uploadBackground(file); }} disabled={uploading} /></label>
            <p className="text-xs text-slate-500">JPG, PNG or WebP · maximum 5 MB</p>{uploading && <p className="text-sm text-slate-500">Uploading image…</p>}
          </div></div>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><h2 className="text-xl font-bold">🎨 Look & feel</h2><p className="mt-1 text-sm text-slate-500">Choose the mood for your prediction party.</p>
            <p className="mt-5 text-sm font-semibold">Theme</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{themes.map(t => <button type="button" key={t.id} onClick={() => update({ theme: t.id, accent: t.accent })} className={`rounded-2xl border p-3 text-left ${custom.theme === t.id ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'}`}><span className="mb-2 block h-8 rounded-xl" style={{ background: t.bg }}></span><span className="text-sm font-semibold">{t.name}</span></button>)}</div>
            {custom.theme === 'custom' && <div className="mt-4"><p className="text-sm font-semibold">Your colors</p><div className="mt-2 flex gap-3"><input aria-label="Background color" type="color" value={customBg} onChange={e => setCustomBg(e.target.value)} className="h-10 w-14 cursor-pointer rounded-xl border-0" /><input aria-label="Accent color" type="color" value={custom.accent || '#e11d48'} onChange={e => update({ accent: e.target.value })} className="h-10 w-14 cursor-pointer rounded-xl border-0" /></div></div>}
            <p className="mt-5 text-sm font-semibold">Main icon</p><div className="mt-2 flex flex-wrap gap-2">{emojis.map(e => <button type="button" key={e} onClick={() => update({ emoji: e })} className={`h-11 w-11 rounded-2xl border text-xl ${custom.emoji === e ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>{e}</button>)}</div>
            <p className="mt-5 text-sm font-semibold">Card style</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => update({ cardStyle: 'soft' })} className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${custom.cardStyle === 'soft' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}>Soft & rounded</button><button type="button" onClick={() => update({ cardStyle: 'clean' })} className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${custom.cardStyle === 'clean' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}>Clean</button></div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">❓ Questions</h2><p className="mt-1 text-sm text-slate-500">Choose, edit or add predictions for your guests.</p></div><button type="button" onClick={addQuestion} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">+ Add question</button></div><div className="mt-5 space-y-4">{questions.map(q => <div key={q.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex gap-3"><input type="checkbox" checked={q.enabled} onChange={() => toggleQuestion(q.id)} className="mt-3 h-5 w-5" /><div className="min-w-0 flex-1 space-y-3"><input value={q.title} onChange={e => updateQuestion(q.id, { title: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold" placeholder="Question title" /><input value={q.description || ''} onChange={e => updateQuestion(q.id, { description: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Short description (optional)" /><select value={q.type} onChange={e => updateQuestion(q.id, { type: e.target.value, options: e.target.value === 'choice' ? ((q.options && q.options.length >= 2) ? q.options : ['Option 1', 'Option 2']) : [] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="choice">Multiple choice</option><option value="text">Text answer</option><option value="date">Date</option></select>{q.type === 'choice' && <div className="space-y-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Options</p>{(q.options || []).map((option, index) => <div key={index} className="flex gap-2"><input value={option} onChange={e => updateOption(q.id, index, e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder={`Option ${index + 1}`} /><button type="button" onClick={() => removeOption(q.id, index)} className="rounded-xl border border-slate-200 px-3 text-slate-500" aria-label="Remove option">×</button></div>)}<button type="button" onClick={() => addOption(q.id)} className="text-sm font-semibold text-rose-600">+ Add option</button></div>}<button type="button" onClick={() => removeQuestion(q.id)} className="text-sm font-semibold text-red-500">Remove question</button></div></div></div>)}</div><p className="mt-4 text-xs font-semibold text-slate-500">{questions.filter(q => q.enabled).length} questions selected · Add your own questions and choices.</p></div>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><h2 className="text-xl font-bold">✨ Guest experience</h2><p className="mt-1 text-sm text-slate-500">Small touches that make the game feel yours.</p>
            <label className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 p-4"><span><span className="block font-semibold">Show “A little prediction party”</span><span className="text-xs text-slate-500">Adds a playful label above your headline.</span></span><input type="checkbox" checked={custom.showBadge !== false} onChange={e => update({ showBadge: e.target.checked })} className="h-5 w-5" /></label>
            <label className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 p-4"><span><span className="block font-semibold">Show question chips</span><span className="text-xs text-slate-500">Lets guests see what they can predict.</span></span><input type="checkbox" checked={custom.showQuestionChips !== false} onChange={e => update({ showQuestionChips: e.target.checked })} className="h-5 w-5" /></label>
            <label className="mt-4 block text-sm font-semibold">Start button text<select value={custom.buttonText || 'Start predicting →'} onChange={e => update({ buttonText: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"><option>Start predicting →</option><option>Make my predictions 💕</option><option>Let’s play! 🎉</option><option>Guess the baby 👶</option><option>Join the prediction party ✨</option></select></label>
          </div>
        </div>

        {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {saved && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">✨ Draft saved. Your customization is ready for preview.</p>}

        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-rose-500">LIVE PREVIEW</p><h2 className="mt-1 text-xl font-bold">See the guest experience</h2></div><span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: previewBg, color: accent }}>Interactive preview</span></div>
          <div className={`relative mt-5 min-h-[560px] overflow-hidden p-8 text-center flex flex-col items-center justify-center ${custom.cardStyle === 'clean' ? 'rounded-2xl' : 'rounded-[2.5rem]'}`} style={{ backgroundColor: previewBg, backgroundImage: backgroundUrl ? `linear-gradient(rgba(255,255,255,.66),rgba(255,255,255,.66)),url(${backgroundUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 15% 20%, ${accent} 0, transparent 24%), radial-gradient(circle at 85% 80%, ${accent} 0, transparent 22%)` }} />
            <div className="relative z-10"><div className="text-7xl">{custom.emoji || '👶'}</div>{custom.showBadge !== false && <p className="mt-6 text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>A little prediction party</p>}<h3 className="mt-3 text-4xl font-bold">{headline || 'Your headline'}</h3><p className="mx-auto mt-4 max-w-lg text-slate-700">{message || 'Your welcome message'}</p>{custom.showQuestionChips !== false && <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">{questions.filter(q => q.enabled).map(q => <span key={q.id} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold shadow-sm">{q.title}</span>)}</div>}<button type="button" className="mt-8 rounded-2xl px-7 py-3 font-semibold text-white shadow-sm" style={{ backgroundColor: accent }}>{custom.buttonText || 'Start predicting →'}</button></div>
          </div>
        </div>
      </section>
    </div>

    <div className="mt-8 rounded-3xl bg-white p-4 ring-1 ring-slate-100 sm:p-5"><p className="text-sm font-semibold">Next step</p><p className="mt-1 text-sm text-slate-500">Save your draft, then use Preview to review the complete guest experience. You’ll publish from Step 3.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={save} disabled={saving || uploading} className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold">{saving ? 'Saving…' : 'Save draft'}</button><a href={`/preview-game${gameId ? `?gameId=${gameId}` : ''}`} className="rounded-2xl border border-slate-200 px-6 py-3 text-center font-semibold">Preview</a></div></div>
  </div></main>;
}
