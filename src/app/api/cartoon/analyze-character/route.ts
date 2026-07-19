import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json() as {
      image: string       // base64 data
      mediaType: string   // image/jpeg | image/png | image/webp
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: image },
          },
          {
            type: 'text',
            text: 'Describe this character\'s visual appearance for AI image generation. Be specific and detailed. Include: hair (color, length, style), skin tone, eye color, facial features, body build, clothing style and colors, any accessories or distinctive features. Write as a single flowing description, 2-3 sentences max. No preamble, just the description.',
          },
        ],
      }],
    })

    const description = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ description })
  } catch (e) {
    console.error('analyze-character error:', e)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
