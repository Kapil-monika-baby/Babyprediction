'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
    window.location.href = '/dashboard';
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" />
    <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" placeholder="Password" />
    <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Logging in…' : 'Log in'}</button>
    {message && <p className="text-sm text-slate-600">{message}</p>}
  </form>;
}
