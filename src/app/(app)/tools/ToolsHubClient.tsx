'use client'
import Link from 'next/link'

type Props = {
  morningDone: boolean; eveningDone: boolean
  challengeCount: number; challengesTodayDone: number
  monthExpenses: number
  booksReading: number; pagesThisMonth: number
  mealsToday: number; workoutsThisWeek: number
  lessonsCompleted: number; totalLessons: number
}

const TOOLS = (p: Props) => [
  {
    href: '/playbook',
    emoji: '📚',
    label: 'Playbook',
    desc: 'Lessons · frameworks · systems',
    accent: '#D4AF37',
    shadow: 'rgba(212,175,55,0.18)',
    stat: p.lessonsCompleted > 0 ? `${p.lessonsCompleted}/${p.totalLessons} lessons · ${p.lessonsCompleted * 20} XP` : 'Start your first lesson',
    statDot: '#D4AF37',
  },
  {
    href: '/journal',
    emoji: '📓',
    label: 'Journal',
    desc: 'Check-ins & reflection',
    accent: '#a78bfa',
    shadow: 'rgba(167,139,250,0.18)',
    stat: p.morningDone && p.eveningDone ? '✓ All done today' : p.morningDone ? 'Evening up next' : 'Start check-in',
    statDot: p.morningDone && p.eveningDone ? '#4ade80' : '#a78bfa',
  },
  {
    href: '/tools/focus',
    emoji: '⏱',
    label: 'Focus',
    desc: 'Deep work sessions',
    accent: '#38bdf8',
    shadow: 'rgba(56,189,248,0.18)',
    stat: 'Ready to focus',
    statDot: '#38bdf8',
  },
  {
    href: '/tools/habits',
    emoji: '🏆',
    label: 'Challenges',
    desc: '30/60/90-day streaks',
    accent: '#D4AF37',
    shadow: 'rgba(212,175,55,0.18)',
    stat: p.challengeCount ? `${p.challengesTodayDone}/${p.challengeCount} checked in` : 'Start a challenge',
    statDot: '#D4AF37',
  },
  {
    href: '/tools/study',
    emoji: '💰',
    label: 'Budget',
    desc: 'Income & expenses',
    accent: '#22c55e',
    shadow: 'rgba(34,197,94,0.18)',
    stat: p.monthExpenses > 0 ? `$${p.monthExpenses.toFixed(0)} spent` : 'Log a transaction',
    statDot: '#22c55e',
  },
  {
    href: '/tools/meals',
    emoji: '🥗',
    label: 'Meal Prep',
    desc: 'Weekly macros',
    accent: '#f97316',
    shadow: 'rgba(249,115,22,0.18)',
    stat: p.mealsToday ? `${p.mealsToday} logged` : 'Plan meals',
    statDot: '#f97316',
  },
  {
    href: '/tools/workout',
    emoji: '🏋️',
    label: 'Workout',
    desc: 'Log & track',
    accent: '#ef4444',
    shadow: 'rgba(239,68,68,0.18)',
    stat: p.workoutsThisWeek ? `${p.workoutsThisWeek} this week` : 'Start session',
    statDot: '#ef4444',
  },
  {
    href: '/tools/reading',
    emoji: '📖',
    label: 'Reading',
    desc: 'Track books & progress',
    accent: '#38bdf8',
    shadow: 'rgba(56,189,248,0.18)',
    stat: p.booksReading ? `${p.booksReading} in progress` : p.pagesThisMonth ? `${p.pagesThisMonth} pages` : 'Add a book',
    statDot: '#38bdf8',
  },
]

export function ToolsHubClient(props: Props) {
  const tools = TOOLS(props)
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .tool-card {
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
          isolation: isolate;
          transform: translateZ(0);
          will-change: transform;
        }
        .tool-card:active { transform: scale(0.955) translateZ(0); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '32px 0 28px', animation: 'fadeUp 0.35s ease both' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
          {dayName.toUpperCase()} · {dateStr.toUpperCase()}
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 6 }}>
          Tools
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>Everything you need, every day.</p>
      </div>

      {/* ── 2-col grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {tools.map((t, i) => (
          <Link
            key={t.href}
            href={t.href}
            className="tool-card"
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 24,
              overflow: 'hidden',
              background: '#111',
              border: `1px solid ${t.accent}28`,
              boxShadow: `0 2px 16px ${t.shadow}, 0 0 0 0 transparent`,
              animation: `fadeUp 0.35s ${i * 0.055}s ease both`,
              minHeight: 158,
              position: 'relative',
            }}
          >
            <div style={{ height: 3, background: `linear-gradient(90deg, ${t.accent}, ${t.accent}55)`, flexShrink: 0 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle at 70% 30%, ${t.accent}1A, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 14px 14px', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${t.accent}14`, border: `1px solid ${t.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12, flexShrink: 0 }}>
                {t.emoji}
              </div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#EFEFEF', marginBottom: 3, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{t.label}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5, flex: 1, marginBottom: 12 }}>{t.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.statDot, flexShrink: 0, boxShadow: `0 0 6px ${t.statDot}` }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: t.statDot, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{t.stat}</span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                  <path d="M2 5h6M5 2l3 3-3 3" stroke={t.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
