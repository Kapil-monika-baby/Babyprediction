const games = [
  { title: 'My Baby Prediction Game', status: 'Draft', predictions: 0 },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-500">Parent dashboard</p>
            <h1 className="mt-1 text-3xl font-bold">Your baby games</h1>
            <p className="mt-2 text-slate-600">Create, customize and share a prediction game with family and friends.</p>
          </div>
          <a href="/create-game" className="rounded-2xl bg-slate-900 px-5 py-3 text-center font-semibold text-white">+ Create a game</a>
        </header>

        <section className="mt-10 grid gap-5 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Games</p><p className="mt-2 text-3xl font-bold">1</p></div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Predictions received</p><p className="mt-2 text-3xl font-bold">0</p></div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100"><p className="text-sm text-slate-500">Games published</p><p className="mt-2 text-3xl font-bold">0</p></div>
        </section>

        <section className="mt-10">
          {games.map((game) => (
            <div key={game.title} className="rounded-3xl bg-white p-6 ring-1 ring-slate-100 sm:flex sm:items-center sm:justify-between">
              <div><p className="text-xl font-bold">{game.title}</p><p className="mt-1 text-sm text-slate-500">{game.status} · {game.predictions} predictions</p></div>
              <a href="/create-game" className="mt-5 inline-block rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold sm:mt-0">Continue setup</a>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
