export const XP_EVENTS = {
  CHECKIN:            10,
  MILESTONE_DONE:     25,
  GOAL_COMPLETE:     150,
  CIRCLE_POST:        15,
  COMMENT:             5,
  WEEKLY_REFLECTION:  50,
  PLAYBOOK_LESSON:    20,
  INVITE_ACCEPTED:    50,
} as const

export const LEVELS = [
  { level: 1, title: 'Starter',   min: 0,    max: 99,   color: 'rgba(255,255,255,0.50)' },
  { level: 2, title: 'Builder',   min: 100,  max: 299,  color: '#4ade80' },
  { level: 3, title: 'Grinder',   min: 300,  max: 599,  color: '#38bdf8' },
  { level: 4, title: 'Achiever',  min: 600,  max: 999,  color: '#a78bfa' },
  { level: 5, title: 'Champion',  min: 1000, max: 1799, color: '#D4AF37' },
  { level: 6, title: 'Visionary', min: 1800, max: 2999, color: '#f97316' },
  { level: 7, title: 'Legend',    min: 3000, max: Infinity, color: '#f472b6' },
] as const

export function getLevelInfo(xp: number) {
  const lvl = [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0]
  const next = LEVELS.find(l => l.min > xp)
  const progressToNext = next
    ? Math.round(((xp - lvl.min) / (next.min - lvl.min)) * 100)
    : 100
  return { ...lvl, xp, progressToNext, xpToNext: next ? next.min - xp : 0 }
}
