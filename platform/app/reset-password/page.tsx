'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setReady(true);
      if (active && !session && !window.location.hash.includes('access_token=')) {
        setMessage('This reset link is invalid or has expired. Request a new password-reset email.');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) {
      setMessage('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Password updated. You can now log in with your new password.');
    setPassword('');
    setConfirmPassword('');
    await supabase.auth.signOut();
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <a href="/login" className="text-sm font-semibold text-slate-500">← Back to log in</a>
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-rose-500">Account recovery</p>
          <h1 className="mt-2 text-3xl font-bold">Choose a new password</h1>
          <p className="mt-3 text-slate-600">Use at least 8 characters.</p>
          {ready ? (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <input required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" autoComplete="new-password" placeholder="New password" />
              <input required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" autoComplete="new-password" placeholder="Confirm new password" />
              <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? 'Updating…' : 'Update password'}</button>
            </form>
          ) : <p className="mt-6 text-sm text-slate-600">Validating your recovery link…</p>}
          {message && <p role="status" className="mt-4 text-sm text-slate-600">{message}</p>}
        </div>
      </div>
    </main>
  );
}
