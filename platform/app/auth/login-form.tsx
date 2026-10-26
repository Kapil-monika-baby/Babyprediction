'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

function destinationAfterLogin() {
  const requested = new URLSearchParams(window.location.search).get('next');
  // Only allow local app paths; never redirect to an external URL.
  if (!requested || !requested.startsWith('/')) return '/dashboard';
  try {
    const destination = new URL(requested, window.location.origin);
    // URL parsing also normalizes backslashes; compare origins to block open redirects.
    if (destination.origin !== window.location.origin) return '/dashboard';
    return destination.pathname + destination.search + destination.hash;
  } catch {
    return '/dashboard';
  }
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    async function redirectIfAlreadyLoggedIn() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session && !redirecting) {
        // Replace the restored login entry so Android Back cannot strand an
        // authenticated user on the login screen.
        redirecting = true;
        window.location.replace(destinationAfterLogin());
        return;
      }
      if (!session) setCheckingSession(false);
    }

    const onPageShow = () => { void redirectIfAlreadyLoggedIn(); };
    window.addEventListener('pageshow', onPageShow);
    void redirectIfAlreadyLoggedIn();

    return () => {
      active = false;
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Logged in successfully. Redirecting…');
    window.location.replace(destinationAfterLogin());
  }

  if (checkingSession) {
    return <p className="mt-8 text-sm text-slate-500">Checking your session…</p>;
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" />
    <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" placeholder="Password" />
    <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Logging in…' : 'Log in'}</button>
    {message && <p className="text-sm text-slate-600">{message}</p>}
  </form>;
}
