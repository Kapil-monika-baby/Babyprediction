'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase-browser';
import { MEMORY_LANGUAGES, useMemoryLanguage } from '../memory-language';

type SharedMemory = { kind: string; caption: string; occurredOn: string; milestone: string | null; mediaUrl: string | null; mediaType: string | null };

export default function SharedMemoryPage() {
  const { language, setLanguage, t } = useMemoryLanguage();
  const [memory, setMemory] = useState<SharedMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    window.history.replaceState({}, '', '/memories/share');
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      setError(t('invalidShared'));
      setLoading(false);
      return () => { active = false; };
    }
    void supabase.functions.invoke('resolve-memory-share', { body: { token } }).then(({ data, error: invokeError }) => {
      if (!active) return;
      if (invokeError || !data?.memory) setError(data?.error || t('invalidShared'));
      else setMemory(data.memory as SharedMemory);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError('We could not open this memory. Please try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf7] px-4 py-10 text-slate-900">
    <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-rose-100">
      <div className="bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-7 sm:p-9">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.2em] text-rose-700">GoodNews Baby Memories</p><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span>{t('language')}</span><select aria-label={t('language')} value={language} onChange={e => setLanguage(e.target.value as (typeof MEMORY_LANGUAGES)[number]['code'])} className="rounded-lg border border-slate-200 bg-white px-2 py-2">{MEMORY_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.nativeName}</option>)}</select></label></div>
        <h1 className="mt-3 text-3xl font-black">{t('sharePageTitle')}</h1>
        <p className="mt-2 text-sm text-slate-700">{t('sharePageIntro')}</p>
      </div>
      <div className="p-6 sm:p-8">
        {loading ? <p className="text-sm text-slate-500">{t('loadingShared')}</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : memory ? <>
          {memory.mediaUrl && (memory.mediaType?.startsWith('video/') ? <video controls preload="metadata" src={memory.mediaUrl} className="max-h-[32rem] w-full rounded-2xl bg-slate-100 object-contain" /> : <img src={memory.mediaUrl} alt="A shared family memory" className="max-h-[32rem] w-full rounded-2xl bg-rose-50 object-contain" />)}
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold capitalize text-rose-700">{memory.milestone || memory.kind}</span>
            <time className="text-xs text-slate-500">{new Date(memory.occurredOn + 'T12:00:00').toLocaleDateString()}</time>
          </div>
          {memory.caption && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{memory.caption}</p>}
        </> : null}
        <p className="mt-8 text-xs leading-5 text-slate-500">{t('shareExpired')}</p>
        <Link href="/" className="mt-5 inline-flex text-sm font-bold text-rose-700 hover:text-rose-900">Discover GoodNews Baby</Link>
      </div>
    </section>
  </main>;
}
