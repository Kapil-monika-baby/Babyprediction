'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

function destinationAfterSignup() {
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

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple' | null>(null);

  async function signUpWithProvider(provider: 'google' | 'apple') {
    setOauthProvider(provider);
    setLoading(true);
    setMessage('');
    const redirectTo = new URL('/login', window.location.origin);
    redirectTo.searchParams.set('next', destinationAfterSignup());
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });
    if (error) {
      setMessage(provider === 'google'
        ? 'Google sign-up is unavailable. Please try again or create an account with email.'
        : 'Apple sign-up is unavailable. Please try again or create an account with email.');
      setOauthProvider(null);
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const emailRedirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/login?next=${encodeURIComponent(destinationAfterSignup())}`
      : 'https://babyprediction.vercel.app/login?next=%2Fdashboard';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo },
    });

    setLoading(false);
    setMessage(error
      ? error.message
      : 'Account created. Check your email. The verification link will return you to your requested page after you sign in.');
  }

  return <div className="mt-8">
    <div className="space-y-3">
      <button type="button" disabled={loading} onClick={() => void signUpWithProvider('google')} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
        <span aria-hidden="true" className="font-bold text-lg">G</span>
        {oauthProvider === 'google' ? 'Connecting to Google…' : 'Sign up with Google'}
      </button>
      <button type="button" disabled={loading} onClick={() => void signUpWithProvider('apple')} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        <span aria-hidden="true" className="text-lg">●</span>
        {oauthProvider === 'apple' ? 'Connecting to Apple…' : 'Sign up with Apple'}
      </button>
    </div>
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>
    <form onSubmit={submit} className="space-y-4">
      <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Your name" />
      <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" />
      <input required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" placeholder="Create password" />
      <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Creating…' : 'Create account'}</button>
      {message && <p role="alert" className="text-sm text-slate-600">{message}</p>}
    </form>
  </div>;
}
