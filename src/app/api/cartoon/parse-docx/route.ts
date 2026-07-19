import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as typeof import('mammoth')

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'txt') {
      const text = await file.text()
      return NextResponse.json({ text, images: [] })
    }

    if (ext === 'docx' || ext === 'doc') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const images: string[] = []

      // Extract images via convertToHtml with Promise-based callback (not async/await)
      await mammoth.convertToHtml(
        { buffer },
        {
          convertImage: mammoth.images.imgElement(function (image) {
            return image.read('base64').then(function (b64) {
              images.push(`data:${image.contentType};base64,${b64}`)
              return { src: `data:${image.contentType};base64,${b64}` }
            })
          }),
        }
      )

      // Extract text separately for cleaner output
      const textResult = await mammoth.extractRawText({ buffer })
      return NextResponse.json({ text: textResult.value ?? '', images })
    }

    return NextResponse.json(
      { error: 'Unsupported file type. Please use .docx or .txt' },
      { status: 400 }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('parse-docx error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
