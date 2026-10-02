import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center text-center">
        <div className="text-7xl">👶</div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Baby Prediction</p>
        <h1 className="mt-3 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">Make your baby shower unforgettable.</h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">Create a beautiful prediction game, invite your family and friends, and collect their guesses, names and wishes in one place.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="rounded-2xl bg-slate-900 px-7 py-3 font-semibold text-white">Create your game</Link>
          <Link href="/login" className="rounded-2xl border border-slate-200 bg-white px-7 py-3 font-semibold">Log in</Link>
        </div>
      </div>
    </main>
  );
}
