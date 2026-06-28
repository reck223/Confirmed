export type QodEntry = { emoji: string; label: string; q: string }

const DAILY_QUESTIONS: QodEntry[] = [
  { emoji: '🌅', label: 'Intention',   q: "What's one thing you want to feel proud of by the end of today?" },
  { emoji: '🎯', label: 'Clarity',     q: "What's the one thing that, if done today, would make everything else easier?" },
  { emoji: '🪞', label: 'Honesty',     q: "What are you avoiding right now — and what would it take to face it today?" },
  { emoji: '💡', label: 'Mindset',     q: "What story or belief might hold you back today? Is it actually true?" },
  { emoji: '🔥', label: 'Drive',       q: "What would make today feel like a win, even if nothing else went right?" },
  { emoji: '🤝', label: 'Connection',  q: "Who in your circle could use a word from you today?" },
  { emoji: '🧘', label: 'Perspective', q: "What does the best version of you do differently today?" },
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

export function getTodayQod(): QodEntry {
  const today = new Date()
  return getHolidayQod(today) ?? DAILY_QUESTIONS[today.getDay()]
}
