'use server'

export async function generateMilestones(
  title: string,
  category: string,
  deadline: string,
): Promise<{ milestones: string[]; error?: string }> {
  if (!title.trim()) return { milestones: [], error: 'Enter a goal title first' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    return { milestones: [], error: 'API key not set — add ANTHROPIC_API_KEY in Vercel dashboard' }
  }

  const deadlineText = deadline
    ? `The target deadline is ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
    : 'No specific deadline set.'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are helping someone break down a goal into clear, actionable milestones.

Goal: "${title}"
Category: ${category || 'General'}
${deadlineText}

Generate exactly 5 milestones that progress logically from start to completion. Each milestone should be:
- A specific, concrete action or checkpoint (not vague)
- Short (under 10 words)
- In order from first to last step

Respond with ONLY a JSON array of 5 strings. No explanation, no markdown, no extra text. Example format:
["Research and define the scope", "Complete initial planning phase", "Finish first draft", "Review and refine", "Final completion and launch"]`,
        }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { milestones: [], error: `API ${res.status}: ${body.slice(0, 120)}` }
    }

    const data = await res.json() as { content: { type: string; text: string }[] }
    const text = data.content?.[0]?.text?.trim() ?? ''

    let milestones: string[]
    try {
      milestones = JSON.parse(text)
    } catch {
      return { milestones: [], error: 'Could not parse AI response. Try again.' }
    }

    if (!Array.isArray(milestones) || milestones.length === 0) {
      return { milestones: [], error: 'Unexpected AI response. Try again.' }
    }

    return { milestones: milestones.slice(0, 5) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { milestones: [], error: `Request failed: ${msg}` }
  }
}
