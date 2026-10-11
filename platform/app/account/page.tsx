'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function AccountPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        window.location.replace('/login?next=%2Faccount');
        return;
      }
      setEmail(user.email || '');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function deleteAccount() {
    if (confirmText !== 'DELETE' || deleting) return;
    setDeleting(true);
    setMessage('');
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'DELETE' } });
    if (error) {
      setMessage(error.message || 'Account deletion failed. Please try again.');
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    setDone(true);
    setDeleting(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#fffaf7] text-sm text-slate-600">Checking your account…</main>;

  if (done) return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-16 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-rose-100">
        <div className="text-5xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Account deletion completed</h1>
        <p className="mt-3 text-slate-600">Your account and associated app data have been submitted for deletion successfully.</p>
        <a href="/" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Back to GoodNews Baby</a>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-xl">
        <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Parent dashboard</a>
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-rose-500">GoodNews Baby</p>
          <h1 className="mt-2 text-3xl font-extrabold">Account settings</h1>
          <p className="mt-3 text-slate-600">Signed in as <strong className="break-all text-slate-800">{email}</strong></p>
          <button type="button" onClick={async () => { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) setMessage('Could not sign out. Please try again.'); else window.location.replace('/login'); }} className="mt-5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:bg-slate-50">Sign out</button>
          <div className="my-8 border-t border-slate-100" />
          <h2 className="text-xl font-bold text-red-700">Delete your account</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">This permanently deletes your account and associated parent profile, baby details, games, questions, results, predictions and stored game images. This action cannot be undone.</p>
          <label htmlFor="confirm-delete" className="mt-5 block text-sm font-semibold">Type DELETE to confirm</label>
          <input id="confirm-delete" value={confirmText} onChange={event => setConfirmText(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="DELETE" />
          <button type="button" onClick={deleteAccount} disabled={confirmText !== 'DELETE' || deleting} className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{deleting ? 'Deleting account…' : 'Permanently delete account'}</button>
          {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
          <p className="mt-5 text-xs leading-5 text-slate-500">Unable to sign in? You can also submit a deletion request at <a className="font-semibold underline" href="/delete-account">our account deletion webpage</a>.</p>
        </section>
      </div>
    </main>
  );
}
