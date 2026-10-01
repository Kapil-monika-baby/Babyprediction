const pages = ['Welcome', 'Gender', 'Arrival date', 'Lookalike', 'Names', 'Wishes'];

export default function PreviewGamePage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <a href="/customize-game" className="text-sm font-semibold text-slate-500">← Customize</a>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-rose-500">Step 3 of 4</p><h1 className="mt-2 text-4xl font-bold">Preview your game</h1><p className="mt-3 text-slate-600">This is how guests will experience your game.</p></div><span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">Draft</span></div>
        <div className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="min-h-[520px] bg-gradient-to-br from-rose-100 via-white to-sky-100 p-8 flex flex-col items-center justify-center text-center"><div className="text-7xl">👶</div><p className="mt-6 text-sm font-semibold uppercase tracking-widest text-slate-500">A little prediction party</p><h2 className="mt-3 text-4xl font-bold">Can you predict our baby?</h2><p className="mt-4 max-w-lg text-slate-600">Join our baby prediction game and see who knows us best!</p><button className="mt-8 rounded-2xl bg-slate-900 px-7 py-3 font-semibold text-white">Start predicting</button></div>
          <div className="border-t border-slate-100 p-6"><p className="text-sm font-semibold">Game pages</p><div className="mt-4 flex flex-wrap gap-2">{pages.map((page, index) => <span key={page} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium">{index + 1}. {page}</span>)}</div></div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end"><a href="/customize-game" className="rounded-2xl border border-slate-200 px-6 py-3 text-center font-semibold">Edit</a><button className="rounded-2xl bg-rose-500 px-6 py-3 font-semibold text-white">Save draft</button><button className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">Continue to publish →</button></div>
      </div>
    </main>
  );
}
