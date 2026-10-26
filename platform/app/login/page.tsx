'use client';

import { useEffect, useState } from "react";
import LoginForm from "../auth/login-form";
import { supabase } from "../../lib/supabase-browser";

function destinationAfterLogin() {
  const requested = new URLSearchParams(window.location.search).get("next");
  // Only allow local app paths; never redirect to an external URL.
  return requested && requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/dashboard";
}

export default function LoginPage() {
  const [ready, setReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let active = true;
    let redirectStarted = false;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || redirectStarted) return;
      if (session) {
        redirectStarted = true;
        setRedirecting(true);
        window.location.replace(destinationAfterLogin());
        return;
      }
      setReady(true);
    }

    const onPageShow = () => { void checkSession(); };
    window.addEventListener("pageshow", onPageShow);
    void checkSession();

    return () => {
      active = false;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  if (!ready || redirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf7] px-6 text-slate-700">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">👶</div>
          <p className="mt-4 text-sm font-medium">{redirecting ? "Opening your parent dashboard…" : "Checking your session…"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <a href="/" className="text-sm font-semibold text-slate-500">← Baby Prediction</a>
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-rose-500">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold">Log in to your baby game</h1>
          <p className="mt-3 text-slate-600">Use your parent account to manage games and see predictions.</p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-500">New here? <a href={"/signup?next=" + encodeURIComponent(destinationAfterLogin())} className="font-semibold text-slate-900">Create an account</a></p>
        </div>
      </div>
    </main>
  );
}
