'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';

export default function AcceptMemoryInvitationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const inviteToken = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(inviteToken);
    if (!/^[0-9a-f]{64}$/i.test(inviteToken)) {
      setError('This invitation link is missing or invalid.');
      setChecking(false);
      return () => { active = false; };
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setSignedIn(Boolean(data.user));
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setSignedIn(false);
      setChecking(false);
    });

    return () => { active = false; };
  }, []);

  async function acceptInvitation() {
    if (!token || !signedIn || accepting) return;
    setAccepting(true);
    setError('');
    const { data, error: acceptError } = await supabase.functions.invoke('accept-memory-invitation', {
      body: { token },
    });
    if (acceptError || !data?.timelineId) {
      setError(data?.error || acceptError?.message || 'We could not accept this invitation. Check the invited email and try again.');
      setAccepting(false);
      return;
    }
    // Replacing the URL removes the one-time token from the address bar/history.
    router.replace('/memories/' + data.timelineId);
  }

  const loginHref = '/login?next=' + encodeURIComponent('/memories/invite?token=' + token);

  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf7] px-4 py-10 text-slate-900">
    <section className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-rose-100 sm:p-10">
      <div className="text-4xl" aria-hidden="true">💛</div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-rose-700">GoodNews Baby Memories</p>
      <h1 className="mt-2 text-3xl font-black">Join your family timeline</h1>
      <p className="mt-3 leading-7 text-slate-600">Family invitations are private and email-bound. Sign in using the email address the timeline owner invited, then accept the invitation.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {checking ? <p className="mt-6 text-sm text-slate-500">Checking your invitation…</p> : !token || !/^[0-9a-f]{64}$/i.test(token) ? <Link href="/memories" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Go to Memories</Link> : !signedIn ? <Link href={loginHref} className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Sign in to accept</Link> : <button type="button" onClick={() => void acceptInvitation()} disabled={accepting} className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-700 disabled:opacity-50">{accepting ? 'Accepting invitation…' : 'Accept family invitation'}</button>}
      <p className="mt-6 text-xs leading-5 text-slate-500">Links expire after seven days and can only be used once. If this link was not intended for you, you can safely close this page.</p>
    </section>
  </main>;
}
