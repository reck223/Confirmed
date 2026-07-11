import { NextRequest, NextResponse } from 'next/server'

// Maps our exercise names → free-exercise-db IDs (images at 0.jpg and 1.jpg)
const EXERCISE_DB_IDS: Record<string, string> = {
  'Bench Press':            'Barbell_Bench_Press_-_Medium_Grip',
  'Overhead Press':         'Seated_Barbell_Military_Press',
  'Incline Dumbbell Press': 'Incline_Dumbbell_Press',
  'Tricep Dips':            'Parallel_Bar_Dip',
  'Push-ups':               'Pushups',
  'Cable Flyes':            'Flat_Bench_Cable_Flyes',
  'Lateral Raises':         'Cable_Seated_Lateral_Raise',
  'Skull Crushers':         'Band_Skull_Crusher',
  'Deadlift':               'Barbell_Deadlift',
  'Pull-ups':               'Pullups',
  'Bent-over Rows':         'Reverse_Grip_Bent-Over_Rows',
  'Lat Pulldown':           'Close-Grip_Front_Lat_Pulldown',
  'Face Pulls':             'Face_Pull',
  'Bicep Curls':            'Barbell_Curl',
  'Hammer Curls':           'Cable_Hammer_Curls_-_Rope_Attachment',
  'Cable Rows':             'Elevated_Cable_Rows',
  'Squats':                 'Barbell_Squat',
  'Romanian Deadlift':      'Romanian_Deadlift',
  'Leg Press':              'Leg_Press',
  'Lunges':                 'Dumbbell_Lunges',
  'Leg Extensions':         'Leg_Extensions',
  'Hamstring Curls':        'Seated_Band_Hamstring_Curl',
  'Calf Raises':            'Calf_Raises_-_With_Bands',
  'Hip Thrusts':            'Barbell_Hip_Thrust',
  'Plank':                  'Plank',
  'Russian Twists':         'Cable_Russian_Twists',
  'Hanging Leg Raises':     'Hanging_Leg_Raise',
  'Dips':                   'Parallel_Bar_Dip',
  'Battle Ropes':           'Battling_Ropes',
  'Sled Push':              'Sled_Push',
  'Running':                'Running_Treadmill',
  'Rowing':                 'Rowing_Stationary',
  'Jump Rope':              'Rope_Jumping',
}

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? ''
  const id = EXERCISE_DB_IDS[name]

  if (!id) {
    return NextResponse.json({ images: null }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  // Also enrich with ExerciseDB data if available
  let exerciseData = null
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
      if (data?.[0]) exerciseData = data[0]
    }
  } catch {
    // ExerciseDB unavailable — images still work
  }

  return NextResponse.json(
    {
      images: [`${BASE}/${id}/0.jpg`, `${BASE}/${id}/1.jpg`],
      description: exerciseData?.description ?? null,
      instructions: exerciseData?.instructions ?? null,
    },
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } }
  )
}
