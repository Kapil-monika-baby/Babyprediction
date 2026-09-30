import Link from 'next/link';

const games = [
  ['💗', 'Baby gender', 'Girl or boy'],
  ['📅', 'Baby arrival date', 'Predict the big day'],
  ['👨‍👩‍👧', 'Baby lookalike', 'Mom, Dad or both'],
  ['👦', 'Boy name suggestions', 'Let guests suggest names'],
  ['👧', 'Girl name suggestions', 'Let guests suggest names'],
  ['💌', 'Tips & wishes', 'Messages for the parents'],
];

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav"><div className="logo">GoodNews<span>Baby</span></div><div className="nav-links"><Link href="/login">Log in</Link><Link className="button small" href="/signup">Create a game</Link></div></nav>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow">A BABY KEEPSAKE FOR FAMILY & FRIENDS</div><h1>Create your own <em>baby prediction game.</em></h1><p>Let everyone guess the baby's big moments, share wishes, and discover who knows your family best.</p><div className="actions"><Link className="button" href="/signup">Create your game →</Link><Link className="text-link" href="/login">I already have a game</Link></div></div>
        <div className="hero-art"><div className="sun">✦</div><div className="baby">👶</div><div className="float-card one">💗 Girl</div><div className="float-card two">📅 Dec 14</div><div className="float-card three">🏆 Sonia</div></div>
      </section>
      <section className="section"><div className="section-intro"><div className="eyebrow">CHOOSE YOUR GAMES</div><h2>Make it yours.</h2><p>Pick the predictions you want your guests to answer. Customize the experience later.</p></div><div className="game-grid">{games.map(([icon,title,desc]) => <div className="game-card" key={title}><div className="icon">{icon}</div><h3>{title}</h3><p>{desc}</p></div>)}</div></section>
    </main>
  );
}
