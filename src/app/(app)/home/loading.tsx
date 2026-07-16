export default function HomeLoading() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.4; }
        }
        .sk { background: rgba(255,255,255,0.07); border-radius: 10px; animation: shimmer 1.6s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '32px 0 24px' }}>
        <div className="sk" style={{ height: 10, width: 140, borderRadius: 6, marginBottom: 16 }} />
        <div className="sk" style={{ height: 38, width: '70%', borderRadius: 10, marginBottom: 10 }} />
        <div className="sk" style={{ height: 38, width: '45%', borderRadius: 10, marginBottom: 18 }} />
        <div className="sk" style={{ height: 10, width: '60%', borderRadius: 6, marginBottom: 14 }} />
        <div className="sk" style={{ height: 3, borderRadius: 99 }} />
      </div>

      {/* AI card */}
      <div className="sk" style={{ height: 96, borderRadius: 18, marginBottom: 20 }} />

      {/* Daily cards row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="sk" style={{ height: 140, borderRadius: 18, flex: '0 0 82%' }} />
        <div className="sk" style={{ height: 140, borderRadius: 18, flex: '0 0 82%' }} />
      </div>

      {/* Mission card */}
      <div className="sk" style={{ height: 160, borderRadius: 22, marginBottom: 24 }} />

      {/* Continue learning */}
      <div className="sk" style={{ height: 140, borderRadius: 22 }} />
    </div>
  )
}
