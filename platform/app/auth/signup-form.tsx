'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

function destinationAfterSignup() {
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

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Your name" />
    <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" />
    <input required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" placeholder="Create password" />
    <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Creating…' : 'Create account'}</button>
    {message && <p className="text-sm text-slate-600">{message}</p>}
  </form>;
}
