export type QodEntry = { emoji: string; label: string; q: string }

const DAILY_QUESTIONS: QodEntry[] = [
  { emoji: '🌅', label: 'Intention',      q: "What's one thing you want to feel proud of by the end of today?" },
  { emoji: '🎯', label: 'Clarity',        q: "What's the one thing that, if done today, would make everything else easier?" },
  { emoji: '🪞', label: 'Honesty',        q: "What are you avoiding right now — and what would it take to face it today?" },
  { emoji: '💡', label: 'Mindset',        q: "What story or belief might hold you back today? Is it actually true?" },
  { emoji: '🔥', label: 'Drive',          q: "What would make today feel like a win, even if nothing else went right?" },
  { emoji: '🤝', label: 'Connection',     q: "Who in your circle could use a word from you today?" },
  { emoji: '🧘', label: 'Perspective',    q: "What does the best version of you do differently today?" },
  { emoji: '🌱', label: 'Growth',         q: "What's something you're worse at today than you'll be a year from now?" },
  { emoji: '🙏', label: 'Gratitude',      q: "What's something you'd miss badly if it were gone tomorrow, that you haven't thanked anyone for?" },
  { emoji: '🦁', label: 'Courage',        q: "What's the conversation you've been putting off having?" },
  { emoji: '⚙️', label: 'Discipline',     q: "What's one thing you'll do today whether or not you feel like it?" },
  { emoji: '🎨', label: 'Creativity',     q: "What would you build today if you knew it couldn't fail?" },
  { emoji: '📜', label: 'Legacy',         q: "If someone described your week to a stranger, what would you want them to say?" },
  { emoji: '🚧', label: 'Boundaries',     q: "What's one thing you'll say no to today so you can say yes to what matters?" },
  { emoji: '🌊', label: 'Change',         q: "What's something you keep doing out of habit that no longer serves who you're becoming?" },
  { emoji: '⏳', label: 'Patience',       q: "What are you rushing that actually deserves more time?" },
  { emoji: '🧭', label: 'Purpose',        q: "Does today's plan actually point toward where you say you want to go?" },
  { emoji: '🛡️', label: 'Resilience',     q: "What's something that knocked you down recently that you're still standing back up from?" },
  { emoji: '💗', label: 'Self-Compassion', q: "Where have you been harder on yourself than you'd ever be on someone you love?" },
  { emoji: '🚀', label: 'Ambition',       q: "What goal have you quietly shrunk to make it feel safer?" },
  { emoji: '👁️', label: 'Presence',       q: "What's pulling your attention away from the people or things in front of you right now?" },
  { emoji: '🔍', label: 'Curiosity',      q: "What's something you've assumed about your life that you've never actually questioned?" },
  { emoji: '✅', label: 'Accountability', q: "What's something you said you'd do that you still haven't started?" },
  { emoji: '🛌', label: 'Rest',           q: "When did you last stop not because you were done, but because you decided to?" },
  { emoji: '😨', label: 'Fear',           q: "What's something you want that you're pretending you don't, because wanting it feels risky?" },
  { emoji: '⚖️', label: 'Values',         q: "Where did your calendar and your values disagree with each other this week?" },
  { emoji: '🔁', label: 'Habits',         q: "What's one small thing you did today that, repeated for a year, would change your life?" },
  { emoji: '🎯', label: 'Focus',          q: "What's competing for your attention today that doesn't deserve to win?" },
  { emoji: '🎁', label: 'Generosity',     q: "Who could you make today easier for, without them ever knowing it was you?" },
  { emoji: '🪪', label: 'Identity',       q: "Are you living like the person you say you are, or the person you used to be?" },
  { emoji: '💰', label: 'Money',          q: "Does how you spent this week match what you claim matters most to you?" },
  { emoji: '❤️‍🩹', label: 'Health',        q: "What's your body been trying to tell you that you've been too busy to hear?" },
  { emoji: '🤍', label: 'Relationships',  q: "Who do you take for granted that you'd fight to get back if you lost them?" },
  { emoji: '📉', label: 'Failure',        q: "What's a mistake you're still punishing yourself for, long after it taught you what it had to teach?" },
  { emoji: '🌾', label: 'Simplicity',     q: "What could you remove from your life today that would make everything else lighter?" },
  { emoji: '🔗', label: 'Trust',          q: "Where are you waiting for certainty before you'll commit to something you already know is right?" },
]

function getNthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstDay = new Date(year, month, 1).getDay()
  return 1 + ((weekday - firstDay + 7) % 7) + (n - 1) * 7
}

function getLastWeekday(year: number, month: number, weekday: number): number {
  const lastDay = new Date(year, month + 1, 0)
  return lastDay.getDate() - ((lastDay.getDay() - weekday + 7) % 7)
}

function getHolidayQod(date: Date): QodEntry | null {
  const m = date.getMonth()
  const d = date.getDate()
  const y = date.getFullYear()

  // Fixed holidays
  if (m === 0  && d === 1)  return { emoji: '🎉', label: "New Year's Day",    q: "It's a new year — what's one thing you're leaving behind, and one thing you're stepping fully into?" }
  if (m === 1  && d === 14) return { emoji: '❤️',  label: "Valentine's Day",  q: "What relationship in your life deserves the most intentional love and attention today?" }
  if (m === 2  && d === 17) return { emoji: '🍀', label: "St. Patrick's Day", q: "How much of where you are is luck — and how much is something you built?" }
  if (m === 3  && d === 22) return { emoji: '🌍', label: "Earth Day",          q: "What's one thing you can do today that's good for something bigger than yourself?" }
  if (m === 4  && d === 5)  return { emoji: '✊', label: "Cinco de Mayo",      q: "What challenge have you been pushing through that deserves to be acknowledged today?" }
  if (m === 5  && d === 19) return { emoji: '✊🏿', label: "Juneteenth",       q: "What does real freedom look like in your life — and where are you still working toward it?" }
  if (m === 6  && d === 4)  return { emoji: '🇺🇸', label: "Independence Day", q: "Where in your life are you not yet fully free — and what's one step toward changing that today?" }
  if (m === 9  && d === 31) return { emoji: '🎃', label: "Halloween",          q: "What fear have you been wearing like a costume — and is today the day you take it off?" }
  if (m === 10 && d === 11) return { emoji: '🎖️', label: "Veterans Day",      q: "What sacrifice — big or small — have you been putting off making for something you believe in?" }
  if (m === 11 && d === 24) return { emoji: '🎄', label: "Christmas Eve",      q: "What's one meaningful thing you can give someone today that doesn't cost anything?" }
  if (m === 11 && d === 25) return { emoji: '🎁', label: "Christmas",          q: "What's the most meaningful gift you've ever received — and can you give something like that today?" }
  if (m === 11 && d === 31) return { emoji: '🥂', label: "New Year's Eve",     q: "What would you tell your January 1st self about what this year actually required of you?" }

  // Floating holidays
  if (m === 0  && d === getNthWeekday(y, 0,  1, 3)) return { emoji: '✊', label: "MLK Day",        q: "What dream — for yourself or your community — are you actually doing something about today?" }
  if (m === 4  && d === getNthWeekday(y, 4,  0, 2)) return { emoji: '💐', label: "Mother's Day",   q: "What strength did the person who raised you pass down that you're still carrying?" }
  if (m === 4  && d === getLastWeekday(y, 4, 1))    return { emoji: '🇺🇸', label: "Memorial Day",  q: "What are you doing with the freedom that others paid a price for?" }
  if (m === 5  && d === getNthWeekday(y, 5,  0, 3)) return { emoji: '👨', label: "Father's Day",   q: "What qualities from your father figure — chosen or biological — do you want to carry forward today?" }
  if (m === 8  && d === getNthWeekday(y, 8,  1, 1)) return { emoji: '💪', label: "Labor Day",      q: "What work — paid or unpaid — are you most proud of putting into the world?" }
  if (m === 10 && d === getNthWeekday(y, 10, 4, 4)) return { emoji: '🦃', label: "Thanksgiving",   q: "What's something you often overlook that, if it disappeared tomorrow, you'd feel deeply?" }

  return null
}

// Cycles through the full pool in a shuffled-but-fixed order before
// repeating, instead of locking each weekday to the same question forever
// (which is what indexing by getDay() did with only 7 entries).
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export function getTodayQod(): QodEntry {
  const today = new Date()
  const holiday = getHolidayQod(today)
  if (holiday) return holiday
  // Shift by a large odd step each year so the cycle order isn't just
  // sequential — odd + coprime with most pool lengths keeps it well-mixed.
  const index = (dayOfYear(today) * 17 + today.getFullYear()) % DAILY_QUESTIONS.length
  return DAILY_QUESTIONS[index]
}
