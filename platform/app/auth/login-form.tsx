'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

function destinationAfterLogin() {
  const requested = new URLSearchParams(window.location.search).get('next');
  // Only allow local app paths; never redirect to an external URL.
  if (!requested || !requested.startsWith('/')) return '/dashboard';
  try {
    const destination = new URL(requested, window.location.origin);
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
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple' | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    async function redirectIfAlreadyLoggedIn() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session && !redirecting) {
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

  async function signInWithProvider(provider: 'google' | 'apple') {
    setOauthProvider(provider);
    setLoading(true);
    setMessage('');
    const redirectTo = new URL('/login', window.location.origin);
    redirectTo.searchParams.set('next', destinationAfterLogin());
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    if (error) {
      setMessage(provider === 'google'
        ? 'Google sign-in is unavailable. Please try again or use email and password.'
        : 'Apple sign-in is unavailable. Please try again or use email and password.');
      setOauthProvider(null);
      setLoading(false);
    }
  }

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

  return <div className="mt-8">
    <div className="space-y-3">
      <button type="button" disabled={loading} onClick={() => void signInWithProvider('google')} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
        <span aria-hidden="true" className="font-bold text-lg">G</span>
        {oauthProvider === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
      </button>
      <button type="button" disabled={loading} onClick={() => void signInWithProvider('apple')} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        <span aria-hidden="true" className="text-lg">●</span>
        {oauthProvider === 'apple' ? 'Connecting to Apple…' : 'Continue with Apple'}
      </button>
    </div>
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>
    <form onSubmit={submit} className="space-y-4">
      <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" autoComplete="email" placeholder="Email address" />
      <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" autoComplete="current-password" placeholder="Password" />
      <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Logging in…' : 'Log in'}</button>
      <p className="text-right text-sm"><a href="/forgot-password" className="font-semibold text-slate-700 underline">Forgot password?</a></p>
      {message && <p role="alert" className="text-sm text-slate-600">{message}</p>}
    </form>
  </div>;
}
