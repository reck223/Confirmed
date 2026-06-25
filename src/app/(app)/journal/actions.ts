'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createJournalEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const type = formData.get('type') as string
  let content: Record<string, string> = {}

  if (type === 'gratitude') {
    content = {
      one: (formData.get('one') as string)?.trim() || '',
      two: (formData.get('two') as string)?.trim() || '',
      three: (formData.get('three') as string)?.trim() || '',
    }
    if (!content.one) return { error: 'Add at least one thing you\'re grateful for' }
  } else if (type === 'write') {
    content = { body: (formData.get('body') as string)?.trim() || '' }
    if (!content.body) return { error: 'Write something before saving' }
  } else if (type === 'cbt') {
    content = {
      thought: (formData.get('thought') as string)?.trim() || '',
      evidence_for: (formData.get('evidence_for') as string)?.trim() || '',
      evidence_against: (formData.get('evidence_against') as string)?.trim() || '',
      balanced: (formData.get('balanced') as string)?.trim() || '',
    }
    if (!content.thought) return { error: 'Describe the thought to examine' }
  } else {
    return { error: 'Invalid entry type' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('journal_entries') as any).insert({
    user_id: user.id,
    type: type as 'gratitude' | 'write' | 'cbt',
    content,
  })

  if (error) return { error: error.message }
  revalidatePath('/journal')
  return { success: true }
}
