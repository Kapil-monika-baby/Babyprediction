export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#fffaf7', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: 620, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>👶</div>
        <h1 style={{ fontSize: 42, margin: '16px 0 12px' }}>Create your baby prediction game</h1>
        <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.6 }}>Build a personalized game, invite family and friends, collect predictions and discover who knows you best.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <a href="/signup" style={{ background: '#0f172a', color: '#fff', padding: '13px 20px', borderRadius: 14, textDecoration: 'none', fontWeight: 700 }}>Create an account</a>
          <a href="/login" style={{ border: '1px solid #cbd5e1', color: '#0f172a', padding: '13px 20px', borderRadius: 14, textDecoration: 'none', fontWeight: 700 }}>Log in</a>
        </div>
      </section>
    </main>
  );
}
