import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Look up the circle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: circleRaw } = await (supabase.from('circles') as any)
    .select('id, name, code')
    .eq('code', code.toUpperCase())
    .single()
  const circle = circleRaw as { id: string; name: string; code: string } | null

  if (!circle) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', marginBottom: 8 }}>Circle not found</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginBottom: 24 }}>This invite code doesn&apos;t exist or has expired.</p>
          <Link href="/" style={{ color: '#D4AF37', fontWeight: 700, fontSize: 13 }}>Go to Confirmed Creations →</Link>
        </div>
      </div>
    )
  }

  // If logged in, join automatically and redirect
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: alreadyMember } = await (supabase.from('circle_members') as any)
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single()

    if (!alreadyMember) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('circle_members') as any).insert({ circle_id: circle.id, user_id: user.id })
    }
    redirect('/circle')
  }

  // Get member count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('circle_members') as any)
    .select('*', { count: 'exact', head: true })
    .eq('circle_id', circle.id)

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <Image src="/brandlogo.png" alt="Confirmed Creations" width={1536} height={1024}
            style={{ width: 'min(70vw, 280px)', height: 'auto', filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.4))' }} priority />
        </div>

        {/* Invite card */}
        <div style={{ background: 'linear-gradient(145deg,#18140A,#0F0C03)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg,#D4AF37,#9A7010)' }} />
          <div style={{ padding: '28px 24px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 8 }}>YOU&apos;VE BEEN INVITED</p>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>{circle.name}</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 300, marginBottom: 20 }}>
              {count ?? 0} {count === 1 ? 'member' : 'members'} holding each other accountable.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>INVITE CODE</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.3em' }}>{circle.code}</p>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.6 }}>
              Create an account to join this circle. Your goals, your word, your people.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <Link href={`/signup?joinCode=${circle.code}`} style={{ display: 'block', width: '100%', padding: '15px', borderRadius: 14, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em', textAlign: 'center', textDecoration: 'none', marginBottom: 10 }}>
          Create Account & Join →
        </Link>
        <Link href={`/signin?joinCode=${circle.code}`} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.58)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textAlign: 'center', textDecoration: 'none' }}>
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}
