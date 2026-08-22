// A rotating daily challenge — same for every user on a given calendar day,
// picked deterministically from the date string so it doesn't need a cron
// job or any storage of its own. Each entry points at something people
// already do elsewhere in the app; completion is detected by checking
// whether that action happened today, not by a manual "mark done" toggle.
export type DailyChallenge = {
  id: string
  emoji: string
  label: string
  description: string
  xpBonus: number
  href: string
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'meal',             emoji: '🥗', label: 'Log a meal',            description: 'Track anything you ate today.',                          xpBonus: 10, href: '/tools/meals' },
  { id: 'workout',          emoji: '💪', label: 'Get a workout in',      description: 'Log a workout session today.',                           xpBonus: 10, href: '/tools/workout' },
  { id: 'journal',          emoji: '📓', label: 'Write in your journal', description: "Any entry counts — gratitude, a check-in, what's on your mind.", xpBonus: 10, href: '/journal' },
  { id: 'budget',           emoji: '💰', label: 'Log a transaction',     description: 'Track one expense or bit of income today.',              xpBonus: 10, href: '/tools/budget' },
  { id: 'reading',          emoji: '📖', label: 'Read a few pages',      description: 'Log a reading session on any book.',                      xpBonus: 10, href: '/tools/reading' },
  { id: 'challenge_checkin', emoji: '🏆', label: 'Check off a challenge', description: 'Log today on any active challenge.',                     xpBonus: 10, href: '/tools/challenges' },
  { id: 'goal_social',      emoji: '🎉', label: 'Cheer someone on',      description: "React or comment on someone else's goal.",               xpBonus: 10, href: '/explore' },
  { id: 'lesson',           emoji: '📚', label: 'Finish a lesson',       description: 'Complete a lesson on The Path.',                          xpBonus: 10, href: '/playbook' },
]

export function todayChallenge(dateStr: string): DailyChallenge {
  let hash = 0
  for (const ch of dateStr) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return DAILY_CHALLENGES[hash % DAILY_CHALLENGES.length]
}
