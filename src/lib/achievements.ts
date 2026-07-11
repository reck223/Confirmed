export type AchievementType =
  | 'first_post' | 'first_win' | 'goal_crusher' | 'milestone_machine'
  | 'circle_builder' | 'connector' | 'coach' | 'reflector' | 'scholar'
  | 'streak_4w' | 'streak_8w' | 'streak_12w' | 'streak_52w'

export const ACHIEVEMENT_META: Record<AchievementType, { emoji: string; title: string; desc: string; color: string }> = {
  first_post:       { emoji: '📣', title: 'First Share',       desc: 'Posted your first update to the circle',     color: '#4ade80' },
  first_win:        { emoji: '🏆', title: 'First Win',         desc: 'Completed your first goal',                  color: '#D4AF37' },
  goal_crusher:     { emoji: '💎', title: 'Goal Crusher',      desc: 'Completed 5 goals',                          color: '#38bdf8' },
  milestone_machine:{ emoji: '⚡', title: 'Milestone Machine', desc: 'Crushed 25 milestones',                      color: '#a78bfa' },
  circle_builder:   { emoji: '👥', title: 'Circle Builder',    desc: 'Created or joined your first circle',        color: '#fb923c' },
  connector:        { emoji: '🤝', title: 'Connector',         desc: 'Followed 5 builders',                        color: '#f472b6' },
  coach:            { emoji: '🎙️', title: 'Coach',             desc: 'Left 10 comments for your circle',           color: '#818cf8' },
  reflector:        { emoji: '🧘', title: 'Reflector',         desc: 'Completed 4 weekly reflections',             color: '#34d399' },
  scholar:          { emoji: '📚', title: 'Scholar',           desc: 'Finished every Playbook lesson',             color: '#fbbf24' },
  streak_4w:        { emoji: '🔥', title: '4-Week Streak',     desc: 'Showed up for 4 consecutive weeks',          color: '#f97316' },
  streak_8w:        { emoji: '🚀', title: '8-Week Streak',     desc: '8 weeks of consistent action',               color: '#f97316' },
  streak_12w:       { emoji: '👑', title: '12-Week Streak',    desc: 'A full quarter of unstoppable momentum',     color: '#D4AF37' },
  streak_52w:       { emoji: '🌟', title: 'Year of Action',    desc: 'One full year of showing up',                color: '#f472b6' },
}
