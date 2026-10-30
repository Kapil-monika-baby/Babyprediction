'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase-browser';

type SharedMemory = { kind: string; caption: string; occurredOn: string; milestone: string | null; mediaUrl: string | null; mediaType: string | null };

export default function SharedMemoryPage() {
  const [memory, setMemory] = useState<SharedMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      setError('This share link is invalid or has expired.');
      setLoading(false);
      return () => { active = false; };
    }
    void supabase.functions.invoke('resolve-memory-share', { body: { token } }).then(({ data, error: invokeError }) => {
      if (!active) return;
      if (invokeError || !data?.memory) setError(data?.error || 'This memory is no longer available.');
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
        <p className="text-xs font-bold uppercase tracking-[.2em] text-rose-700">GoodNews Baby Memories</p>
        <h1 className="mt-3 text-3xl font-black">A family memory, shared with you</h1>
        <p className="mt-2 text-sm text-slate-700">This link opens one selected memory, not the family timeline.</p>
      </div>
      <div className="p-6 sm:p-8">
        {loading ? <p className="text-sm text-slate-500">Opening this memory…</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : memory ? <>
          {memory.mediaUrl && (memory.mediaType?.startsWith('video/') ? <video controls preload="metadata" src={memory.mediaUrl} className="max-h-[32rem] w-full rounded-2xl bg-slate-100 object-contain" /> : <img src={memory.mediaUrl} alt="A shared family memory" className="max-h-[32rem] w-full rounded-2xl bg-rose-50 object-contain" />)}
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold capitalize text-rose-700">{memory.milestone || memory.kind}</span>
            <time className="text-xs text-slate-500">{new Date(memory.occurredOn + 'T12:00:00').toLocaleDateString()}</time>
          </div>
          {memory.caption && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{memory.caption}</p>}
        </> : null}
        <p className="mt-8 text-xs leading-5 text-slate-500">This private link expires automatically and can be revoked by the family timeline owner.</p>
        <Link href="/" className="mt-5 inline-flex text-sm font-bold text-rose-700 hover:text-rose-900">Discover GoodNews Baby</Link>
      </div>
    </section>
  </main>;
}
