import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()

    // Plain text file
    if (ext === 'txt') {
      const text = await file.text()
      return NextResponse.json({ text, images: [] })
    }

    // docx
    if (ext === 'docx' || ext === 'doc') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const buffer  = Buffer.from(await file.arrayBuffer())
      const images: string[] = []

      await mammoth.convertToHtml(
        { buffer },
        {
          convertImage: mammoth.images.imgElement(async (image: { read: (enc: string) => Promise<string>; contentType: string }) => {
            const b64 = await image.read('base64')
            images.push(`data:${image.contentType};base64,${b64}`)
            return { src: '' }
          }),
        }
      )

      const textResult = await mammoth.extractRawText({ buffer })
      return NextResponse.json({ text: textResult.value as string, images })
    }

    return NextResponse.json({ error: 'Unsupported file type. Please use .docx or .txt' }, { status: 400 })
  } catch (e) {
    console.error('parse-docx error:', e)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
