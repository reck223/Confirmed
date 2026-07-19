import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STYLE_NOTES: Record<string, string> = {
  comic_book: 'Marvel/DC comic book style: bold black outlines, vibrant flat colors, dynamic action poses, dramatic lighting',
  manga:      'Japanese manga style: clean expressive linework, screentone shading, large emotive eyes, speed lines for action',
  cartoon:    'Western animation style: smooth rounded shapes, bright saturated colors, expressive exaggerated faces, Disney-Pixar inspired',
  sketch:     'Pencil sketch illustration: detailed hand-drawn linework, crosshatching, artistic sketch style, black and white with subtle grey tones',
}

export async function POST(req: NextRequest) {
  try {
    const { title, genre, style, premise, characters, panelCount } = await req.json() as {
      title: string; genre: string; style: string; premise: string
      characters: { name: string; description: string; role: string }[]
      panelCount: number
    }

    const charList = characters.map(c =>
      `- ${c.name} (${c.role}): ${c.description}`
    ).join('\n')

    const styleNote = STYLE_NOTES[style] ?? STYLE_NOTES.comic_book

    const prompt = `You are a professional cartoon writer and storyboard artist. Create a complete, original cartoon story.

CONCEPT:
Title: ${title || 'Untitled'}
Genre: ${genre}
Art Style: ${style} — ${styleNote}
Premise: ${premise}
Characters:
${charList}

Create exactly ${panelCount} panels that tell a complete story with a clear beginning, middle, and end.

Return ONLY valid JSON (no markdown, no explanation, no code blocks) with this exact structure:
{
  "title": "Final cartoon title",
  "logline": "One compelling sentence",
  "story_summary": "2-3 sentences summarizing the full arc",
  "panels": [
    {
      "panel_number": 1,
      "scene_title": "Scene name",
      "setting": "Specific visual setting description for image generation",
      "action": "What physically happens in this panel",
      "characters_present": ["name1"],
      "dialogue": [{"character": "name1", "text": "What they say"}],
      "image_prompt": "Detailed AI image prompt: exact setting, character positions/expressions/clothing (include full physical description from character list), lighting, mood, camera angle, ${styleNote}. No dialogue text in prompt. Cinematic composition."
    }
  ]
}

Make the story compelling. Dialogue should be natural. Image prompts must include character physical descriptions for visual consistency across panels.`

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const json = JSON.parse(raw)
    return NextResponse.json(json)
  } catch (e) {
    console.error('Cartoon generate error:', e)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
