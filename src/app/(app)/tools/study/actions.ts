'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTransaction(
  txnDate: string,
  amount: number,
  type: 'income' | 'expense',
  category: string,
  description: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('budget_transactions') as any).insert({
    user_id: user.id, txn_date: txnDate, amount, type, category,
    description: description || null,
  })
  revalidatePath('/tools/study')
  revalidatePath('/tools')
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('budget_transactions') as any)
    .delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/tools/study')
  revalidatePath('/tools')
}
