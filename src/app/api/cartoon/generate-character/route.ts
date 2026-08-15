import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HfInference } from '@huggingface/inference'

export const runtime = 'nodejs'
export const maxDuration = 60

const STYLE_PROMPTS: Record<string, string> = {
  cartoon:    'western cartoon animation style, bold outlines, bright flat colors, expressive, Disney-Pixar quality',
  comic_book: 'comic book illustration, bold black outlines, vibrant flat colors, dynamic, professional comics art',
  manga:      'Japanese manga style, clean linework, large expressive eyes, anime aesthetic',
  sketch:     'pencil sketch illustration, detailed hand-drawn linework, crosshatching, black and white art',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = process.env.HF_TOKEN
  if (!token) return NextResponse.json({ error: 'HF_TOKEN not set in .env.local' }, { status: 500 })

  try {
    const { image, mediaType, description, style, pose, expression } = await req.json() as {
      image: string       // base64 data (no data: prefix)
      mediaType: string
      description: string
      style: string
      pose: string
      expression: string
    }

    const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cartoon
    const prompt = [
      stylePrompt,
      description,
      pose,
      expression,
      'full character, professional illustration, clean art',
    ].filter(Boolean).join(', ')

    // Convert base64 to binary buffer → Blob
    const buf  = Buffer.from(image, 'base64')
    const blob = new Blob([buf], { type: mediaType })

    const hf = new HfInference(token)

    const output = await hf.imageToImage({
      model: 'timbrooks/instruct-pix2pix',
      inputs: blob,
      parameters: {
        prompt,
        negative_prompt: 'ugly, blurry, deformed, extra limbs, text, watermark, low quality',
        num_inference_steps: 25,
        image_guidance_scale: 1.2,
        guidance_scale: 7.5,
      } as Record<string, unknown>,
    })

    // output is a Blob — convert to base64
    const outBuf  = Buffer.from(await output.arrayBuffer())
    const outB64  = outBuf.toString('base64')
    const outMime = output.type || 'image/png'

    return NextResponse.json({ image: `data:${outMime};base64,${outB64}` })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('generate-character error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
