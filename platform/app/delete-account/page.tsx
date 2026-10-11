'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function DeleteAccountRequestPage() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (website) { setSent(true); return; }
    setSubmitting(true);
    setError('');
    const { error: insertError } = await supabase.from('account_deletion_requests').insert({ email: email.trim().toLowerCase() });
    setSubmitting(false);
    if (insertError) {
      setError('We could not submit your request right now. Please try again later.');
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-xl">
        <a href="/" className="text-sm font-semibold text-slate-500">← GoodNews Baby</a>
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-rose-500">GoodNews Baby</p>
          <h1 className="mt-2 text-3xl font-extrabold">Request account deletion</h1>
          <p className="mt-3 leading-7 text-slate-600">Use this page to request deletion of your GoodNews Baby account and associated personal data even if you cannot access the app.</p>
          {sent ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900" role="status">
              <h2 className="font-bold">Your request has been received</h2>
              <p className="mt-2 text-sm leading-6">We have recorded your account deletion request for review. We may need to verify that you control the account before completing deletion.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label htmlFor="deletion-email" className="block text-sm font-semibold">Email address used for your account</label>
              <input id="deletion-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="you@example.com" autoComplete="email" />
              <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
              </div>
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-rose-600 disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit deletion request'}</button>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            </form>
          )}
          <div className="mt-7 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">
            <p>If you can sign in, you can delete your account immediately from <a href="/account" className="font-semibold text-slate-800 underline">Account settings</a>.</p>
            <p className="mt-2">Account deletion removes your profile and associated baby details, games, questions, predictions, results and stored game images, except information we are legally required to retain.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
