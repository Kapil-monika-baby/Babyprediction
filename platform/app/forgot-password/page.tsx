'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    setMessage(error
      ? error.message
      : 'If an account exists for that email, a password-reset link has been sent. Check your inbox.');
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <a href="/login" className="text-sm font-semibold text-slate-500">← Back to log in</a>
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-rose-500">Account recovery</p>
          <h1 className="mt-2 text-3xl font-bold">Reset your password</h1>
          <p className="mt-3 text-slate-600">Enter your account email and we’ll send a secure reset link.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" autoComplete="email" />
            <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Sending…' : 'Send reset link'}</button>
            {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
          </form>
        </div>
      </div>
    </main>
  );
}
