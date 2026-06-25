import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Goal } from '@/lib/types/database'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const profile = profileData as Profile | null
  const goals = (goalsData as Goal[] | null) ?? []

  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'

  return (
    <div className="max-w-[560px] mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#EFEFEF] tracking-tight">
            {greeting()}, {firstName}.
          </h1>
          <p className="text-sm text-[#555] font-light mt-1">
            {profile?.streak ?? 0}-week streak · {goals.length} active {goals.length === 1 ? 'goal' : 'goals'}
          </p>
        </div>
        <Link href="/profile" className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-sm font-black text-[#D4AF37]">
          {(profile?.full_name ?? user.email ?? 'A').charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* No goals yet */}
      {goals.length === 0 && (
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/4 p-6 mb-5">
          <p className="text-[9px] font-black tracking-[0.14em] text-[#D4AF37] mb-3">YOUR FIRST STEP</p>
          <h3 className="text-xl font-black text-[#EFEFEF] mb-2">What&apos;s the one thing you want to make real?</h3>
          <p className="text-sm text-[#666] font-light mb-5">Your streak starts when you set your first goal.</p>
          <Link href="/goals" className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider text-center">
            ADD YOUR FIRST GOAL →
          </Link>
        </div>
      )}

      {/* Do Today */}
      {goals.length > 0 && (
        <div className="mb-5">
          <p className="text-[9px] font-black tracking-[0.14em] text-[#D4AF37] mb-3">DO TODAY</p>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {goals.slice(0, 3).map((goal, i) => (
              <Link
                key={goal.id}
                href="/goals"
                className={`flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors ${i < Math.min(goals.length, 3) - 1 ? 'border-b border-white/[0.04]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#EFEFEF] truncate">{goal.next_action ?? goal.title}</p>
                  {goal.next_action && <p className="text-xs text-[#555] truncate mt-0.5">{goal.title}</p>}
                </div>
                <span className="text-xs font-black text-[#D4AF37] flex-shrink-0">{goal.progress}%</span>
              </Link>
            ))}
          </div>
          {goals.length > 3 && (
            <Link href="/goals" className="block text-center text-xs text-[#555] mt-3 hover:text-[#EFEFEF]">
              +{goals.length - 3} more goals →
            </Link>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickCard href="/assess" emoji="📊" label="Weekly Reflection" sub="Rate your week" />
        <QuickCard href="/circle" emoji="👥" label="Your Circle" sub="See what's happening" />
        <QuickCard href="/journal" emoji="📖" label="Journal" sub="Reflect & reframe" />
        <QuickCard href="/goals" emoji="🎯" label="Goals" sub={`${goals.length} active`} />
      </div>
    </div>
  )
}

function QuickCard({ href, emoji, label, sub }: { href: string; emoji: string; label: string; sub: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.1] hover:bg-white/[0.04] transition-colors">
      <p className="text-2xl mb-2">{emoji}</p>
      <p className="text-sm font-bold text-[#EFEFEF]">{label}</p>
      <p className="text-xs text-[#555] mt-0.5">{sub}</p>
    </Link>
  )
}
