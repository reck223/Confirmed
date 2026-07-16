export default function ToolsLoading() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .sk { background:rgba(255,255,255,0.07); animation:shimmer 1.6s ease-in-out infinite; }
      `}</style>
      <div style={{ padding: '32px 0 24px' }}>
        <div className="sk" style={{ height: 10, width: 80, borderRadius: 6, marginBottom: 14 }} />
        <div className="sk" style={{ height: 34, width: '50%', borderRadius: 10 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="sk" style={{ height: 130, borderRadius: 20, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  )
}
