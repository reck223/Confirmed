import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssessForm } from './AssessForm'
import type { Assessment } from '@/lib/types/database'

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day
  const sunday = new Date(now)
  sunday.setDate(diff)
  return sunday.toISOString().split('T')[0]
}

export default async function AssessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const weekStart = getWeekStart()

  const { data } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  const existing = data as Assessment | null

  return (
    <div className="max-w-[600px] mx-auto px-5 py-8">
      <div className="mb-8">
        <p className="text-[9px] font-black tracking-[0.14em] text-[#D4AF37] mb-1">WEEKLY REFLECTION</p>
        <h1 className="text-3xl font-black text-[#EFEFEF] tracking-tight">
          {existing ? 'This Week\'s Reflection' : 'Reflect on Your Week'}
        </h1>
        <p className="text-sm text-[#555] mt-1">Week of {weekStart}</p>
      </div>

      {existing ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5">
            <div className="text-4xl font-black text-[#D4AF37]">{existing.rating}</div>
            <div>
              <p className="text-xs font-black text-[#D4AF37]">YOUR RATING</p>
              <p className="text-sm text-[#555]">
                {(existing.rating ?? 0) <= 3 ? 'Rough week' : (existing.rating ?? 0) <= 6 ? 'Decent week' : (existing.rating ?? 0) <= 8 ? 'Strong week' : 'Incredible week'}
              </p>
            </div>
          </div>

          {existing.wins && <ReadField label="WINS" content={existing.wins} />}
          {existing.challenges && <ReadField label="CHALLENGES" content={existing.challenges} />}
          {existing.lessons && <ReadField label="LESSONS" content={existing.lessons} />}
          {existing.intentions && <ReadField label="INTENTIONS FOR NEXT WEEK" content={existing.intentions} />}
          {existing.gratitude && <ReadField label="GRATITUDE" content={existing.gratitude} />}

          <p className="text-xs text-[#555] text-center mt-2">
            Submitted · Come back next Sunday for your next reflection
          </p>
        </div>
      ) : (
        <AssessForm weekStart={weekStart} />
      )}
    </div>
  )
}

function ReadField({ label, content }: { label: string; content: string }) {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-2">{label}</p>
      <p className="text-sm text-[#EFEFEF]/80 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}
