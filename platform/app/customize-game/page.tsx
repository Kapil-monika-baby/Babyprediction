const sections = ['Welcome page', 'Baby gender', 'Arrival date', 'Lookalike', 'Name suggestions', 'Tips & wishes'];

export default function CustomizeGamePage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <a href="/create-game" className="text-sm font-semibold text-slate-500">← Game setup</a>
        <div className="mt-8"><p className="text-sm font-semibold text-rose-500">Step 2 of 4</p><h1 className="mt-2 text-4xl font-bold">Make it yours</h1><p className="mt-3 text-slate-600">Customize the words and background for every prediction page.</p></div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <nav className="rounded-3xl bg-white p-3 ring-1 ring-slate-100">
            {sections.map((section, index) => <button key={section} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${index === 0 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{section}</button>)}
          </nav>
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100">
              <h2 className="text-xl font-bold">Welcome page</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-semibold">Headline<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" defaultValue="Can you predict our baby?" /></label>
                <label className="block text-sm font-semibold">Message<textarea className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" defaultValue="Join our baby prediction game and see who knows us best!" /></label>
                <label className="block text-sm font-semibold">Background image<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="file" accept="image/*" /></label>
                <p className="text-xs text-slate-500">Image upload will be connected to secure cloud storage when Supabase is added.</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100">
              <p className="text-sm font-semibold text-rose-500">Preview</p>
              <div className="mt-4 min-h-[420px] rounded-3xl bg-gradient-to-br from-rose-100 via-white to-sky-100 p-8 text-center flex flex-col items-center justify-center">
                <div className="text-6xl">🍼</div><h3 className="mt-6 text-3xl font-bold">Can you predict our baby?</h3><p className="mt-3 max-w-xs text-slate-600">Join our baby prediction game and see who knows us best!</p><button className="mt-8 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">Start predicting</button>
              </div>
            </div>
          </section>
        </div>
        <div className="mt-8 flex justify-between"><a href="/create-game" className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold">← Back</a><a href="/preview-game" className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">Preview game →</a></div>
      </div>
    </main>
  );
}
