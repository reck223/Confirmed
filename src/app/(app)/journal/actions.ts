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
    const g1 = (formData.get('g1') as string)?.trim() || ''
    if (!g1) return { error: 'Add at least one thing you\'re grateful for' }
    content = {
      g1,
      g2: (formData.get('g2') as string)?.trim() || '',
      g3: (formData.get('g3') as string)?.trim() || '',
      win: (formData.get('win') as string)?.trim() || '',
      lookForward: (formData.get('lookForward') as string)?.trim() || '',
    }
  } else if (type === 'write') {
    const body = (formData.get('body') as string)?.trim() || ''
    if (!body) return { error: 'Write something before saving' }
    content = {
      body,
      mood: (formData.get('mood') as string) || '',
    }
  } else if (type === 'cbt') {
    const thought = (formData.get('thought') as string)?.trim() || ''
    if (!thought) return { error: 'Describe the thought to examine' }
    content = {
      situation: (formData.get('situation') as string)?.trim() || '',
      thought,
      distortions: (formData.get('distortions') as string) || '',
      emotion: (formData.get('emotion') as string)?.trim() || '',
      intensity: (formData.get('intensity') as string) || '5',
      evidenceFor: (formData.get('evidenceFor') as string)?.trim() || '',
      evidenceAgainst: (formData.get('evidenceAgainst') as string)?.trim() || '',
      balanced: (formData.get('balanced') as string)?.trim() || '',
      outcome: (formData.get('outcome') as string) || '5',
    }
  } else if (type === 'checkin') {
    const checkin_type = (formData.get('checkin_type') as string) || 'morning'
    if (checkin_type === 'morning') {
      const intention = (formData.get('intention') as string)?.trim() || ''
      const qod_answer = (formData.get('qod_answer') as string)?.trim() || ''
      if (!intention && !qod_answer) return { error: 'Answer the question or add your intention to save.' }
      content = {
        checkin_type: 'morning',
        mood: (formData.get('mood') as string) || '',
        intention,
        task1: (formData.get('task1') as string)?.trim() || '',
        task2: (formData.get('task2') as string)?.trim() || '',
        task3: (formData.get('task3') as string)?.trim() || '',
        excited: (formData.get('excited') as string)?.trim() || '',
        qod_question: (formData.get('qod_question') as string)?.trim() || '',
        qod_answer,
      }
    } else {
      const win = (formData.get('win') as string)?.trim() || ''
      if (!win) return { error: 'Add at least one win from today' }
      content = {
        checkin_type: 'evening',
        mood: (formData.get('mood') as string) || '',
        win,
        challenge: (formData.get('challenge') as string)?.trim() || '',
        lesson: (formData.get('lesson') as string)?.trim() || '',
        energy: (formData.get('energy') as string) || '5',
      }
    }
  } else {
    return { error: 'Invalid entry type' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('journal_entries') as any).insert({
    user_id: user.id,
    type: type as 'gratitude' | 'write' | 'cbt' | 'checkin',
    content,
  })

  if (error) return { error: error.message }
  revalidatePath('/journal')
  return { success: true }
}
