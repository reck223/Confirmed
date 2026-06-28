import { NextRequest, NextResponse } from 'next/server'

type Book = { id: string; title: string; author: string; cover: string | null; year: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromOpenLibrary(doc: any): Book {
  return {
    id: doc.key ?? doc.title,
    title: doc.title ?? '',
    author: (doc.author_name ?? []).slice(0, 2).join(', '),
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    year: doc.first_publish_year ? String(doc.first_publish_year) : '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromITunes(item: any): Book {
  const cover = item.artworkUrl100
    ? (item.artworkUrl100 as string).replace('100x100bb', '300x300bb')
    : null
  return {
    id: String(item.trackId ?? item.trackName),
    title: item.trackName ?? '',
    author: item.artistName ?? '',
    cover,
    year: item.releaseDate ? String(new Date(item.releaseDate).getFullYear()) : '',
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  // Try Open Library first
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=7&fields=key,title,author_name,first_publish_year,cover_i`,
      { next: { revalidate: 60 } }
    )
    if (res.ok) {
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const books: Book[] = (data.docs ?? []).map(fromOpenLibrary).filter((b: Book) => b.title)
      if (books.length > 0) return NextResponse.json(books)
    }
  } catch { /* fall through to iTunes */ }

  // Fall back to iTunes Books API (always available, no key needed)
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=ebook&limit=7&country=us`,
      { next: { revalidate: 60 } }
    )
    if (res.ok) {
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const books: Book[] = (data.results ?? []).map(fromITunes).filter((b: Book) => b.title)
      return NextResponse.json(books)
    }
  } catch { /* give up */ }

  return NextResponse.json([])
}
