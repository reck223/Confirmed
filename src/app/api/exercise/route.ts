import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// free-exercise-db ships a single index of ~870 exercises with real photos,
// instructions, muscles, difficulty, and equipment for every one of them —
// no API key, no rate limit. Fuzzy-matching against this whole index (instead
// of a small hand-maintained name→id dictionary) is what makes AI-generated
// exercise names resolve to a real demo instead of just showing plain text.
const INDEX_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMG_BASE   = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

type FreeExercise = {
  name: string
  level: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  images: string[]
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Squashed (no spaces at all) form catches cases normalize() alone misses —
// e.g. "Push-ups" -> "push ups" doesn't match the DB's "Pushups" -> "pushups"
// under plain normalize(), but both squash to "pushups". Checked before the
// token-overlap fallback so an exact-but-differently-spaced name always
// wins over a same-topic-but-wrong exercise (e.g. "Handstand Push-Ups").
function squash(s: string): string {
  return normalize(s).replace(/ /g, '')
}

function findBestMatch(name: string, exercises: FreeExercise[]): FreeExercise | null {
  const target = normalize(name)
  if (!target) return null

  const exact = exercises.find(e => normalize(e.name) === target)
  if (exact) return exact

  const targetSquashed = squash(name)
  const squashedExact = exercises.find(e => squash(e.name) === targetSquashed)
  if (squashedExact) return squashedExact

  const targetTokens = new Set(target.split(' ').filter(Boolean))
  const substringMatches = exercises.filter(e => {
    const n = normalize(e.name)
    return n.includes(target) || target.includes(n)
  })
  if (substringMatches.length > 0) {
    substringMatches.sort((a, b) => normalize(a.name).length - normalize(b.name).length)
    return substringMatches[0]
  }

  let best: FreeExercise | null = null
  let bestScore = 0
  for (const e of exercises) {
    const tokens = new Set(normalize(e.name).split(' ').filter(Boolean))
    const overlap = [...targetTokens].filter(t => tokens.has(t)).length
    const score = overlap / Math.max(targetTokens.size, tokens.size, 1)
    if (score > bestScore) { bestScore = score; best = e }
  }
  return bestScore >= 0.5 ? best : null
}

const DIFFICULTY_MAP: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Advanced',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ images: null }, { status: 401 })

  const name = req.nextUrl.searchParams.get('name') ?? ''
  if (!name) {
    return NextResponse.json({ images: null }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  let match: FreeExercise | null = null
  try {
    const res = await fetch(INDEX_URL, { next: { revalidate: 86400 } })
    if (res.ok) {
      const all = await res.json() as FreeExercise[]
      match = findBestMatch(name, all)
    }
  } catch {
    // index unavailable — fall through with no match
  }

  // Secondary enrichment: ExerciseDB has better prose descriptions than
  // free-exercise-db's instructions-only format, when it has this exercise.
  let description: string | null = null
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(name.toLowerCase())}?limit=1`,
      {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
        },
        next: { revalidate: 86400 },
      }
    )
    if (res.ok) {
      const data = await res.json()
      description = data?.[0]?.description ?? null
    }
  } catch {
    // ExerciseDB unavailable — free-exercise-db data still works
  }

  if (!match) {
    return NextResponse.json(
      { images: null, description, instructions: null, muscles: null, secondary: null, difficulty: null, equipment: null },
      { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } }
    )
  }

  return NextResponse.json(
    {
      images: match.images.map(p => `${IMG_BASE}/${p}`),
      description,
      instructions: match.instructions,
      muscles: match.primaryMuscles,
      secondary: match.secondaryMuscles,
      difficulty: DIFFICULTY_MAP[match.level] ?? null,
      equipment: match.equipment,
    },
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } }
  )
}
