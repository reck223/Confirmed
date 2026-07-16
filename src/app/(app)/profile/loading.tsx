export default function ProfileLoading() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .sk { background:rgba(255,255,255,0.07); animation:shimmer 1.6s ease-in-out infinite; }
      `}</style>
      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 28px', gap: 12 }}>
        <div className="sk" style={{ width: 80, height: 80, borderRadius: '50%' }} />
        <div className="sk" style={{ height: 20, width: 140, borderRadius: 8 }} />
        <div className="sk" style={{ height: 12, width: 100, borderRadius: 6 }} />
      </div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[0,1,2].map(i => (
          <div key={i} className="sk" style={{ flex: 1, height: 64, borderRadius: 16 }} />
        ))}
      </div>
      {/* Post grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="sk" style={{ aspectRatio: '1', borderRadius: 0, animationDelay: `${i * 0.06}s` }} />
        ))}
      </div>
    </div>
  )
}
