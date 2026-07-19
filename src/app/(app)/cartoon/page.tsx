import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { CartoonClient } from './CartoonClient'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export default async function CartoonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.email !== CREATOR_EMAIL) redirect('/home')

  return <CartoonClient />
}
