'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

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
      ? `${window.location.origin}/login`
      : 'https://babyprediction.vercel.app/login';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo },
    });

    setLoading(false);
    setMessage(error
      ? error.message
      : 'Account created. Check your email. The verification link will return you to Baby Prediction.');
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Your name" />
    <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" />
    <input required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" placeholder="Create password" />
    <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Creating…' : 'Create account'}</button>
    {message && <p className="text-sm text-slate-600">{message}</p>}
  </form>;
}
