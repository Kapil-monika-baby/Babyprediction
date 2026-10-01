export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <a href="/" className="text-sm font-semibold text-slate-500">← GoodNews Baby</a>
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-rose-500">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold">Log in to your baby game</h1>
          <p className="mt-3 text-slate-600">Your real account will be connected to Supabase Auth in the next stage.</p>
          <form className="mt-8 space-y-4">
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="email" placeholder="Email address" />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" type="password" placeholder="Password" />
            <button type="button" className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Log in</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">New here? <a href="/signup" className="font-semibold text-slate-900">Create an account</a></p>
        </div>
      </div>
    </main>
  );
}
