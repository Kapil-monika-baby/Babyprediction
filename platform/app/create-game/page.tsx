const predictionTypes = [
  ['gender', '👶', 'Baby gender', 'Boy or girl'],
  ['arrival', '📅', 'Baby arrival date', 'Guess the big day'],
  ['lookalike', '👨‍👩‍👧', 'Baby lookalike', 'Mom, Dad or both'],
  ['boy-name', '💙', 'Boy name', 'Suggest a name'],
  ['girl-name', '💗', 'Girl name', 'Suggest a name'],
  ['wishes', '💌', 'Tips & wishes', 'Leave a message for the parents'],
];

export default function CreateGamePage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm font-semibold text-slate-500">← Dashboard</a>
        <div className="mt-8 max-w-3xl">
          <p className="text-sm font-semibold text-rose-500">Step 1 of 4</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Create your baby prediction game</h1>
          <p className="mt-3 text-slate-600">Start with the basics, then choose the predictions your family and friends can make.</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100">
              <h2 className="text-xl font-bold">About the parents & baby</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Parent 1<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" placeholder="Name" /></label>
                <label className="text-sm font-semibold">Parent 2<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" placeholder="Name" /></label>
                <label className="text-sm font-semibold">Baby nickname<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" placeholder="e.g. Baby A" /></label>
                <label className="text-sm font-semibold">Expected arrival<input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" type="date" /></label>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100">
              <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Choose your predictions</h2><p className="mt-1 text-sm text-slate-500">You can change these later.</p></div><span className="text-sm font-semibold text-slate-500">6 available</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {predictionTypes.map(([id, icon, title, description], index) => (
                  <label key={id} className="flex cursor-pointer gap-4 rounded-2xl border border-slate-200 p-4 hover:border-slate-400">
                    <input type="checkbox" defaultChecked={index < 4} className="mt-1 h-5 w-5" />
                    <span className="text-2xl">{icon}</span>
                    <span><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <a href="/customize-game" className="inline-block rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">Continue to customize →</a>
          </section>

          <aside className="h-fit rounded-3xl bg-white p-6 ring-1 ring-slate-100 lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-rose-500">Live preview</p>
            <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-white to-sky-100 p-7 text-center">
              <div className="text-5xl">👶</div><h3 className="mt-4 text-2xl font-bold">Baby Prediction Game</h3><p className="mt-2 text-sm text-slate-600">Make your predictions and send some love!</p>
              <div className="mt-6 rounded-2xl bg-white/80 p-4 text-left"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected games</p><p className="mt-2 text-sm font-semibold">Gender · Arrival date · Lookalike · Names</p></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
