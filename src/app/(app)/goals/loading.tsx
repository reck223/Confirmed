export default function GoalsLoading() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .sk { background:rgba(255,255,255,0.07); animation:shimmer 1.6s ease-in-out infinite; }
      `}</style>
      <div style={{ padding: '32px 0 24px' }}>
        <div className="sk" style={{ height: 10, width: 100, borderRadius: 6, marginBottom: 14 }} />
        <div className="sk" style={{ height: 34, width: '55%', borderRadius: 10 }} />
      </div>
      {[0,1,2].map(i => (
        <div key={i} className="sk" style={{ height: 120, borderRadius: 20, marginBottom: 14, animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  )
}
