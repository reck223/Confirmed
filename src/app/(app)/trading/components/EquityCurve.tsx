export function EquityCurve({ data }: { data: number[] }) {
  const W = 600, H = 110, PAD = 6
  if (data.length < 3) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 12 }}>
        Equity curve fills in as trades close
      </div>
    )
  }
  const last = data[data.length - 1]
  const color = last >= 0 ? '#4ade80' : '#f87171'
  const minV = Math.min(0, ...data)
  const maxV = Math.max(0, ...data)
  const range = maxV - minV || 1
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2))
  const ys = data.map(v => H - PAD - ((v - minV) / range) * (H - PAD * 2))
  const zeroY = H - PAD - ((0 - minV) / range) * (H - PAD * 2)
  const linePts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  const areaPts = `${PAD},${zeroY} ${linePts} ${W - PAD},${zeroY}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}
      <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3,3" />
      <polygon points={areaPts} fill="url(#eqGrad)" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={color} />
    </svg>
  )
}
