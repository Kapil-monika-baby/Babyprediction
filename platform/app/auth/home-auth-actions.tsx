'use client';

import { useEffect, type MouseEvent } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function HomeAuthActions() {
  useEffect(() => {
    let active = true;
    let redirecting = false;

    const goToDashboard = () => {
      if (!active || redirecting || window.location.pathname !== '/') return;
      redirecting = true;
      window.location.replace('/dashboard');
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) goToDashboard();
    };

    const onPageShow = () => { void checkSession(); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goToDashboard();
    });

    window.addEventListener('pageshow', onPageShow);
    void checkSession();

    return () => {
      active = false;
      window.removeEventListener('pageshow', onPageShow);
      subscription.unsubscribe();
    };
  }, []);

  function replaceNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    window.location.replace(event.currentTarget.href);
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <a href="/signup" onClick={replaceNavigation} className="rounded-2xl bg-slate-900 px-7 py-3 font-semibold text-white">Create your game</a>
      <a href="/login" onClick={replaceNavigation} className="rounded-2xl border border-slate-200 bg-white px-7 py-3 font-semibold">Log in</a>
    </div>
  );
}
