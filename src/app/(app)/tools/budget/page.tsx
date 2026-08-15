import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetClient } from './BudgetClient'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today = new Date()
  const year  = today.getFullYear()
  const month = today.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  // Fetch last 12 months for context
  const since = new Date(today); since.setMonth(since.getMonth() - 11)
  const sinceStr = since.toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: txnRows } = await (supabase.from('budget_transactions') as any)
    .select('id, txn_date, amount, type, category, description, created_at')
    .eq('user_id', user.id)
    .gte('txn_date', sinceStr)
    .order('txn_date', { ascending: false })

  type TxnRow = {
    id: string; txn_date: string; amount: number; type: 'income' | 'expense'
    category: string; description: string | null; created_at: string
  }

  const transactions = (txnRows ?? []) as TxnRow[]

  return <BudgetClient transactions={transactions} currentMonth={monthStr} today={today.toISOString().split('T')[0]} />
}
