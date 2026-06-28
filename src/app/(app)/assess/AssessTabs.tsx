'use client'
import { useState } from 'react'

export function AssessTabs({
  thisWeek,
  archive,
  historyCount,
}: {
  thisWeek: React.ReactNode
  archive: React.ReactNode
  historyCount: number
}) {
  const [tab, setTab] = useState<'week' | 'archive'>('week')

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 28 }}>
        <button
          className={`comm-tab${tab === 'week' ? ' active' : ''}`}
          onClick={() => setTab('week')}
        >
          This Week
        </button>
        <button
          className={`comm-tab${tab === 'archive' ? ' active' : ''}`}
          onClick={() => setTab('archive')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Archive
          {historyCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, lineHeight: 1,
              background: 'rgba(212,175,55,0.15)', color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 20, padding: '2px 7px',
            }}>
              {historyCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'week' ? thisWeek : archive}
    </div>
  )
}
