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
    const { script, style, panelCount } = await req.json() as {
      script: string
      style: string
      panelCount: number
    }

    const styleNote = STYLE_NOTES[style] ?? STYLE_NOTES.comic_book

    const prompt = `You are a professional cartoon storyboard artist. The user has provided an existing story, script, or cartoon concept from a document. Convert it into a structured cartoon panel format.

EXISTING CONTENT:
---
${script.slice(0, 6000)}
---

ART STYLE: ${style} — ${styleNote}
TARGET PANEL COUNT: ${panelCount}

Your job:
1. Extract or infer the title, characters, and story from the provided content
2. If the content already has scenes/panels defined, adapt them (combining or splitting to hit ~${panelCount} panels)
3. If it's just a story or script, break it into ${panelCount} visual panels
4. Write rich image prompts for each panel that include character physical descriptions (infer reasonable ones if not described) for visual consistency
5. Preserve all existing dialogue verbatim where possible

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "title": "The cartoon title (extract from content or infer)",
  "logline": "One compelling sentence describing the story",
  "story_summary": "2-3 sentences summarizing the full arc",
  "panels": [
    {
      "panel_number": 1,
      "scene_title": "Scene name",
      "setting": "Specific visual setting for image generation",
      "action": "What physically happens in this panel",
      "characters_present": ["character names"],
      "dialogue": [{"character": "Name", "text": "What they say"}],
      "image_prompt": "Detailed AI image prompt including character physical descriptions, setting, lighting, mood, camera angle, ${styleNote}. No dialogue in prompt."
    }
  ]
}`

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const json = JSON.parse(raw)
    return NextResponse.json(json)
  } catch (e) {
    console.error('Cartoon import error:', e)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
