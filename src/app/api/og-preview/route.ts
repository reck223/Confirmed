export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) return Response.json({})

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return Response.json({})
    const html = await res.text()

    function meta(keys: string[]) {
      for (const key of keys) {
        const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:/g, ':')
        const v = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
               ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${esc}["']`, 'i'))?.[1]
        if (v) return decode(v)
      }
      return null
    }

    let ogImage = meta(['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'])
    if (ogImage && !ogImage.startsWith('http')) {
      try { ogImage = new URL(ogImage, url).href } catch { ogImage = null }
    }

    const ogTitle  = meta(['og:title', 'twitter:title']) ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null
    const ogDesc   = meta(['og:description', 'twitter:description', 'description'])
    const siteName = meta(['og:site_name']) ?? new URL(url).hostname.replace(/^www\./, '')

    return Response.json({ ogImage, ogTitle, ogDesc, siteName })
  } catch {
    return Response.json({})
  }
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}
