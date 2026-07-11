'use client'
import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { saveWorkoutSession, deleteWorkoutSession, saveTemplate, deleteTemplate, logBodyWeight } from './actions'
import { generateWorkoutPlan } from './aiActions'

// ── Types ────────────────────────────────────────────────────────────────────
type SetRow   = { id: string; set_number: number; reps: number | null; weight_lbs: number | null; duration_mins: number | null }
type ExRow    = { id: string; name: string; sets: SetRow[] }
type Session  = { id: string; name: string; date: string; duration_mins: number | null; goal_id: string | null; goalTitle: string | null; exercises: ExRow[] }
type Goal     = { id: string; title: string; category: string | null }
type SetEntry = { id: string; reps: string; weight: string; duration: string; done: boolean }
type ExEntry  = { id: string; name: string; isCardio: boolean; sets: SetEntry[] }
type TplEx    = { name: string; isCardio: boolean; sets: { reps: number | null; weightLbs: number | null; durationMins: number | null }[] }
type Template = { id: string; name: string; exercises: TplEx[] }
type BwLog    = { date: string; weight_lbs: number }

type Props = {
  sessions: Session[]
  prs: Record<string, number>
  goals: Goal[]
  templates: Template[]
  bwLogs: BwLog[]
  today: string
}

// ── Constants ────────────────────────────────────────────────────────────────
const PRESETS = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body', 'Cardio', 'Core', 'Active Recovery']
const SUGGESTIONS: Record<string, string[]> = {
  push:  ['Bench Press','Overhead Press','Incline Dumbbell Press','Tricep Dips','Push-ups','Cable Flyes','Lateral Raises','Skull Crushers'],
  pull:  ['Deadlift','Pull-ups','Bent-over Rows','Lat Pulldown','Face Pulls','Bicep Curls','Hammer Curls','Cable Rows'],
  legs:  ['Squats','Romanian Deadlift','Leg Press','Lunges','Leg Extensions','Hamstring Curls','Calf Raises','Hip Thrusts'],
  cardio:['Running','Cycling','Rowing','Jump Rope','Stair Climber','Elliptical','Swimming','HIIT'],
  other: ['Plank','Russian Twists','Ab Wheel','Hanging Leg Raises','Dips','Muscle-ups','Battle Ropes','Sled Push'],
}
const ALL_SUGGESTIONS = [...new Set(Object.values(SUGGESTIONS).flat())]

// Equipment classification for each exercise
type EquipmentType = 'barbell' | 'dumbbell' | 'bodyweight' | 'cable' | 'machine'
const EXERCISE_EQUIPMENT: Record<string, EquipmentType[]> = {
  // Barbell
  'Bench Press':            ['barbell'],
  'Overhead Press':         ['barbell', 'dumbbell'],
  'Skull Crushers':         ['barbell'],
  'Deadlift':               ['barbell'],
  'Bent-over Rows':         ['barbell', 'dumbbell'],
  'Squats':                 ['barbell', 'bodyweight'],
  'Romanian Deadlift':      ['barbell', 'dumbbell'],
  'Hip Thrusts':            ['barbell', 'dumbbell'],
  'Good Mornings':          ['barbell'],
  'Barbell Shrugs':         ['barbell', 'dumbbell'],
  'Close-Grip Bench Press': ['barbell'],
  'Sumo Deadlift':          ['barbell'],
  // Dumbbell
  'Incline Dumbbell Press': ['dumbbell'],
  'Dumbbell Flyes':         ['dumbbell'],
  'Lateral Raises':         ['dumbbell'],
  'Reverse Flyes':          ['dumbbell'],
  'Arnold Press':           ['dumbbell'],
  'Bicep Curls':            ['barbell', 'dumbbell'],
  'Hammer Curls':           ['dumbbell'],
  'Concentration Curls':    ['dumbbell'],
  'Zottman Curls':          ['dumbbell'],
  'Tricep Kickbacks':       ['dumbbell'],
  'Dumbbell Row':           ['dumbbell'],
  'Dumbbell Pullover':      ['dumbbell'],
  'Goblet Squat':           ['dumbbell'],
  'Bulgarian Split Squat':  ['dumbbell', 'bodyweight'],
  'Single-leg RDL':         ['dumbbell'],
  'Dumbbell Lunges':        ['dumbbell'],
  // Bodyweight
  'Push-ups':               ['bodyweight'],
  'Diamond Push-ups':       ['bodyweight'],
  'Pike Push-ups':          ['bodyweight'],
  'Tricep Dips':            ['bodyweight'],
  'Dips':                   ['bodyweight'],
  'Pull-ups':               ['bodyweight'],
  'Inverted Rows':          ['bodyweight'],
  'Glute Bridges':          ['bodyweight'],
  'Glute Kickbacks':        ['bodyweight'],
  'Mountain Climbers':      ['bodyweight'],
  'Burpees':                ['bodyweight'],
  'Box Jumps':              ['bodyweight'],
  'Plank':                  ['bodyweight'],
  'Side Plank':             ['bodyweight'],
  'Russian Twists':         ['bodyweight'],
  'Bicycle Crunches':       ['bodyweight'],
  'V-Ups':                  ['bodyweight'],
  'Crunches':               ['bodyweight'],
  'Ab Wheel':               ['bodyweight'],
  'Hanging Leg Raises':     ['bodyweight'],
  'Superman':               ['bodyweight'],
  'Battle Ropes':           ['bodyweight'],
  'Running':                ['bodyweight'],
  'Sprints':                ['bodyweight'],
  'Jump Rope':              ['bodyweight'],
  'Lunges':                 ['dumbbell', 'bodyweight'],
  'Calf Raises':            ['machine', 'bodyweight'],
  'Squats (bodyweight)':    ['bodyweight'],
  // Cable
  'Cable Flyes':            ['cable'],
  'Lat Pulldown':           ['cable', 'machine'],
  'Face Pulls':             ['cable'],
  'Cable Rows':             ['cable'],
  'Tricep Pushdowns':       ['cable'],
  'Cable Bicep Curls':      ['cable'],
  // Machine
  'Leg Press':              ['machine'],
  'Leg Extensions':         ['machine'],
  'Hamstring Curls':        ['machine'],
  'Rowing':                 ['machine'],
  'Cycling':                ['machine', 'bodyweight'],
  'Stair Climber':          ['machine'],
  'Elliptical':             ['machine'],
  'Sled Push':              ['machine'],
}

const EQUIPMENT_OPTIONS: { id: EquipmentType; label: string; icon: string }[] = [
  { id: 'barbell',    label: 'Barbell',    icon: '🏋️' },
  { id: 'dumbbell',   label: 'Dumbbells',  icon: '💪' },
  { id: 'bodyweight', label: 'Bodyweight', icon: '🤸' },
  { id: 'cable',      label: 'Cables',     icon: '📟' },
  { id: 'machine',    label: 'Machines',   icon: '⚙️' },
]

// Visual identity per training type
type TypeStyle = { from: string; to: string; border: string; glow: string; text: string; bg: string; icon: string }
const TYPE_STYLE: Record<string, TypeStyle> = {
  'Push Day':        { from:'#ef4444', to:'#f97316', border:'rgba(239,68,68,0.35)',  glow:'rgba(239,68,68,0.25)',  text:'#f87171', bg:'rgba(239,68,68,0.07)',  icon:'💪' },
  'Pull Day':        { from:'#6366f1', to:'#8b5cf6', border:'rgba(99,102,241,0.35)', glow:'rgba(99,102,241,0.25)', text:'#a78bfa', bg:'rgba(99,102,241,0.07)', icon:'🏋️' },
  'Leg Day':         { from:'#f97316', to:'#eab308', border:'rgba(249,115,22,0.35)', glow:'rgba(249,115,22,0.25)', text:'#fb923c', bg:'rgba(249,115,22,0.07)', icon:'🦵' },
  'Upper Body':      { from:'#ef4444', to:'#ec4899', border:'rgba(239,68,68,0.3)',   glow:'rgba(239,68,68,0.2)',   text:'#f472b6', bg:'rgba(239,68,68,0.06)',  icon:'⬆️' },
  'Lower Body':      { from:'#f97316', to:'#ef4444', border:'rgba(249,115,22,0.35)', glow:'rgba(249,115,22,0.25)', text:'#fb923c', bg:'rgba(249,115,22,0.07)', icon:'⬇️' },
  'Full Body':       { from:'#eab308', to:'#22c55e', border:'rgba(234,179,8,0.35)',  glow:'rgba(234,179,8,0.25)',  text:'#facc15', bg:'rgba(234,179,8,0.07)',  icon:'⚡' },
  'Cardio':          { from:'#22c55e', to:'#06b6d4', border:'rgba(34,197,94,0.35)',  glow:'rgba(34,197,94,0.25)',  text:'#4ade80', bg:'rgba(34,197,94,0.07)',  icon:'🏃' },
  'Core':            { from:'#eab308', to:'#f97316', border:'rgba(234,179,8,0.35)',  glow:'rgba(234,179,8,0.25)',  text:'#facc15', bg:'rgba(234,179,8,0.07)',  icon:'🎯' },
  'Glutes & Booty':  { from:'#f97316', to:'#ec4899', border:'rgba(249,115,22,0.35)', glow:'rgba(249,115,22,0.25)', text:'#fb923c', bg:'rgba(249,115,22,0.07)', icon:'🍑' },
  'Arms':            { from:'#ef4444', to:'#8b5cf6', border:'rgba(239,68,68,0.3)',   glow:'rgba(239,68,68,0.2)',   text:'#f87171', bg:'rgba(239,68,68,0.06)',  icon:'💪' },
  'Shoulders':       { from:'#8b5cf6', to:'#06b6d4', border:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.25)', text:'#c084fc', bg:'rgba(139,92,246,0.07)', icon:'🤸' },
  'Active Recovery': { from:'#22c55e', to:'#06b6d4', border:'rgba(34,197,94,0.25)',  glow:'rgba(34,197,94,0.15)',  text:'#4ade80', bg:'rgba(34,197,94,0.05)',  icon:'🧘' },
}
function getTypeStyle(types: string[]): TypeStyle {
  return TYPE_STYLE[types[0]] ?? { from:'#ef4444', to:'#f97316', border:'rgba(239,68,68,0.3)', glow:'rgba(239,68,68,0.2)', text:'#ef4444', bg:'rgba(239,68,68,0.06)', icon:'💪' }
}

// Week plan types
type PlannedExercise = { name: string; isCardio: boolean; setCount: number; reps: string; weight: string }
type PlannedDay = { name: string; types: string[]; exercises: PlannedExercise[]; restDay: boolean }
type WeekPlan = Partial<Record<number, PlannedDay>>  // 0=Mon … 6=Sun

const WEEK_DAYS = [
  { short: 'M', label: 'Mon', full: 'Monday' },
  { short: 'T', label: 'Tue', full: 'Tuesday' },
  { short: 'W', label: 'Wed', full: 'Wednesday' },
  { short: 'T', label: 'Thu', full: 'Thursday' },
  { short: 'F', label: 'Fri', full: 'Friday' },
  { short: 'S', label: 'Sat', full: 'Saturday' },
  { short: 'S', label: 'Sun', full: 'Sunday' },
]

// Exercises surfaced per session type — shown as tap-to-add chips
const PRESET_EXERCISES: Record<string, string[]> = {
  'Push Day':        ['Bench Press', 'Incline Dumbbell Press', 'Dumbbell Flyes', 'Overhead Press', 'Arnold Press', 'Lateral Raises', 'Reverse Flyes', 'Tricep Dips', 'Skull Crushers', 'Tricep Kickbacks', 'Diamond Push-ups', 'Pike Push-ups', 'Cable Flyes', 'Tricep Pushdowns', 'Close-Grip Bench Press'],
  'Pull Day':        ['Deadlift', 'Pull-ups', 'Bent-over Rows', 'Dumbbell Row', 'Inverted Rows', 'Lat Pulldown', 'Face Pulls', 'Dumbbell Pullover', 'Bicep Curls', 'Hammer Curls', 'Concentration Curls', 'Zottman Curls', 'Cable Rows', 'Cable Bicep Curls', 'Barbell Shrugs'],
  'Leg Day':         ['Squats', 'Romanian Deadlift', 'Goblet Squat', 'Bulgarian Split Squat', 'Sumo Deadlift', 'Leg Press', 'Lunges', 'Dumbbell Lunges', 'Single-leg RDL', 'Leg Extensions', 'Hamstring Curls', 'Calf Raises', 'Hip Thrusts', 'Glute Bridges', 'Glute Kickbacks', 'Good Mornings', 'Box Jumps'],
  'Upper Body':      ['Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Arnold Press', 'Pull-ups', 'Inverted Rows', 'Bent-over Rows', 'Dumbbell Row', 'Lateral Raises', 'Reverse Flyes', 'Bicep Curls', 'Hammer Curls', 'Tricep Dips', 'Skull Crushers', 'Face Pulls'],
  'Lower Body':      ['Squats', 'Romanian Deadlift', 'Goblet Squat', 'Bulgarian Split Squat', 'Leg Press', 'Lunges', 'Single-leg RDL', 'Calf Raises', 'Hip Thrusts', 'Glute Bridges', 'Glute Kickbacks', 'Hamstring Curls', 'Leg Extensions', 'Box Jumps'],
  'Full Body':       ['Squats', 'Deadlift', 'Goblet Squat', 'Bench Press', 'Overhead Press', 'Pull-ups', 'Bent-over Rows', 'Lunges', 'Bulgarian Split Squat', 'Push-ups', 'Burpees'],
  'Cardio':          ['Running', 'Sprints', 'Cycling', 'Rowing', 'Jump Rope', 'Stair Climber', 'Elliptical', 'Burpees', 'Mountain Climbers', 'Box Jumps', 'Battle Ropes'],
  'Core':            ['Plank', 'Side Plank', 'Hollow Body Hold', 'Dead Bug', 'Russian Twists', 'Bicycle Crunches', 'Crunches', 'V-Ups', 'Hanging Leg Raises', 'Ab Wheel', 'Mountain Climbers', 'Superman', 'Glute Bridges', 'Flutter Kicks'],
  'Glutes & Booty':  ['Hip Thrusts', 'Glute Bridges', 'Glute Kickbacks', 'Bulgarian Split Squat', 'Single-leg RDL', 'Romanian Deadlift', 'Sumo Deadlift', 'Squats', 'Goblet Squat', 'Lunges', 'Dumbbell Lunges', 'Box Jumps', 'Good Mornings'],
  'Arms':            ['Bicep Curls', 'Hammer Curls', 'Concentration Curls', 'Zottman Curls', 'Incline Curls', 'Cable Bicep Curls', 'Skull Crushers', 'Tricep Kickbacks', 'Tricep Dips', 'Diamond Push-ups', 'Tricep Pushdowns', 'Close-Grip Bench Press'],
  'Shoulders':       ['Overhead Press', 'Arnold Press', 'Lateral Raises', 'Reverse Flyes', 'Face Pulls', 'Pike Push-ups', 'Upright Rows', 'Front Raises', 'Barbell Shrugs'],
  'Active Recovery': ['Rowing', 'Cycling', 'Jump Rope', 'Running', 'Glute Bridges', 'Superman'],
}

// ── Exercise demo data ────────────────────────────────────────────────────────
type ExInfo = { muscles: string[]; secondary: string[]; tips: string[]; difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; equipment: string }
const EXERCISE_INFO: Record<string, ExInfo> = {
  'Bench Press':            { muscles: ['chest','triceps'], secondary: ['shoulders'], tips: ['Arch back, feet flat on floor','Grip 1.5–2× shoulder width','Touch chest, drive straight up','Lower 2–3 sec under control'], difficulty: 'Intermediate', equipment: 'Barbell + bench' },
  'Overhead Press':         { muscles: ['shoulders'], secondary: ['triceps','core'], tips: ['Brace core before unracking','Elbows slightly in front at start','Press in a straight line overhead','Full lockout at the top'], difficulty: 'Intermediate', equipment: 'Barbell or dumbbells' },
  'Incline Dumbbell Press': { muscles: ['chest','shoulders'], secondary: ['triceps'], tips: ['Set bench to 30–45° incline','Lower dumbbells to chest level','Drive up and slightly together','Full stretch at the bottom'], difficulty: 'Beginner', equipment: 'Dumbbells + bench' },
  'Tricep Dips':            { muscles: ['triceps'], secondary: ['chest','shoulders'], tips: ['Lean forward for more chest','Keep elbows tucked in close','Lower until upper arms parallel','Full lockout at the top'], difficulty: 'Intermediate', equipment: 'Parallel bars' },
  'Push-ups':               { muscles: ['chest','triceps'], secondary: ['shoulders','core'], tips: ['Body in a rigid straight line','Elbows at 45° from torso','Chest touches the floor','Exhale as you push up'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Cable Flyes':            { muscles: ['chest'], secondary: ['shoulders'], tips: ['Keep slight bend in elbows','Squeeze chest at peak','Control the stretch — no yanking','Cables keep constant tension'], difficulty: 'Beginner', equipment: 'Cable machine' },
  'Lateral Raises':         { muscles: ['shoulders'], secondary: [], tips: ['Lead with elbows, not hands','Stop at shoulder height','Slight forward lean helps','Control descent — same speed'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Skull Crushers':         { muscles: ['triceps'], secondary: [], tips: ['Keep upper arms vertical','Lower bar toward forehead','Full extension at the top','EZ-bar reduces wrist strain'], difficulty: 'Intermediate', equipment: 'Barbell or EZ bar' },
  'Deadlift':               { muscles: ['back','hamstrings','glutes'], secondary: ['core','quads'], tips: ['Bar over mid-foot, hip-width','Hinge hips, neutral spine','Brace hard before the pull','Drive floor away — no yanking'], difficulty: 'Advanced', equipment: 'Barbell' },
  'Pull-ups':               { muscles: ['back','biceps'], secondary: ['shoulders'], tips: ['Start from a dead hang','Pull elbows toward hip pockets','Chin clears bar at the top','Lower slowly for max activation'], difficulty: 'Intermediate', equipment: 'Pull-up bar' },
  'Bent-over Rows':         { muscles: ['back'], secondary: ['biceps','core'], tips: ['Hinge to ~45°, flat back','Pull bar to lower chest/belly','Squeeze shoulder blades at top','Keep bar close to your body'], difficulty: 'Intermediate', equipment: 'Barbell or dumbbells' },
  'Lat Pulldown':           { muscles: ['back','biceps'], secondary: ['shoulders'], tips: ['Lean back slightly, chest proud','Pull to upper chest, not behind neck','Elbows drive down and back','Control weight back up'], difficulty: 'Beginner', equipment: 'Cable machine' },
  'Face Pulls':             { muscles: ['shoulders','back'], secondary: [], tips: ['Set cable at face height','Pull rope toward your forehead','Elbows flare up and out wide','Externally rotate at the end'], difficulty: 'Beginner', equipment: 'Cable + rope' },
  'Bicep Curls':            { muscles: ['biceps'], secondary: [], tips: ['Elbows pinned to your sides','Full extension at the bottom','Squeeze hard at the top','Supinate wrist as you curl'], difficulty: 'Beginner', equipment: 'Dumbbells or barbell' },
  'Hammer Curls':           { muscles: ['biceps'], secondary: [], tips: ['Neutral (hammer) grip throughout','Keep elbows fixed and still','Also works the brachialis','Alternate or simultaneous'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Cable Rows':             { muscles: ['back'], secondary: ['biceps'], tips: ['Sit tall, chest up at all times','Pull handle to sternum','Elbows travel behind your back','Pause and squeeze fully'], difficulty: 'Beginner', equipment: 'Cable machine' },
  'Squats':                 { muscles: ['quads','glutes'], secondary: ['hamstrings','core','back'], tips: ['Feet shoulder-width, toes out','Break parallel if mobility allows','Drive knees out over toes','Big breath, brace before descent'], difficulty: 'Intermediate', equipment: 'Barbell or bodyweight' },
  'Romanian Deadlift':      { muscles: ['hamstrings','glutes'], secondary: ['back','core'], tips: ['Push hips back — not just bending','Bar stays close to your legs','Soft knee bend throughout','Feel hamstring stretch at bottom'], difficulty: 'Intermediate', equipment: 'Barbell or dumbbells' },
  'Leg Press':              { muscles: ['quads'], secondary: ['hamstrings','glutes'], tips: ['Do not lock knees at the top','Feet shoulder-width or wider','Lower until ~90° knee angle','Drive through your full foot'], difficulty: 'Beginner', equipment: 'Leg press machine' },
  'Lunges':                 { muscles: ['quads','glutes'], secondary: ['hamstrings','calves','core'], tips: ['Big step, back knee near floor','Front knee tracks over toe','Drive through your front heel','Keep torso upright'], difficulty: 'Beginner', equipment: 'Bodyweight or dumbbells' },
  'Leg Extensions':         { muscles: ['quads'], secondary: [], tips: ['Full extension and pause at top','Squeeze quad hard at peak','Slow controlled descent','No swinging the weight'], difficulty: 'Beginner', equipment: 'Leg extension machine' },
  'Hamstring Curls':        { muscles: ['hamstrings'], secondary: [], tips: ['Full extension before curling','Squeeze at peak contraction','Control descent fully','Do not arch lower back'], difficulty: 'Beginner', equipment: 'Curl machine' },
  'Calf Raises':            { muscles: ['calves'], secondary: [], tips: ['Full stretch at the bottom','Pause and squeeze at top','Slow tempo for growth','Single-leg for intensity'], difficulty: 'Beginner', equipment: 'Machine or bodyweight' },
  'Hip Thrusts':            { muscles: ['glutes'], secondary: ['hamstrings'], tips: ['Shoulders rest on bench edge','Drive through your heels','Squeeze glutes hard at top','Keep chin tucked throughout'], difficulty: 'Beginner', equipment: 'Barbell + bench' },
  'Plank':                  { muscles: ['core'], secondary: ['shoulders'], tips: ['Body in a perfectly straight line','Do not let hips sag or pike','Brace like bracing for a punch','Breathe steadily throughout'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Russian Twists':         { muscles: ['core'], secondary: [], tips: ['Feet off ground for challenge','Rotate whole torso, not arms','Touch ground each side','Add a plate for intensity'], difficulty: 'Beginner', equipment: 'Bodyweight or plate' },
  'Ab Wheel':               { muscles: ['core'], secondary: ['shoulders','back'], tips: ['Start on your knees','Arms stay straight throughout','Roll out slowly until near floor','Pull back with abs, not arms'], difficulty: 'Advanced', equipment: 'Ab wheel' },
  'Hanging Leg Raises':     { muscles: ['core'], secondary: [], tips: ['Dead hang — no swinging','Control movement throughout','Raise legs to at least parallel','Slow descent is the key'], difficulty: 'Intermediate', equipment: 'Pull-up bar' },
  'Dips':                   { muscles: ['triceps','chest'], secondary: ['shoulders'], tips: ['Lean forward for chest emphasis','Upright torso for tricep focus','Lower until upper arms parallel','Full lockout at the top'], difficulty: 'Intermediate', equipment: 'Parallel bars' },
  'Battle Ropes':           { muscles: ['shoulders'], secondary: ['core','back'], tips: ['Soft knees, slight squat stance','Engage core — not just arms','Alternate waves or double waves','Keep breathing rhythmically'], difficulty: 'Beginner', equipment: 'Battle ropes' },
  'Sled Push':              { muscles: ['quads','glutes'], secondary: ['hamstrings','core'], tips: ['Lean into the sled aggressively','Short powerful strides','Drive through full foot','Keep your back flat'], difficulty: 'Intermediate', equipment: 'Weighted sled' },
  'Running':                { muscles: ['quads','calves'], secondary: ['hamstrings','glutes','core'], tips: ['Land midfoot, not on heel','Arms at 90°, relaxed','Slight forward lean from ankles','Breathe in rhythm with stride'], difficulty: 'Beginner', equipment: 'Shoes / treadmill' },
  'Rowing':                 { muscles: ['back'], secondary: ['core','shoulders','quads'], tips: ['Drive with legs first','Lean back then pull arms','Handle to lower chest','Legs → body → arms sequence'], difficulty: 'Beginner', equipment: 'Rowing machine' },
  'Jump Rope':              { muscles: ['calves'], secondary: ['shoulders','core'], tips: ['Jump 1–2 inches off ground','Small wrist circles, elbows in','Land softly on balls of feet','Start with single unders'], difficulty: 'Beginner', equipment: 'Jump rope' },
  // ── New exercises ──────────────────────────────────────────────────────────
  'Dumbbell Flyes':         { muscles: ['chest'], secondary: ['shoulders'], tips: ['Slight bend in elbows throughout','Lower with control, feel the stretch','Squeeze chest hard at the top','Think hugging a barrel'], difficulty: 'Beginner', equipment: 'Dumbbells + bench' },
  'Arnold Press':           { muscles: ['shoulders'], secondary: ['triceps'], tips: ['Start with palms facing you','Rotate outward as you press','Full lockout at the top','Reverse rotation on descent'], difficulty: 'Intermediate', equipment: 'Dumbbells' },
  'Reverse Flyes':          { muscles: ['shoulders'], secondary: ['back'], tips: ['Slight forward hinge at hips','Arms wide, slight bend in elbows','Squeeze rear delts at the top','No momentum — slow and controlled'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Concentration Curls':    { muscles: ['biceps'], secondary: [], tips: ['Elbow braced on inner thigh','Full range of motion','Squeeze hard at the top','Zero body movement'], difficulty: 'Beginner', equipment: 'Dumbbell' },
  'Zottman Curls':          { muscles: ['biceps'], secondary: ['forearms'], tips: ['Curl up with palms facing up','Rotate to palms-down at top','Lower slowly in reverse grip','Best for overall arm thickness'], difficulty: 'Intermediate', equipment: 'Dumbbells' },
  'Tricep Kickbacks':       { muscles: ['triceps'], secondary: [], tips: ['Upper arm parallel to floor','Extend fully behind you','Pause at full extension','Keep elbow pinned back'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Dumbbell Row':           { muscles: ['back'], secondary: ['biceps'], tips: ['Knee and hand on bench','Pull to hip, elbow drives back','Squeeze at the top','Control the descent fully'], difficulty: 'Beginner', equipment: 'Dumbbell' },
  'Dumbbell Pullover':      { muscles: ['back'], secondary: ['chest','core'], tips: ['Lie perpendicular on bench','Arms reach behind head','Feel lats stretch at bottom','Pull arc back over chest'], difficulty: 'Intermediate', equipment: 'Dumbbell' },
  'Goblet Squat':           { muscles: ['quads','glutes'], secondary: ['core'], tips: ['Hold dumbbell at chest','Elbows inside knees at bottom','Stay upright throughout','Drive through heels to stand'], difficulty: 'Beginner', equipment: 'Dumbbell' },
  'Bulgarian Split Squat':  { muscles: ['quads','glutes'], secondary: ['hamstrings','core'], tips: ['Rear foot on bench','Front knee tracks over toe','Lower rear knee near floor','Drive through front heel'], difficulty: 'Intermediate', equipment: 'Dumbbells or bodyweight' },
  'Single-leg RDL':         { muscles: ['hamstrings','glutes'], secondary: ['back','core'], tips: ['Hinge at hip with flat back','Rear leg counterbalances','Feel deep hamstring stretch','Squeeze glute to return'], difficulty: 'Intermediate', equipment: 'Dumbbell' },
  'Dumbbell Lunges':        { muscles: ['quads','glutes'], secondary: ['hamstrings','calves'], tips: ['Step forward, back knee near floor','Front knee tracks over toe','Drive through front heel','Stay upright throughout'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Glute Bridges':          { muscles: ['glutes'], secondary: ['hamstrings','core'], tips: ['Feet flat, hip-width apart','Drive hips to ceiling','Squeeze glutes hard at top','Hold for 1–2 sec then lower'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Glute Kickbacks':        { muscles: ['glutes'], secondary: ['hamstrings'], tips: ['On all fours, core tight','Drive heel toward ceiling','Squeeze glute at full extension','Control the descent'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Diamond Push-ups':       { muscles: ['triceps'], secondary: ['chest','shoulders'], tips: ['Hands close, diamond shape','Elbows track back, not flared','Full range of motion','Harder than regular push-ups'], difficulty: 'Intermediate', equipment: 'Bodyweight' },
  'Pike Push-ups':          { muscles: ['shoulders'], secondary: ['triceps'], tips: ['Hips high in inverted V','Lower head toward floor','Push directly back up','Great shoulder press progression'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Inverted Rows':          { muscles: ['back','biceps'], secondary: ['core'], tips: ['Bar at hip height','Body straight throughout','Pull chest to bar','Squeeze shoulder blades at top'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Mountain Climbers':      { muscles: ['core'], secondary: ['shoulders','quads'], tips: ['High plank, wrists under shoulders','Drive knees to chest alternately','Hips stay level and low','Keep breathing steadily'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Burpees':                { muscles: ['quads','chest'], secondary: ['core','shoulders','glutes'], tips: ['Squat to plank to push-up','Feet jump forward to hands','Explosive jump at the top','Scale: remove push-up if needed'], difficulty: 'Intermediate', equipment: 'Bodyweight' },
  'Box Jumps':              { muscles: ['quads','glutes'], secondary: ['calves','hamstrings'], tips: ['Athletic stance, arm swing','Land softly, absorb impact','Full hip extension at top','Step down — never jump down'], difficulty: 'Intermediate', equipment: 'Box / step' },
  'Side Plank':             { muscles: ['core'], secondary: ['shoulders'], tips: ['Elbow or hand below shoulder','Hips stacked and lifted','Body in a rigid straight line','Breathe steadily throughout'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Bicycle Crunches':       { muscles: ['core'], secondary: [], tips: ['Elbow to opposite knee','Extend the other leg straight','Slow and controlled — not rushed','Feel the obliques working'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'V-Ups':                  { muscles: ['core'], secondary: [], tips: ['Lift arms and legs simultaneously','Touch hands to feet at the top','Control descent — no flopping','Keep legs and arms straight'], difficulty: 'Intermediate', equipment: 'Bodyweight' },
  'Crunches':               { muscles: ['core'], secondary: [], tips: ['Hands lightly behind head','Lift shoulder blades off floor','Do not pull on your neck','Exhale at the top'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Superman':               { muscles: ['back','glutes'], secondary: [], tips: ['Face down, arms extended','Lift arms and legs simultaneously','Squeeze at the top','Lower slowly and repeat'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Sprints':                { muscles: ['quads','calves'], secondary: ['hamstrings','glutes','core'], tips: ['Drive knees high','Arms pump at 90°','Lean forward from ankles','Max effort for 10–30 sec'], difficulty: 'Intermediate', equipment: 'Bodyweight' },
  'Cycling':                { muscles: ['quads','calves'], secondary: ['hamstrings','glutes'], tips: ['Seat at hip height','Slight bend at knee bottom','Drive through the whole pedal stroke','Cadence 80–100 RPM for cardio'], difficulty: 'Beginner', equipment: 'Bike / stationary' },
  'Stair Climber':          { muscles: ['glutes','quads'], secondary: ['calves','hamstrings'], tips: ['Stay upright — don\'t hunch forward','Full step to engage glutes','Steady pace, control your breath','Avoid leaning on handles'], difficulty: 'Beginner', equipment: 'Stair climber machine' },
  'Tricep Pushdowns':       { muscles: ['triceps'], secondary: [], tips: ['Elbows pinned to your sides','Full extension at the bottom','Control the weight up','Squeeze at peak contraction'], difficulty: 'Beginner', equipment: 'Cable machine' },
  'Cable Bicep Curls':      { muscles: ['biceps'], secondary: [], tips: ['Keep elbows pinned to sides','Constant tension throughout','Full extension at the bottom','Squeeze hard at the top'], difficulty: 'Beginner', equipment: 'Cable machine' },
  'Close-Grip Bench Press': { muscles: ['triceps'], secondary: ['chest','shoulders'], tips: ['Grip shoulder-width or slightly closer','Elbows track close to your sides','Lower to lower chest','Press in a straight line up'], difficulty: 'Intermediate', equipment: 'Barbell + bench' },
  'Sumo Deadlift':          { muscles: ['glutes','quads'], secondary: ['hamstrings','back'], tips: ['Wide stance, toes angled out','Grip inside your legs','Chest proud, hips drive forward','Keep the bar close throughout'], difficulty: 'Intermediate', equipment: 'Barbell' },
  'Good Mornings':          { muscles: ['hamstrings','back'], secondary: ['glutes','core'], tips: ['Bar on upper back, soft knees','Hinge at hips, not the waist','Keep back flat throughout','Drive hips forward to stand'], difficulty: 'Intermediate', equipment: 'Barbell' },
  'Barbell Shrugs':         { muscles: ['traps'], secondary: ['shoulders'], tips: ['Stand tall, shoulders back','Elevate shoulders straight up','No rolling — straight up and down','Squeeze and hold at peak'], difficulty: 'Beginner', equipment: 'Barbell or dumbbells' },
  'Upright Rows':           { muscles: ['shoulders'], secondary: ['traps','biceps'], tips: ['Grip shoulder-width or narrower','Lead with elbows not hands','Pull to chin height','Lower with control'], difficulty: 'Intermediate', equipment: 'Barbell or dumbbells' },
  'Front Raises':           { muscles: ['shoulders'], secondary: [], tips: ['Palms face down throughout','Raise to shoulder height','Slow controlled descent','Avoid swinging the weight'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Incline Curls':          { muscles: ['biceps'], secondary: [], tips: ['Lie back on incline bench','Arms hang fully behind body','Full stretch at the bottom','Slow controlled curls'], difficulty: 'Beginner', equipment: 'Dumbbells' },
  'Hollow Body Hold':       { muscles: ['core'], secondary: [], tips: ['Lower back pressed to floor','Arms by ears, legs extended low','Hold the position and breathe','Think of a banana shape'], difficulty: 'Intermediate', equipment: 'Bodyweight' },
  'Dead Bug':               { muscles: ['core'], secondary: [], tips: ['Lower back pressed to floor','Opposite arm and leg extend out','Slow and controlled movement','Exhale as you extend'], difficulty: 'Beginner', equipment: 'Bodyweight' },
  'Flutter Kicks':          { muscles: ['core'], secondary: [], tips: ['Legs just above the floor','Small quick alternating kicks','Lower back stays pressed down','Breathe steadily throughout'], difficulty: 'Beginner', equipment: 'Bodyweight' },
}

// ── Muscle diagram ────────────────────────────────────────────────────────────
function MuscleDiagram({ muscles, secondary }: { muscles: string[]; secondary: string[] }) {
  const c = (m: string) => muscles.includes(m) ? '#ef4444' : secondary.includes(m) ? '#f97316' : 'rgba(255,255,255,0.05)'
  const s = (m: string) => muscles.includes(m) ? 'rgba(239,68,68,0.5)' : secondary.includes(m) ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'
  const sw = 0.6
  const neutral = { fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.09)', strokeWidth: sw }
  return (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>FRONT</p>
        <svg viewBox="0 0 60 132" width="60" height="132">
          <circle cx="30" cy="8" r="7" {...neutral} />
          <rect x="27" y="15" width="6" height="5" rx="2" {...neutral} />
          <ellipse cx="14" cy="28" rx="10" ry="7" fill={c('shoulders')} stroke={s('shoulders')} strokeWidth={sw} />
          <ellipse cx="46" cy="28" rx="10" ry="7" fill={c('shoulders')} stroke={s('shoulders')} strokeWidth={sw} />
          <path d="M22,22 Q30,18 38,22 L37,47 Q30,50 23,47 Z" fill={c('chest')} stroke={s('chest')} strokeWidth={sw} />
          <ellipse cx="8" cy="36" rx="6" ry="13" fill={c('biceps')} stroke={s('biceps')} strokeWidth={sw} />
          <ellipse cx="52" cy="36" rx="6" ry="13" fill={c('biceps')} stroke={s('biceps')} strokeWidth={sw} />
          <ellipse cx="7" cy="57" rx="5" ry="9" {...neutral} />
          <ellipse cx="53" cy="57" rx="5" ry="9" {...neutral} />
          <path d="M23,47 Q30,50 37,47 L36,69 Q30,72 24,69 Z" fill={c('core')} stroke={s('core')} strokeWidth={sw} />
          <ellipse cx="23" cy="89" rx="10" ry="17" fill={c('quads')} stroke={s('quads')} strokeWidth={sw} />
          <ellipse cx="37" cy="89" rx="10" ry="17" fill={c('quads')} stroke={s('quads')} strokeWidth={sw} />
          <ellipse cx="22" cy="116" rx="8" ry="12" fill={c('calves')} stroke={s('calves')} strokeWidth={sw} />
          <ellipse cx="38" cy="116" rx="8" ry="12" fill={c('calves')} stroke={s('calves')} strokeWidth={sw} />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>BACK</p>
        <svg viewBox="0 0 60 132" width="60" height="132">
          <circle cx="30" cy="8" r="7" {...neutral} />
          <rect x="27" y="15" width="6" height="5" rx="2" {...neutral} />
          <ellipse cx="14" cy="28" rx="10" ry="7" fill={c('shoulders')} stroke={s('shoulders')} strokeWidth={sw} />
          <ellipse cx="46" cy="28" rx="10" ry="7" fill={c('shoulders')} stroke={s('shoulders')} strokeWidth={sw} />
          <path d="M22,22 Q30,18 38,22 L36,69 Q30,72 24,69 Z" fill={c('back')} stroke={s('back')} strokeWidth={sw} />
          <ellipse cx="8" cy="36" rx="6" ry="13" fill={c('triceps')} stroke={s('triceps')} strokeWidth={sw} />
          <ellipse cx="52" cy="36" rx="6" ry="13" fill={c('triceps')} stroke={s('triceps')} strokeWidth={sw} />
          <ellipse cx="7" cy="57" rx="5" ry="9" {...neutral} />
          <ellipse cx="53" cy="57" rx="5" ry="9" {...neutral} />
          <path d="M24,69 Q30,72 36,69 L35,84 Q30,86 25,84 Z" fill={c('glutes')} stroke={s('glutes')} strokeWidth={sw} />
          <ellipse cx="23" cy="96" rx="10" ry="13" fill={c('hamstrings')} stroke={s('hamstrings')} strokeWidth={sw} />
          <ellipse cx="37" cy="96" rx="10" ry="13" fill={c('hamstrings')} stroke={s('hamstrings')} strokeWidth={sw} />
          <ellipse cx="22" cy="116" rx="8" ry="12" fill={c('calves')} stroke={s('calves')} strokeWidth={sw} />
          <ellipse cx="38" cy="116" rx="8" ry="12" fill={c('calves')} stroke={s('calves')} strokeWidth={sw} />
        </svg>
      </div>
    </div>
  )
}

// ── Exercise demo modal ───────────────────────────────────────────────────────
type ExerciseApiData = { images: [string, string] | null; description: string | null; instructions: string[] | null }

function ExerciseDemoModal({ name, info, onClose }: { name: string; info: ExInfo; onClose: () => void }) {
  const diffColor  = info.difficulty === 'Beginner' ? '#4ade80' : info.difficulty === 'Intermediate' ? '#f97316' : '#ef4444'
  const ytQuery    = encodeURIComponent(name + ' proper form tutorial')

  const [apiData, setApiData]     = useState<ExerciseApiData | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [frame, setFrame]         = useState(0)   // 0 or 1 — toggles between start/end image
  const frameRef  = useRef(frame)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch images + enriched data on mount
  useEffect(() => {
    fetch(`/api/exercise?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then((d: ExerciseApiData) => setApiData(d))
      .catch(() => {})
  }, [name])

  // Start animation once both images are confirmed loaded
  const startAnim = useCallback(() => {
    if (timerRef.current) return
    timerRef.current = setInterval(() => {
      frameRef.current = frameRef.current === 0 ? 1 : 0
      setFrame(frameRef.current)
    }, 700)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const img0ref = useRef<HTMLImageElement>(null)
  const img1ref = useRef<HTMLImageElement>(null)
  const loaded0 = useRef(false)
  const loaded1 = useRef(false)
  const checkBothLoaded = useCallback(() => {
    if (loaded0.current && loaded1.current) { setImgLoaded(true); startAnim() }
  }, [startAnim])

  const hasImages = apiData?.images != null

  return (
    <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', animation: 'scaleIn 0.2s ease both', maxHeight: '90dvh', overflowY: 'auto' }}>

        {/* ── Exercise animation ── */}
        {apiData === null ? (
          <div style={{ height: 220, background: 'rgba(255,255,255,0.02)', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : hasImages ? (
          <div style={{ position: 'relative', height: 220, background: '#0a0a0a', borderRadius: '24px 24px 0 0', overflow: 'hidden' }}>
            {/* Preload both frames, swap visibility */}
            {apiData.images!.map((src, i) => (
              <img
                key={i}
                ref={i === 0 ? img0ref : img1ref}
                src={src}
                alt={i === 0 ? `${name} start position` : `${name} end position`}
                onLoad={() => { if (i === 0) { loaded0.current = true } else { loaded1.current = true }; checkBothLoaded() }}
                onError={() => { if (i === 0) { loaded0.current = true } else { loaded1.current = true }; checkBothLoaded() }}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'top',
                  opacity: imgLoaded ? (frame === i ? 1 : 0) : (i === 0 ? 1 : 0),
                  transition: imgLoaded ? 'opacity 0.25s ease' : 'none',
                }}
              />
            ))}
            {/* Loading shimmer */}
            {!imgLoaded && (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            )}
            {/* Muscle overlay badge */}
            <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {info.muscles.map(m => <span key={m} style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', textTransform: 'capitalize', backdropFilter: 'blur(4px)' }}>{m}</span>)}
            </div>
            {/* Animation indicator */}
            {imgLoaded && (
              <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', gap: 3 }}>
                {[0, 1].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: frame === i ? '#ef4444' : 'rgba(255,255,255,0.2)', transition: 'background 0.2s' }} />)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ height: 160, background: '#0a0a0a', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MuscleDiagram muscles={info.muscles} secondary={info.secondary} />
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ padding: '20px 20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', marginBottom: 6 }}>{name}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: diffColor }}>{info.difficulty}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)' }}>{info.equipment}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer', paddingTop: 2 }}>×</button>
          </div>

          {/* Muscle badges — only show if no image (otherwise shown as overlay) */}
          {!hasImages && (
            <>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)' }}>PRIMARY </span>
                {info.muscles.map(m => <span key={m} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginRight: 4, textTransform: 'capitalize' }}>{m}</span>)}
              </div>
              {info.secondary.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)' }}>SECONDARY </span>
                  {info.secondary.map(m => <span key={m} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316', marginRight: 4, textTransform: 'capitalize' }}>{m}</span>)}
                </div>
              )}
            </>
          )}

          {/* Description from ExerciseDB if available */}
          {apiData?.description && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5, marginBottom: 16 }}>{apiData.description}</p>
          )}

          {/* Muscle diagram (only when no photo) */}
          {hasImages && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>MUSCLES WORKED</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {info.muscles.map(m => <span key={m} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', textTransform: 'capitalize' }}>{m}</span>)}
                {info.secondary.map(m => <span key={m} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316', textTransform: 'capitalize' }}>{m}</span>)}
              </div>
            </div>
          )}

          {/* Instructions — prefer ExerciseDB, fallback to our tips */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
              {apiData?.instructions ? 'STEP-BY-STEP' : 'KEY FORM CUES'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(apiData?.instructions ?? info.tips).map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <p style={{ fontSize: 13, color: '#EFEFEF', lineHeight: 1.4 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* YouTube link */}
          <a href={`https://www.youtube.com/results?search_query=${ytQuery}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 0', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, fontWeight: 700, color: '#ef4444', textDecoration: 'none', fontFamily: 'Satoshi,sans-serif', boxSizing: 'border-box' }}>
            ▶ Watch tutorial on YouTube
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }
function relDate(d: string) {
  const diff = Math.round((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtSets(sets: SetRow[]): string {
  if (!sets.length) return ''
  if (sets[0].duration_mins) return sets.map(s => `${s.duration_mins}min`).join(', ')
  return sets.map(s => `${s.weight_lbs ?? '?'}×${s.reps ?? '?'}`).join(' · ')
}
function compute1RM(sets: SetEntry[]): number | null {
  const done = sets.filter(s => s.done && s.weight && s.reps && parseInt(s.reps) > 0)
  if (!done.length) return null
  const max = Math.max(...done.map(s => parseFloat(s.weight) * (1 + parseInt(s.reps) / 30)))
  return Math.round(max)
}

// ── Sparkline components ─────────────────────────────────────────────────────
function TrendLine({ data }: { data: { maxW: number; date: string }[] }) {
  if (data.length < 2) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '20px 0' }}>Need at least 2 sessions to show trend.</p>
  const W = 280, H = 80, PAD = 8
  const vals = data.map(d => d.maxW)
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2))
  const ys = data.map(d => H - PAD - ((d.maxW - minV) / range) * (H - PAD * 2))
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  const first = vals[0], last = vals[vals.length - 1]
  const trend = last > first ? '+' : last < first ? '−' : ''
  const pctChange = first > 0 ? Math.abs(Math.round(((last - first) / first) * 100)) : 0
  return (
    <div>
      {trend && (
        <p style={{ fontSize: 11, fontWeight: 700, color: trend === '+' ? '#4ade80' : '#f87171', marginBottom: 8 }}>
          {trend}{pctChange}% over {data.length} sessions
        </p>
      )}
      <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r={i === data.length - 1 ? 5 : 3} fill="#ef4444" />
            {(i === 0 || i === data.length - 1) && (
              <text x={xs[i]} y={ys[i] - 10} textAnchor={i === 0 ? 'start' : 'end'} fill="rgba(255,255,255,0.42)" fontSize="10" fontFamily="Satoshi,sans-serif">
                {d.maxW}lbs
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>{data[0].date}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>{data[data.length - 1].date}</span>
      </div>
    </div>
  )
}

function BwSparkline({ data }: { data: BwLog[] }) {
  if (data.length < 2) return null
  const W = 90, H = 32, PAD = 3
  const vals = data.map(d => d.weight_lbs)
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const range = maxV - minV || 0.1
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2))
  const ys = data.map(d => H - PAD - ((d.weight_lbs - minV) / range) * (H - PAD * 2))
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill="#38bdf8" />
    </svg>
  )
}

const INP: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif',
  fontSize: 16, outline: 'none', padding: '8px 6px', textAlign: 'center',
  width: '100%', boxSizing: 'border-box',
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WorkoutClient({ sessions: initSessions, prs, goals, templates: initTemplates, bwLogs: initBwLogs, today }: Props) {
  // Core workout state
  const [sessions, setSessions]             = useState(initSessions)
  const [view, setView]                     = useState<'week' | 'history' | 'active' | 'start'>('week')
  const [sessionName, setSessionName]       = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [exercises, setExercises]           = useState<ExEntry[]>([])
  const [elapsed, setElapsed]               = useState(0)
  const [startTime, setStartTime]           = useState<number | null>(null)
  const [showAddEx, setShowAddEx]           = useState(false)
  const [exName, setExName]                 = useState('')
  const [isCardio, setIsCardio]             = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [query, setQuery]                   = useState('')
  const [, startT]                          = useTransition()
  const intervalRef                         = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rest timer
  const [restSecs, setRestSecs]     = useState(0)
  const [restTarget, setRestTarget] = useState(90)
  const [restRunning, setRestRunning] = useState(false)
  const [restFlash, setRestFlash]   = useState(false)
  const restRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  // Templates
  const [templates, setTemplates]         = useState<Template[]>(initTemplates)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName]   = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Body weight
  const [bwLogs, setBwLogs]   = useState<BwLog[]>(initBwLogs)
  const [bwInput, setBwInput] = useState('')
  const [savingBw, setSavingBw] = useState(false)

  // Trend modal
  const [trendEx, setTrendEx] = useState<string | null>(null)

  // Exercise demo modal
  const [demoEx, setDemoEx] = useState<string | null>(null)

  // Equipment filter (planner)
  const [equipment, setEquipment] = useState<Set<EquipmentType>>(new Set())
  function toggleEquipment(eq: EquipmentType) {
    setEquipment(prev => { const n = new Set(prev); n.has(eq) ? n.delete(eq) : n.add(eq); return n })
  }

  // AI workout generation
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError]           = useState<string | null>(null)

  // Workout overview panel
  const [showOverview, setShowOverview] = useState(false)

  // Week plan
  const [weekPlan, setWeekPlan]       = useState<WeekPlan>({})
  const [planningDay, setPlanningDay] = useState<number | null>(null)

  // Multi-type session selection
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const nameIsAutoRef = useRef(true)
  function toggleType(type: string) {
    setSelectedTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      if (nameIsAutoRef.current) setSessionName(next.join(' + '))
      return next
    })
  }

  // Load rest target from localStorage on mount
  useEffect(() => {
    try { setRestTarget(parseInt(localStorage.getItem('restTarget') ?? '90') || 90) } catch { /* */ }
  }, [])

  // Load week plan from localStorage on mount
  useEffect(() => {
    try { const s = localStorage.getItem('weekPlan'); if (s) setWeekPlan(JSON.parse(s)) } catch { /* */ }
  }, [])

  // Persist rest target
  useEffect(() => {
    try { localStorage.setItem('restTarget', String(restTarget)) } catch { /* */ }
  }, [restTarget])

  // Workout elapsed timer
  useEffect(() => {
    if (view !== 'active' || !startTime) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [view, startTime])

  // Rest countdown
  useEffect(() => {
    if (!restRunning) { if (restRef.current) clearInterval(restRef.current); return }
    restRef.current = setInterval(() => {
      setRestSecs(s => {
        if (s <= 1) {
          setRestRunning(false)
          setRestFlash(true)
          setTimeout(() => setRestFlash(false), 700)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (restRef.current) clearInterval(restRef.current) }
  }, [restRunning])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getTrend(exName: string) {
    return sessions
      .filter(s => s.exercises.some(e => e.name === exName))
      .map(s => {
        const ex = s.exercises.find(e => e.name === exName)!
        const maxW = ex.sets.filter(s => s.weight_lbs !== null).reduce((m, s) => Math.max(m, s.weight_lbs!), 0)
        return { date: s.date, maxW }
      })
      .filter(d => d.maxW > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
  }

  // ── Workout handlers ─────────────────────────────────────────────────────────
  function startWorkout() { setElapsed(0); setStartTime(Date.now()); setView('active'); setRestSecs(0); setRestRunning(false) }

  function loadTemplate(t: Template) {
    setSessionName(t.name)
    const loaded: ExEntry[] = t.exercises.map(ex => {
      const pr = prs[ex.name]
      return {
        id: crypto.randomUUID(), name: ex.name, isCardio: ex.isCardio,
        sets: ex.sets.length > 0
          ? ex.sets.map(s => ({
              id: crypto.randomUUID(),
              reps: s.reps ? String(s.reps) : '10',
              weight: s.weightLbs ? String(s.weightLbs) : (pr ? String(pr) : ''),
              duration: s.durationMins ? String(s.durationMins) : '30',
              done: false,
            }))
          : [{ id: crypto.randomUUID(), reps: '10', weight: pr ? String(pr) : '', duration: '', done: false }],
      }
    })
    setExercises(loaded)
    // Stay in plan view — user reviews/adjusts before starting
  }

  function addExercise() {
    if (!exName.trim()) return
    const pr = prs[exName.trim()]
    const w  = pr ? String(pr) : ''
    const newEx: ExEntry = {
      id: crypto.randomUUID(), name: exName.trim(), isCardio,
      sets: isCardio
        ? [{ id: crypto.randomUUID(), reps: '', weight: '', duration: '30', done: false }]
        : [
            { id: crypto.randomUUID(), reps: '10', weight: w, duration: '', done: false },
            { id: crypto.randomUUID(), reps: '10', weight: w, duration: '', done: false },
            { id: crypto.randomUUID(), reps: '10', weight: w, duration: '', done: false },
          ],
    }
    setExercises(prev => [...prev, newEx])
    setShowAddEx(false)
  }

  function updateSet(exId: string, setId: string, field: 'reps' | 'weight' | 'duration', val: string) {
    setExercises(prev => prev.map(ex => ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map(s => s.id !== setId ? s : { ...s, [field]: val })
    }))
  }

  function toggleDone(exId: string, setId: string) {
    const ex  = exercises.find(e => e.id === exId)
    const set = ex?.sets.find(s => s.id === setId)
    const becomingDone = set ? !set.done : false
    setExercises(prev => prev.map(ex => ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map(s => s.id !== setId ? s : { ...s, done: !s.done })
    }))
    if (becomingDone) {
      if (restRef.current) clearInterval(restRef.current)
      setRestSecs(restTarget)
      setRestRunning(true)
    }
  }

  function addSet(exId: string) {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      const last = ex.sets[ex.sets.length - 1]
      return { ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), reps: last?.reps ?? '10', weight: last?.weight ?? '', duration: last?.duration ?? '', done: false }] }
    }))
  }

  function removeLastSet(exId: string) {
    setExercises(prev => prev.map(ex => ex.id !== exId || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.slice(0, -1) }))
  }

  // One-tap add from suggestion chips — pre-fills from history/PR
  function addExerciseByName(name: string) {
    const isCardio = SUGGESTIONS.cardio.includes(name)
    const pr       = prs[name]
    const lastEx   = (() => {
      for (const s of [...sessions].reverse()) {
        const ex = s.exercises.find(e => e.name === name)
        if (ex?.sets.length) return ex
      }
      return null
    })()
    const w     = lastEx?.sets[0]?.weight_lbs?.toString() ?? (pr ? String(pr) : '')
    const r     = lastEx?.sets[0]?.reps?.toString() ?? '10'
    const d     = lastEx?.sets[0]?.duration_mins?.toString() ?? '30'
    const count = lastEx?.sets.length ?? 3
    setExercises(prev => [...prev, {
      id: crypto.randomUUID(), name, isCardio,
      sets: Array.from({ length: count }, () => ({
        id: crypto.randomUUID(), reps: r, weight: w, duration: isCardio ? d : '', done: false,
      })),
    }])
  }

  // Adjust set count from the compact plan card (+/-)
  function adjustSetCount(exId: string, delta: number) {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex
      if (delta > 0) {
        const last = ex.sets[ex.sets.length - 1]
        return { ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), reps: last?.reps ?? '10', weight: last?.weight ?? '', duration: last?.duration ?? '', done: false }] }
      }
      return ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.slice(0, -1) }
    }))
  }

  // ── AI workout generation ────────────────────────────────────────────────────
  async function buildWithAi() {
    setAiGenerating(true)
    setAiError(null)
    const goalTitle = fitnessGoals.find(g => g.id === selectedGoalId)?.title ?? null
    const { exercises: aiExs, error } = await generateWorkoutPlan(
      selectedTypes,
      [...equipment],
      goalTitle,
    )
    if (error || aiExs.length === 0) {
      setAiError(error ?? 'No exercises returned')
      setAiGenerating(false)
      return
    }
    const newExs: ExEntry[] = aiExs.map(ae => {
      const pr = prs[ae.name]
      const w  = pr ? String(pr) : ''
      return {
        id: crypto.randomUUID(), name: ae.name, isCardio: ae.isCardio,
        sets: Array.from({ length: ae.sets }, () => ({
          id: crypto.randomUUID(),
          reps: ae.reps, weight: ae.isCardio ? '' : w,
          duration: ae.isCardio ? ae.reps : '', done: false,
        })),
      }
    })
    setExercises(newExs)
    setAiGenerating(false)
  }

  // ── Week plan helpers ────────────────────────────────────────────────────────
  function openPlannerForDay(dayIdx: number) {
    const existing = weekPlan[dayIdx]
    if (existing && !existing.restDay) {
      setSelectedTypes(existing.types)
      setSessionName(existing.name)
      nameIsAutoRef.current = existing.name === existing.types.join(' + ') || existing.name === ''
      setExercises(existing.exercises.map(pe => ({
        id: crypto.randomUUID(), name: pe.name, isCardio: pe.isCardio,
        sets: Array.from({ length: pe.setCount }, () => ({
          id: crypto.randomUUID(), reps: pe.reps, weight: pe.weight,
          duration: pe.isCardio ? pe.reps : '', done: false,
        })),
      })))
    } else {
      setExercises([]); setSelectedTypes([]); setSessionName(''); nameIsAutoRef.current = true
    }
    setPlanningDay(dayIdx)
    setView('start')
  }

  function saveDayPlanData() {
    if (planningDay === null) return
    const plan: PlannedDay = {
      name: sessionName, types: selectedTypes, restDay: false,
      exercises: exercises.map(ex => ({
        name: ex.name, isCardio: ex.isCardio, setCount: ex.sets.length,
        reps: ex.sets[0]?.reps ?? '10', weight: ex.sets[0]?.weight ?? '',
      })),
    }
    const next = { ...weekPlan, [planningDay]: plan }
    setWeekPlan(next)
    try { localStorage.setItem('weekPlan', JSON.stringify(next)) } catch { /* */ }
  }

  function saveDayPlan() {
    saveDayPlanData()
    setPlanningDay(null)
    setView('week')
  }

  function saveDayPlanAndStart() {
    saveDayPlanData()
    setPlanningDay(null)
    setElapsed(0); setStartTime(Date.now()); setRestSecs(0); setRestRunning(false)
    setView('active')
  }

  function startFromDayPlan(dayIdx: number) {
    const plan = weekPlan[dayIdx]
    if (!plan || plan.restDay) return
    setSessionName(plan.name || plan.types.join(' + '))
    setSelectedTypes(plan.types)
    setExercises(plan.exercises.map(pe => ({
      id: crypto.randomUUID(), name: pe.name, isCardio: pe.isCardio,
      sets: Array.from({ length: pe.setCount }, () => ({
        id: crypto.randomUUID(), reps: pe.reps, weight: pe.weight,
        duration: pe.isCardio ? pe.reps : '', done: false,
      })),
    })))
    setElapsed(0); setStartTime(Date.now()); setRestSecs(0); setRestRunning(false)
    setView('active')
  }

  function markRestDay(dayIdx: number) {
    const next = { ...weekPlan, [dayIdx]: { name: '', types: [], exercises: [], restDay: true } }
    setWeekPlan(next)
    try { localStorage.setItem('weekPlan', JSON.stringify(next)) } catch { /* */ }
    setPlanningDay(null)
    setView('week')
  }

  async function finishWorkout() {
    if (!startTime) return
    setSaving(true)
    setRestRunning(false)
    const durationMins = Math.max(1, Math.floor(elapsed / 60))
    const exInputs = exercises.map((ex, i) => ({
      name: ex.name, isCardio: ex.isCardio, sortOrder: i,
      sets: ex.sets.map((s, j) => ({
        setNumber: j + 1,
        reps: s.reps ? parseInt(s.reps) : null,
        weightLbs: s.weight ? parseFloat(s.weight) : null,
        durationMins: s.duration ? parseInt(s.duration) : null,
      })),
    }))
    const tmp: Session = {
      id: crypto.randomUUID(), name: sessionName,
      date: today, duration_mins: durationMins,
      goal_id: selectedGoalId,
      goalTitle: goals.find(g => g.id === selectedGoalId)?.title ?? null,
      exercises: exercises.map((ex, i) => ({
        id: String(i), name: ex.name,
        sets: ex.sets.map((s, j) => ({
          id: s.id, set_number: j + 1,
          reps: s.reps ? parseInt(s.reps) : null,
          weight_lbs: s.weight ? parseFloat(s.weight) : null,
          duration_mins: s.duration ? parseInt(s.duration) : null,
        })),
      })),
    }
    setSessions(prev => [tmp, ...prev])
    setView('week')
    await saveWorkoutSession(sessionName, durationMins, exInputs, selectedGoalId)
    setSaving(false)
  }

  function handleDelete(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id))
    startT(() => deleteWorkoutSession(id))
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    const exs: TplEx[] = exercises.map(ex => ({
      name: ex.name, isCardio: ex.isCardio,
      sets: ex.sets.map(s => ({
        reps: s.reps ? parseInt(s.reps) : null,
        weightLbs: s.weight ? parseFloat(s.weight) : null,
        durationMins: s.duration ? parseInt(s.duration) : null,
      })),
    }))
    const tmp: Template = { id: crypto.randomUUID(), name: templateName.trim(), exercises: exs }
    setTemplates(prev => [tmp, ...prev])
    setShowSaveTemplate(false)
    setTemplateName('')
    setSavingTemplate(false)
    startT(() => saveTemplate(templateName.trim(), exs))
  }

  function handleDeleteTemplate(id: string) {
    setTemplates(prev => prev.filter(t => t.id !== id))
    startT(() => deleteTemplate(id))
  }

  async function handleLogBw() {
    const w = parseFloat(bwInput)
    if (!w || w <= 0) return
    setSavingBw(true)
    const entry = { date: today, weight_lbs: w }
    setBwLogs(prev => [...prev.filter(l => l.date !== today), entry].sort((a, b) => a.date.localeCompare(b.date)))
    setBwInput('')
    await logBodyWeight(today, w)
    setSavingBw(false)
  }

  const filtered     = ALL_SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()) && query.length > 0).slice(0, 6)
  const weekSessions = sessions.filter(s => Math.round((Date.now() - new Date(s.date + 'T12:00:00').getTime()) / 86400000) < 7)
  const latestBw     = bwLogs.length > 0 ? bwLogs[bwLogs.length - 1] : null
  const prevBw       = bwLogs.length > 1 ? bwLogs[bwLogs.length - 2] : null
  const bwDelta      = latestBw && prevBw ? Math.round((latestBw.weight_lbs - prevBw.weight_lbs) * 10) / 10 : null

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────────
  const todayDate    = new Date(today + 'T12:00:00')
  const todayDayIdx  = (todayDate.getDay() + 6) % 7   // JS 0=Sun → Mon=0 … Sun=6
  const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const plannedCount = Object.values(weekPlan).filter(d => d && !d.restDay).length

  if (view === 'week') {
    const todayPlan  = weekPlan[todayDayIdx]
    const todayTs    = todayPlan && !todayPlan.restDay ? getTypeStyle(todayPlan.types) : null
    const todayFmt   = `${WEEK_DAYS[todayDayIdx].full}, ${MONTHS[todayDate.getMonth()]} ${todayDate.getDate()}`

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
          @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
          ::-webkit-scrollbar{display:none}
        `}</style>

        {/* Top nav */}
        <div style={{ paddingTop: 8, paddingBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setView('history')} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0, fontFamily: 'Satoshi,sans-serif' }}>← History</button>
          <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)' }}>WORKOUT</p>
          <button onClick={() => { setPlanningDay(null); setExercises([]); setSelectedTypes([]); setSessionName(''); nameIsAutoRef.current = true; setView('start') }} style={{ padding: '7px 16px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', fontSize: 12, fontWeight: 800, color: '#ef4444', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>+ New</button>
        </div>

        {/* Date header */}
        <div style={{ marginBottom: 22, animation: 'fadeUp 0.3s ease both' }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 6 }}>{todayFmt}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>{plannedCount > 0 ? `${plannedCount} workout${plannedCount !== 1 ? 's' : ''} planned this week` : 'Plan your week below'}</p>
        </div>

        {/* Horizontal day strip */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, marginBottom: 28, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {WEEK_DAYS.map((day, i) => {
            const p      = weekPlan[i]
            const isToday = i === todayDayIdx
            const ts     = p && !p.restDay ? getTypeStyle(p.types) : null
            return (
              <button key={i} onClick={() => openPlannerForDay(i)} style={{
                flex: '0 0 auto', width: 46, minHeight: 72, borderRadius: 16,
                background: isToday
                  ? (ts ? `linear-gradient(160deg, ${ts.from}28, ${ts.to}12)` : 'rgba(255,255,255,0.07)')
                  : (ts ? ts.bg : 'rgba(255,255,255,0.02)'),
                border: isToday
                  ? `2px solid ${ts?.border ?? 'rgba(255,255,255,0.24)'}`
                  : ts ? `1px solid ${ts.border}` : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isToday && ts ? `0 4px 18px ${ts.glow}` : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                cursor: 'pointer', padding: '10px 0', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 8, fontWeight: 900, color: isToday ? '#EFEFEF' : ts ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.18)', letterSpacing: '0.1em' }}>{day.short}</span>
                <span style={{ fontSize: p ? 18 : 13, lineHeight: 1, marginBottom: 2 }}>
                  {p ? (p.restDay ? '😴' : ts!.icon) : '·'}
                </span>
                {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: ts?.from ?? '#ef4444', boxShadow: ts ? `0 0 6px ${ts.from}` : '0 0 6px #ef4444' }} />}
              </button>
            )
          })}
        </div>

        {/* TODAY hero */}
        {todayPlan && !todayPlan.restDay ? (
          <div style={{
            borderRadius: 28, position: 'relative', overflow: 'hidden',
            background: todayTs ? `linear-gradient(135deg, ${todayTs.from}20, ${todayTs.to}08)` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${todayTs?.border ?? 'rgba(255,255,255,0.08)'}`,
            padding: '26px 22px', marginBottom: 32,
            boxShadow: todayTs ? `0 16px 60px ${todayTs.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` : 'none',
            animation: 'fadeUp 0.4s 0.05s ease both',
          }}>
            {todayTs && <div style={{ position: 'absolute', right: -50, top: -50, width: 210, height: 210, borderRadius: '50%', background: `radial-gradient(circle, ${todayTs.from}18 0%, transparent 70%)`, pointerEvents: 'none' }} />}
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: todayTs?.text ?? 'rgba(255,255,255,0.42)', marginBottom: 8 }}>TODAY</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 8 }}>
                  {todayPlan.name || todayPlan.types.join(' + ')}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {todayPlan.types.map(t => {
                    const ts2 = TYPE_STYLE[t]
                    return <span key={t} style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: ts2?.bg ?? 'rgba(255,255,255,0.06)', border: `1px solid ${ts2?.border ?? 'rgba(255,255,255,0.1)'}`, color: ts2?.text ?? 'rgba(255,255,255,0.55)' }}>{t}</span>
                  })}
                </div>
              </div>
              <span style={{ fontSize: 44, lineHeight: 1, flexShrink: 0, marginLeft: 12 }}>{todayTs?.icon}</span>
            </div>
            {todayPlan.exercises.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
                {todayPlan.exercises.slice(0, 8).map(ex => (
                  <span key={ex.name} style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.50)' }}>{ex.name}</span>
                ))}
                {todayPlan.exercises.length > 8 && <span style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.03)', fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>+{todayPlan.exercises.length - 8}</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{todayPlan.exercises.length}</p>
                <p style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 4 }}>EXERCISES</p>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{todayPlan.exercises.reduce((t, e) => t + e.setCount, 0)}</p>
                <p style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 4 }}>SETS</p>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div>
                <p style={{ fontSize: 26, fontWeight: 900, color: todayTs?.text ?? '#EFEFEF', lineHeight: 1 }}>
                  ~{Math.round(todayPlan.exercises.reduce((t, e) => t + e.setCount * 3, 0))}m
                </p>
                <p style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 4 }}>EST. TIME</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => startFromDayPlan(todayDayIdx)} style={{
                flex: 1, padding: '16px 0', borderRadius: 18,
                background: todayTs ? `linear-gradient(135deg, ${todayTs.from}, ${todayTs.to})` : 'linear-gradient(135deg,#ef4444,#f97316)',
                border: 'none', fontSize: 15, fontWeight: 900, color: '#fff', cursor: 'pointer',
                letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif',
                boxShadow: todayTs ? `0 8px 32px ${todayTs.glow}` : '0 8px 32px rgba(239,68,68,0.35)',
              }}>▶ Let&apos;s Go</button>
              <button onClick={() => openPlannerForDay(todayDayIdx)} style={{ padding: '16px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Edit</button>
            </div>
          </div>
        ) : todayPlan?.restDay ? (
          <div style={{ borderRadius: 28, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '30px 22px', marginBottom: 32, textAlign: 'center', animation: 'fadeUp 0.4s 0.05s ease both' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>😴</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', marginBottom: 6 }}>Rest Day</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginBottom: 20 }}>Recovery is part of the plan.</p>
            <button onClick={() => openPlannerForDay(todayDayIdx)} style={{ padding: '11px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Change to workout day</button>
          </div>
        ) : (
          <div style={{ borderRadius: 28, border: '1.5px dashed rgba(255,255,255,0.07)', padding: '32px 22px', marginBottom: 32, textAlign: 'center', animation: 'fadeUp 0.4s 0.05s ease both' }}>
            <div style={{ width: 60, height: 60, borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>📋</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', marginBottom: 8 }}>Nothing planned today</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6, marginBottom: 24 }}>Plan your week so the workout is ready before you get to the gym.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => openPlannerForDay(todayDayIdx)} style={{ padding: '14px 28px', borderRadius: 16, background: 'linear-gradient(135deg,#ef4444,#f97316)', border: 'none', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', boxShadow: '0 6px 24px rgba(239,68,68,0.35)' }}>+ Plan Today</button>
              <button onClick={() => markRestDay(todayDayIdx)} style={{ padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>😴 Rest</button>
            </div>
          </div>
        )}

        {/* Rest of the week */}
        <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.22)', marginBottom: 14 }}>THIS WEEK</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {WEEK_DAYS.map((day, i) => {
            if (i === todayDayIdx) return null
            const p      = weekPlan[i]
            const isPast = i < todayDayIdx
            const ts     = p && !p.restDay ? getTypeStyle(p.types) : null

            if (!p) return (
              <button key={i} onClick={() => openPlannerForDay(i)} style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'Satoshi,sans-serif', opacity: isPast ? 0.3 : 1, animation: `fadeUp 0.3s ${i*0.04}s ease both` }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>+</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.22)', marginBottom: 1 }}>{day.full}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>{isPast ? 'Unplanned' : 'Tap to plan'}</p>
                </div>
              </button>
            )

            if (p.restDay) return (
              <div key={i} style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12, opacity: isPast ? 0.4 : 1, animation: `fadeUp 0.3s ${i*0.04}s ease both` }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>😴</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>{day.full}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>Rest day</p>
                </div>
                <button onClick={() => openPlannerForDay(i)} style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>Change</button>
              </div>
            )

            return (
              <div key={i} style={{ borderRadius: 16, padding: '14px 16px', background: `linear-gradient(135deg, ${ts!.from}10, ${ts!.to}06)`, border: `1px solid ${ts!.border}`, display: 'flex', alignItems: 'center', gap: 12, opacity: isPast ? 0.5 : 1, animation: `fadeUp 0.3s ${i*0.04}s ease both` }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: `linear-gradient(135deg, ${ts!.from}24, ${ts!.to}15)`, border: `1px solid ${ts!.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{ts!.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: isPast ? 'rgba(255,255,255,0.42)' : '#EFEFEF', marginBottom: 2 }}>{p.name || p.types.join(' + ')}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {day.full} · {p.exercises.length} ex · {p.exercises.reduce((t, e) => t + e.setCount, 0)} sets
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!isPast && (
                    <button onClick={() => startFromDayPlan(i)} style={{ padding: '8px 14px', borderRadius: 11, background: `linear-gradient(135deg, ${ts!.from}22, ${ts!.to}14)`, border: `1px solid ${ts!.border}`, fontSize: 13, fontWeight: 900, color: ts!.text, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>▶</button>
                  )}
                  <button onClick={() => openPlannerForDay(i)} style={{ padding: '8px 11px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>✎</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
          <button onClick={() => setView('history')} style={{ flex: 1, padding: '13px 0', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>📜 History</button>
          <button onClick={() => {
            if (Object.keys(weekPlan).length === 0) return
            const ok = typeof window !== 'undefined' && window.confirm('Clear this week\'s plan?')
            if (ok) { const n = {}; setWeekPlan(n); try { localStorage.setItem('weekPlan', JSON.stringify(n)) } catch { /* */ } }
          }} style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.22)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Reset Week</button>
        </div>

        {demoEx && EXERCISE_INFO[demoEx] && <ExerciseDemoModal name={demoEx} info={EXERCISE_INFO[demoEx]} onClose={() => setDemoEx(null)} />}
      </div>
    )
  }

  // ── WORKOUT PLANNER ───────────────────────────────────────────────────────────
  const presetSuggestions = [...new Set(
    selectedTypes.flatMap(t => PRESET_EXERCISES[t] ?? [])
  )].filter(name =>
    equipment.size === 0 || (EXERCISE_EQUIPMENT[name] ?? []).some(eq => equipment.has(eq))
  )
  const fitnessGoals = goals.filter(g => g.category === 'health')

  if (view === 'start') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back */}
      <div style={{ paddingTop: 4, paddingBottom: 18 }}>
        <button onClick={() => { if (planningDay !== null) { setPlanningDay(null); setView('week') } else setView('week') }} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
      </div>

      {/* Day planning banner */}
      {planningDay !== null && (
        <div style={{ marginBottom: 20, padding: '13px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📅</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>PLANNING</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF' }}>{WEEK_DAYS[planningDay].full}</p>
          </div>
          <button onClick={() => markRestDay(planningDay)} style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>😴 Rest Day</button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 5 }}>What are we training?</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Pick a session type — exercises appear instantly.</p>
      </div>

      {/* ── 1. Session type — multi-select ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>WHAT ARE YOU TRAINING? <span style={{ color: 'rgba(255,255,255,0.12)', fontWeight: 600, letterSpacing: 0 }}>(pick one or combine)</span></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {Object.keys(PRESET_EXERCISES).map(p => {
            const on = selectedTypes.includes(p)
            return (
              <button key={p} onClick={() => toggleType(p)} style={{ padding: '9px 16px', borderRadius: 99, background: on ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${on ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`, fontSize: 13, fontWeight: 700, color: on ? '#ef4444' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                {on && <span style={{ fontSize: 10, fontWeight: 900 }}>✓</span>}{p}
              </button>
            )
          })}
        </div>
        <input
          value={sessionName}
          onChange={e => { setSessionName(e.target.value); nameIsAutoRef.current = false }}
          placeholder="Or type a custom session name…"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${sessionName ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`, color: '#EFEFEF', fontSize: 13, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none', transition: 'border-color 0.15s' }}
        />
        {selectedTypes.length > 0 && (
          <button onClick={() => { setSelectedTypes([]); if (nameIsAutoRef.current) setSessionName(''); nameIsAutoRef.current = true }} style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 11, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: 0, fontFamily: 'Satoshi,sans-serif' }}>
            Clear selection
          </button>
        )}
      </div>

      {/* ── 2. Equipment ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>WHAT DO YOU HAVE? <span style={{ color: 'rgba(255,255,255,0.12)', fontWeight: 600, letterSpacing: 0 }}>(tap all that apply)</span></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EQUIPMENT_OPTIONS.map(({ id, label, icon }) => {
            const on = equipment.has(id)
            return (
              <button key={id} onClick={() => toggleEquipment(id)} style={{ padding: '9px 16px', borderRadius: 99, background: on ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${on ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.07)'}`, fontSize: 13, fontWeight: 700, color: on ? '#ef4444' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{icon}</span>{label}
              </button>
            )
          })}
        </div>
        {equipment.size > 0 && (
          <button onClick={() => setEquipment(new Set())} style={{ marginTop: 10, background: 'none', border: 'none', fontSize: 11, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: 0, fontFamily: 'Satoshi,sans-serif' }}>
            Clear filter · show all exercises
          </button>
        )}
      </div>

      {/* ── AI WORKOUT BUILDER ── */}
      {selectedTypes.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={buildWithAi}
            disabled={aiGenerating}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 16,
              background: aiGenerating ? 'rgba(99,102,241,0.06)' : 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))',
              border: `1px solid ${aiGenerating ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.35)'}`,
              fontSize: 14, fontWeight: 800, color: aiGenerating ? 'rgba(255,255,255,0.42)' : '#a78bfa',
              cursor: aiGenerating ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', boxShadow: aiGenerating ? 'none' : '0 4px 20px rgba(99,102,241,0.15)',
            }}
          >
            {aiGenerating ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite' }} />
                Building your workout…
              </>
            ) : (
              <>✦ Build with AI</>
            )}
          </button>
          {aiError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 8, textAlign: 'center' }}>{aiError}</p>}
          {exercises.length > 0 && !aiGenerating && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 8, textAlign: 'center' }}>
              AI built your plan · tap exercises below to remove, or add more
            </p>
          )}
        </div>
      )}

      {/* ── 3. Tap-to-add exercise chips ── */}
      {presetSuggestions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>TAP TO ADD</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presetSuggestions.map(name => {
              const added = exercises.some(e => e.name === name)
              return (
                <button key={name} onClick={() => added ? setExercises(prev => prev.filter(e => e.name !== name)) : addExerciseByName(name)}
                  style={{ padding: '9px 15px', borderRadius: 99, background: added ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${added ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.07)'}`, fontSize: 13, fontWeight: 700, color: added ? '#ef4444' : 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {added && <span style={{ fontSize: 10, fontWeight: 900 }}>✓</span>}
                  {name}
                </button>
              )
            })}
            {/* Something else */}
            <button onClick={() => { setExName(''); setIsCardio(false); setQuery(''); setShowAddEx(true) }} style={{ padding: '9px 15px', borderRadius: 99, background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>+ Something else</button>
          </div>
        </div>
      )}

      {/* ── 3. Your plan — compact cards ── */}
      {exercises.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#ef4444', marginBottom: 12 }}>YOUR PLAN · {exercises.length} EXERCISE{exercises.length !== 1 ? 'S' : ''}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exercises.map((ex, i) => {
              const info = EXERCISE_INFO[ex.name]
              const hint = (() => {
                for (const s of [...sessions].reverse()) {
                  const prev = s.exercises.find(e => e.name === ex.name)
                  if (!prev?.sets.length) continue
                  const fs = prev.sets[0]
                  if (fs.weight_lbs) return `${fs.weight_lbs}lbs × ${fs.reps ?? '?'} last time`
                  if (fs.duration_mins) return `${fs.duration_mins}min last time`
                }
                return prs[ex.name] ? `PR ${prs[ex.name]}lbs` : null
              })()
              return (
                <div key={ex.id} style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(239,68,68,0.12)', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, animation: `fadeUp 0.2s ${i * 0.04}s ease both` }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {info ? (
                      <button onClick={() => setDemoEx(ex.name)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 14, fontWeight: 800, color: '#EFEFEF', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: 'rgba(255,255,255,0.28)', textAlign: 'left', display: 'block', marginBottom: 5 }}>{ex.name}</button>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', marginBottom: 5 }}>{ex.name}</p>
                    )}
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                      {info?.muscles.slice(0, 2).map(m => <span key={m} style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444', textTransform: 'capitalize' }}>{m}</span>)}
                      {hint && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{hint}</span>}
                    </div>
                  </div>
                  {/* Set count stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => adjustSetCount(ex.id, -1)} disabled={ex.sets.length <= 1} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: ex.sets.length <= 1 ? '#1a1a1a' : 'rgba(255,255,255,0.42)', cursor: ex.sets.length <= 1 ? 'not-allowed' : 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
                    <div style={{ textAlign: 'center', minWidth: 32 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{ex.sets.length}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.07em', marginTop: 2 }}>SETS</div>
                    </div>
                    <button onClick={() => adjustSetCount(ex.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>+</button>
                  </div>
                  <button onClick={() => setExercises(prev => prev.filter(e => e.id !== ex.id))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', fontSize: 20, cursor: 'pointer', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>×</button>
                </div>
              )
            })}
          </div>

          {/* Add something not in the chips */}
          {presetSuggestions.length === 0 && (
            <button onClick={() => { setExName(''); setIsCardio(false); setQuery(''); setShowAddEx(true) }} style={{ width: '100%', marginTop: 10, padding: '12px 0', borderRadius: 14, background: 'rgba(239,68,68,0.04)', border: '1px dashed rgba(239,68,68,0.18)', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>+ Add exercise</button>
          )}
        </div>
      )}

      {/* ── Empty state when no preset and no exercises ── */}
      {presetSuggestions.length === 0 && exercises.length === 0 && sessionName.trim() && (
        <button onClick={() => { setExName(''); setIsCardio(false); setQuery(''); setShowAddEx(true) }} style={{ width: '100%', padding: '28px 20px', borderRadius: 20, background: 'rgba(239,68,68,0.025)', border: '1.5px dashed rgba(239,68,68,0.18)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontFamily: 'Satoshi,sans-serif', marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>💪</div>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>Add your first exercise</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Search 35+ exercises or type your own</p>
        </button>
      )}

      {/* ── Templates (secondary) ── */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>📌 SAVED TEMPLATES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {templates.map(t => (
              <div key={t.id} style={{ borderRadius: 13, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#EFEFEF', marginBottom: 2 }}>{t.name}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.exercises.map(e => e.name).join(' · ') || 'No exercises'}</p>
                </div>
                <button onClick={() => loadTemplate(t)} style={{ padding: '6px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, fontWeight: 800, color: '#ef4444', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>Load</button>
                <button onClick={() => handleDeleteTemplate(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', fontSize: 17, cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Goal link — fitness goals only ── */}
      {fitnessGoals.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>LINK TO A FITNESS GOAL (OPTIONAL)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {fitnessGoals.map(g => (
              <button key={g.id} onClick={() => setSelectedGoalId(selectedGoalId === g.id ? null : g.id)} style={{ padding: '7px 13px', borderRadius: 99, background: selectedGoalId === g.id ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedGoalId === g.id ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.06)'}`, fontSize: 12, fontWeight: 700, color: selectedGoalId === g.id ? '#ef4444' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>{g.title}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA: context-aware ── */}
      {planningDay !== null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={saveDayPlan} disabled={!sessionName.trim()} style={{ width: '100%', padding: '17px 0', borderRadius: 18, background: sessionName.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 15, fontWeight: 900, color: sessionName.trim() ? '#fff' : 'rgba(255,255,255,0.28)', cursor: sessionName.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif', boxShadow: sessionName.trim() ? '0 8px 32px rgba(99,102,241,0.35)' : 'none', transition: 'all 0.2s' }}>
            {exercises.length > 0 ? `💾 Save to Week Plan · ${exercises.length} ex` : '💾 Save to Week Plan'}
          </button>
          <button onClick={saveDayPlanAndStart} disabled={!sessionName.trim()} style={{ width: '100%', padding: '14px 0', borderRadius: 18, background: sessionName.trim() ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sessionName.trim() ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`, fontSize: 14, fontWeight: 800, color: sessionName.trim() ? '#ef4444' : 'rgba(255,255,255,0.28)', cursor: sessionName.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.03em', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s' }}>
            ▶ Save &amp; Start Now
          </button>
        </div>
      ) : (
        <>
          <button onClick={startWorkout} disabled={!sessionName.trim()} style={{ width: '100%', padding: '17px 0', borderRadius: 18, background: sessionName.trim() ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 15, fontWeight: 900, color: sessionName.trim() ? '#fff' : 'rgba(255,255,255,0.28)', cursor: sessionName.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif', boxShadow: sessionName.trim() && exercises.length > 0 ? '0 8px 32px rgba(239,68,68,0.4)' : sessionName.trim() ? '0 4px 20px rgba(239,68,68,0.2)' : 'none', transition: 'all 0.2s' }}>
            {exercises.length > 0 ? `START · ${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} · ${exercises.reduce((t, e) => t + e.sets.length, 0)} sets →` : 'START WORKOUT →'}
          </button>
          {exercises.length > 0 && sessionName.trim() && (
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 10 }}>Enter your reps and weight as you go — no prep needed</p>
          )}
        </>
      )}

      {/* Custom exercise search modal */}
      {showAddEx && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddEx(false) }}>
          <div style={{ width: '100%', maxWidth: 480, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '22px 18px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF' }}>Add exercise</p>
              <button onClick={() => setShowAddEx(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {([false, true] as boolean[]).map(c => (
                <button key={String(c)} onClick={() => setIsCardio(c)} style={{ flex: 1, padding: '8px 0', borderRadius: 11, background: isCardio === c ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isCardio === c ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`, fontSize: 12, fontWeight: 800, color: isCardio === c ? '#ef4444' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {c ? '🏃 Cardio' : '💪 Weights'}
                </button>
              ))}
            </div>
            <input value={exName} onChange={e => { setExName(e.target.value); setQuery(e.target.value) }} placeholder="Exercise name…" style={{ width: '100%', padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} autoFocus />
            {filtered.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {filtered.map(s => <button key={s} onClick={() => { setExName(s); setQuery('') }} style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 11, color: '#ef4444', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>{s}</button>)}
              </div>
            )}
            {!query && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(isCardio ? SUGGESTIONS.cardio : [...SUGGESTIONS.other, ...SUGGESTIONS.push.slice(4)]).slice(0, 8).map(s => <button key={s} onClick={() => setExName(s)} style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>{s}</button>)}
              </div>
            )}
            {exName && EXERCISE_INFO[exName] && (
              <button onClick={() => setDemoEx(exName)} style={{ width: '100%', padding: '9px 13px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', marginBottom: 10, fontFamily: 'Satoshi,sans-serif', textAlign: 'left', boxSizing: 'border-box' }}>
                📖 How to: {exName} →
              </button>
            )}
            <button onClick={addExercise} disabled={!exName.trim()} style={{ width: '100%', padding: '13px 0', borderRadius: 15, background: exName.trim() ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: exName.trim() ? '#fff' : 'rgba(255,255,255,0.28)', cursor: exName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
              ADD →
            </button>
          </div>
        </div>
      )}
      {demoEx && EXERCISE_INFO[demoEx] && <ExerciseDemoModal name={demoEx} info={EXERCISE_INFO[demoEx]} onClose={() => setDemoEx(null)} />}
    </div>
  )

  // ── ACTIVE WORKOUT ────────────────────────────────────────────────────────────
  if (view === 'active') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 120px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes flash{0%,100%{opacity:0}40%{opacity:1}}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
      `}</style>

      {/* Rest-done flash */}
      {restFlash && <div style={{ position: 'fixed', inset: 0, background: 'rgba(74,222,128,0.08)', pointerEvents: 'none', zIndex: 200, animation: 'flash 0.7s ease' }} />}

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, background: '#080808', paddingTop: 8, paddingBottom: 14, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 0 }}>
        {/* Row 1: name + elapsed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 7px #ef4444', animation: 'pulse 1.5s ease infinite', flexShrink: 0 }} />
            <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF' }}>{sessionName}</p>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmtTime(elapsed)}</p>
        </div>
        {/* Row 2: progress */}
        {(() => {
          const totalSets = exercises.reduce((t, e) => t + e.sets.length, 0)
          const doneSets  = exercises.reduce((t, e) => t + e.sets.filter(s => s.done).length, 0)
          const pct       = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0
          return (
            <div style={{ marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: pct === 100 ? '#4ade80' : '#EFEFEF' }}>
                  {pct === 100 ? '✓ All sets done' : `${doneSets} / ${totalSets} sets`}
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: pct === 100 ? '#4ade80' : pct >= 50 ? '#f97316' : '#ef4444' }}>{pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'linear-gradient(90deg,#ef4444,#f97316)', transition: 'width 0.4s cubic-bezier(0.34,1.1,0.64,1)' }} />
              </div>
            </div>
          )
        })()}

        {/* Rest timer banner */}
        {restRunning ? (
          <div style={{ borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#4ade80' }}>REST</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(restSecs)}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[60, 90, 120].map(t => (
                  <button key={t} onClick={() => { setRestTarget(t); setRestSecs(t) }} style={{ padding: '4px 8px', borderRadius: 8, background: restTarget === t ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${restTarget === t ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.07)'}`, fontSize: 10, fontWeight: 700, color: restTarget === t ? '#4ade80' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                    {t === 120 ? '2m' : `${t}s`}
                  </button>
                ))}
                <button onClick={() => setRestRunning(false)} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Skip</button>
              </div>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${Math.round((restSecs / restTarget) * 100)}%`, background: '#4ade80', transition: 'width 1s linear' }} />
            </div>
          </div>
        ) : (
          /* Rest target config when idle */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)' }}>REST</p>
            {[60, 90, 120].map(t => (
              <button key={t} onClick={() => setRestTarget(t)} style={{ padding: '4px 8px', borderRadius: 8, background: restTarget === t ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${restTarget === t ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`, fontSize: 10, fontWeight: 700, color: restTarget === t ? '#EFEFEF' : 'rgba(255,255,255,0.18)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                {t === 120 ? '2m' : `${t}s`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 16 }} />

      {/* Overview pill */}
      {exercises.length > 0 && (
        <button onClick={() => setShowOverview(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
          <span style={{ fontSize: 11 }}>☰</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)' }}>View plan</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', marginLeft: 2 }}>
            {exercises.filter(e => e.sets.every(s => s.done) && e.sets.length > 0).length}/{exercises.length}
          </span>
        </button>
      )}

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'fadeUp 0.4s ease both' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💪</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>Time to work</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Add your first exercise below.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {exercises.map((ex, i) => {
            const pr       = prs[ex.name]
            const doneCt   = ex.sets.filter(s => s.done).length
            const allDone  = doneCt === ex.sets.length && ex.sets.length > 0
            const oneRM    = compute1RM(ex.sets)
            return (
              <div key={ex.id} style={{ borderRadius: 20, background: allDone ? 'rgba(74,222,128,0.04)' : '#0d0d0d', border: `1px solid ${allDone ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.15)'}`, overflow: 'hidden', animation: `fadeUp 0.3s ${i*0.04}s ease both` }}>
                <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {EXERCISE_INFO[ex.name] ? (
                        <button onClick={() => setDemoEx(ex.name)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, fontWeight: 800, color: allDone ? '#4ade80' : '#EFEFEF', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: 'rgba(255,255,255,0.28)' }}>{ex.name}</button>
                      ) : (
                        <span style={{ fontSize: 15, fontWeight: 800, color: allDone ? '#4ade80' : '#EFEFEF' }}>{ex.name}</span>
                      )}
                      {pr && !allDone && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>PR {pr}lbs</span>}
                      {allDone && <span style={{ fontSize: 11, color: '#4ade80' }}>✓</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{doneCt}/{ex.sets.length} sets</p>
                      {oneRM && <p style={{ fontSize: 10, color: '#f97316' }}>Est. 1RM: ~{oneRM}lbs</p>}
                    </div>
                  </div>
                  <button onClick={() => setExercises(prev => prev.filter(e => e.id !== ex.id))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>×</button>
                </div>

                <div style={{ padding: '8px 16px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 14px 1fr 36px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>#</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em', textAlign: 'center' }}>{ex.isCardio ? 'MINS' : 'LBS'}</span>
                    <span />
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em', textAlign: 'center' }}>{ex.isCardio ? '' : 'REPS'}</span>
                    <span />
                  </div>

                  {ex.sets.map((s, j) => (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 14px 1fr 36px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.done ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s.done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: s.done ? '#4ade80' : 'rgba(255,255,255,0.28)' }}>{j+1}</span>
                      </div>
                      <input type="number" inputMode="decimal" value={ex.isCardio ? s.duration : s.weight} onChange={e => updateSet(ex.id, s.id, ex.isCardio ? 'duration' : 'weight', e.target.value)} placeholder={ex.isCardio ? '30' : '0'} disabled={s.done} style={{ ...INP, opacity: s.done ? 0.35 : 1 }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center' }}>×</span>
                      {ex.isCardio ? <span /> : (
                        <input type="number" inputMode="numeric" value={s.reps} onChange={e => updateSet(ex.id, s.id, 'reps', e.target.value)} placeholder="0" disabled={s.done} style={{ ...INP, opacity: s.done ? 0.35 : 1 }} />
                      )}
                      <button onClick={() => toggleDone(ex.id, s.id)} style={{ width: 36, height: 36, borderRadius: '50%', background: s.done ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${s.done ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: s.done ? '#4ade80' : 'rgba(255,255,255,0.18)', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        {s.done ? '✓' : '○'}
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => addSet(ex.id)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px dashed rgba(239,68,68,0.2)', fontSize: 11, fontWeight: 700, color: '#ef4444', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>+ Set</button>
                    {ex.sets.length > 1 && (
                      <button onClick={() => removeLastSet(ex.id)} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>− Set</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button onClick={() => { setExName(''); setIsCardio(false); setQuery(''); setShowAddEx(true) }} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px dashed rgba(239,68,68,0.3)', fontSize: 13, fontWeight: 700, color: '#ef4444', cursor: 'pointer', marginBottom: 14, fontFamily: 'Satoshi,sans-serif' }}>
        + Add Exercise
      </button>

      <button onClick={finishWorkout} disabled={saving || exercises.length === 0} style={{ width: '100%', padding: '17px 0', borderRadius: 18, background: exercises.length > 0 && !saving ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 15, fontWeight: 900, color: exercises.length > 0 && !saving ? '#fff' : 'rgba(255,255,255,0.28)', cursor: exercises.length > 0 && !saving ? 'pointer' : 'not-allowed', letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif', boxShadow: exercises.length > 0 && !saving ? '0 8px 32px rgba(239,68,68,0.3)' : 'none', marginBottom: 10 }}>
        {saving ? 'SAVING…' : 'FINISH WORKOUT ✓'}
      </button>

      {exercises.length > 0 && (
        <button onClick={() => { setTemplateName(sessionName); setShowSaveTemplate(true) }} style={{ width: '100%', padding: '11px 0', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
          📌 Save as template
        </button>
      )}

      {/* Workout overview panel */}
      {showOverview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 110 }} onClick={e => { if (e.target === e.currentTarget) setShowOverview(false) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: '24px 24px 0 0', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', padding: '0 0 32px', animation: 'slideUp 0.22s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px' }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 2 }}>{sessionName}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{exercises.length} exercises · {exercises.reduce((t, e) => t + e.sets.length, 0)} total sets</p>
              </div>
              <button onClick={() => setShowOverview(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }}>×</button>
            </div>

            {/* Progress bar */}
            {(() => {
              const total = exercises.reduce((t, e) => t + e.sets.length, 0)
              const done  = exercises.reduce((t, e) => t + e.sets.filter(s => s.done).length, 0)
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div style={{ padding: '0 20px 18px' }}>
                  <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'linear-gradient(90deg,#ef4444,#f97316)', transition: 'width 0.4s ease' }} />
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: pct === 100 ? '#4ade80' : 'rgba(255,255,255,0.28)', marginTop: 6 }}>{pct}% complete</p>
                </div>
              )
            })()}

            {/* Exercise list */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exercises.map((ex, i) => {
                const doneCt  = ex.sets.filter(s => s.done).length
                const allDone = doneCt === ex.sets.length && ex.sets.length > 0
                const next    = !allDone && exercises.slice(0, i).every(e => e.sets.every(s => s.done) || e.sets.length === 0)
                return (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 16, background: allDone ? 'rgba(74,222,128,0.05)' : next ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${allDone ? 'rgba(74,222,128,0.2)' : next ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                    {/* Status ring */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: allDone ? 'rgba(74,222,128,0.15)' : next ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', border: `2px solid ${allDone ? '#4ade80' : next ? '#ef4444' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                      {allDone
                        ? <span style={{ fontSize: 15, color: '#4ade80' }}>✓</span>
                        : <span style={{ fontSize: 11, fontWeight: 900, color: next ? '#ef4444' : 'rgba(255,255,255,0.28)' }}>{i + 1}</span>
                      }
                    </div>

                    {/* Name + sets */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: allDone ? '#4ade80' : '#EFEFEF', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ex.sets.map((s, j) => (
                          <div key={s.id} style={{ width: 20, height: 20, borderRadius: 6, background: s.done ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s.done ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: s.done ? '#4ade80' : 'rgba(255,255,255,0.28)' }}>{j + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Set count + next label */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: allDone ? '#4ade80' : 'rgba(255,255,255,0.28)' }}>{doneCt}/{ex.sets.length}</p>
                      {next && <p style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em' }}>NEXT</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Close CTA */}
            <div style={{ padding: '18px 16px 0' }}>
              <button onClick={() => setShowOverview(false)} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                Back to workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add exercise modal */}
      {showAddEx && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddEx(false) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF' }}>Add Exercise</p>
              <button onClick={() => setShowAddEx(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {([false, true] as boolean[]).map(c => (
                <button key={String(c)} onClick={() => setIsCardio(c)} style={{ flex: 1, padding: '9px 0', borderRadius: 12, background: isCardio === c ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isCardio === c ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`, fontSize: 12, fontWeight: 800, color: isCardio === c ? '#ef4444' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {c ? '🏃 Cardio' : '💪 Weights'}
                </button>
              ))}
            </div>
            <input value={exName} onChange={e => { setExName(e.target.value); setQuery(e.target.value) }} placeholder="Exercise name…" style={{ width: '100%', padding: '12px 14px', borderRadius: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
            {filtered.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {filtered.map(s => <button key={s} onClick={() => { setExName(s); setQuery('') }} style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 11, color: '#ef4444', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>{s}</button>)}
              </div>
            )}
            {!query && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {(isCardio ? SUGGESTIONS.cardio : [...SUGGESTIONS.push, ...SUGGESTIONS.pull].slice(0, 8)).map(s => <button key={s} onClick={() => setExName(s)} style={{ padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>{s}</button>)}
              </div>
            )}
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: exName && EXERCISE_INFO[exName] ? 8 : 16 }}>
              {prs[exName] ? `Your PR: ${prs[exName]} lbs — sets will pre-fill` : '3 sets pre-filled · adjust weights as you go'}
            </p>
            {exName && EXERCISE_INFO[exName] && (
              <button onClick={() => setDemoEx(exName)} style={{ width: '100%', padding: '10px 14px', borderRadius: 11, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', marginBottom: 12, fontFamily: 'Satoshi,sans-serif', textAlign: 'left', boxSizing: 'border-box' }}>
                📖 How to do {exName} →
              </button>
            )}
            <button onClick={addExercise} disabled={!exName.trim()} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: exName.trim() ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: exName.trim() ? '#fff' : 'rgba(255,255,255,0.28)', cursor: exName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
              ADD TO WORKOUT →
            </button>
          </div>
        </div>
      )}

      {/* Save template modal */}
      {showSaveTemplate && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowSaveTemplate(false) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF' }}>📌 Save as Template</p>
              <button onClick={() => setShowSaveTemplate(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>TEMPLATE NAME</p>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Push Day A" style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 15, marginBottom: 8, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 20 }}>
              Saves: {exercises.map(e => e.name).join(', ')}
            </p>
            <button onClick={handleSaveTemplate} disabled={!templateName.trim() || savingTemplate} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: templateName.trim() ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: templateName.trim() ? '#fff' : 'rgba(255,255,255,0.28)', cursor: templateName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
              {savingTemplate ? 'SAVING…' : 'SAVE TEMPLATE'}
            </button>
          </div>
        </div>
      )}
      {demoEx && EXERCISE_INFO[demoEx] && <ExerciseDemoModal name={demoEx} info={EXERCISE_INFO[demoEx]} onClose={() => setDemoEx(null)} />}
    </div>
  )

  // ── HISTORY ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Workout</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{weekSessions.length} session{weekSessions.length !== 1 ? 's' : ''} this week</p>
        </div>
        <button onClick={() => { setExercises([]); setSelectedGoalId(null); setSessionName(''); setSelectedTypes([]); nameIsAutoRef.current = true; setView('start') }} style={{ padding: '12px 20px', borderRadius: 16, background: 'linear-gradient(135deg,#ef4444,#f97316)', border: 'none', fontSize: 13, fontWeight: 900, color: '#fff', cursor: 'pointer', letterSpacing: '0.03em', fontFamily: 'Satoshi,sans-serif', boxShadow: '0 6px 24px rgba(239,68,68,0.35)' }}>
          + Plan
        </button>
      </div>

      {/* Body weight card */}
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16, animation: 'fadeUp 0.38s 0.06s ease both' }}>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#38bdf8', marginBottom: 4 }}>📏 BODY WEIGHT</p>
              {latestBw ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{latestBw.weight_lbs}<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 3 }}>lbs</span></p>
                  {bwDelta !== null && bwDelta !== 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: bwDelta > 0 ? '#f87171' : '#4ade80' }}>
                      {bwDelta > 0 ? '+' : ''}{bwDelta}lbs
                    </span>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Not logged yet</p>
              )}
            </div>
            {bwLogs.length >= 2 && <BwSparkline data={bwLogs} />}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" inputMode="decimal" value={bwInput} onChange={e => setBwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogBw()} placeholder="Log today's weight (lbs)" style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.2)', color: '#EFEFEF', fontSize: 14, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
            <button onClick={handleLogBw} disabled={!bwInput || savingBw} style={{ padding: '10px 18px', borderRadius: 12, background: bwInput ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${bwInput ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.07)'}`, fontSize: 13, fontWeight: 800, color: bwInput ? '#38bdf8' : 'rgba(255,255,255,0.28)', cursor: bwInput ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>
              {savingBw ? '…' : 'Log'}
            </button>
          </div>
        </div>
      </div>

      {/* Session history */}
      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.4s 0.1s ease both' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🏋️</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', marginBottom: 8 }}>No workouts yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 24 }}>Start your first session and build your history.</p>
          <button onClick={() => setView('week')} style={{ padding: '13px 28px', borderRadius: 16, background: 'linear-gradient(135deg,#ef4444,#f97316)', border: 'none', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Plan Your Week →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sessions.map((s, i) => {
            const isToday = s.date === today
            return (
              <div key={s.id} style={{ borderRadius: 20, background: '#0d0d0d', border: `1px solid ${isToday ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden', animation: `fadeUp 0.35s ${i*0.05}s ease both` }}>
                <div style={{ height: 4, background: isToday ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.04)' }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', marginBottom: 4 }}>{s.name}</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{relDate(s.date)}</span>
                        {s.duration_mins && <span style={{ fontSize: 11, color: '#ef4444' }}>⏱ {s.duration_mins}min</span>}
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}</span>
                        {s.goalTitle && <span style={{ fontSize: 11, color: '#f97316' }}>→ {s.goalTitle}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑</button>
                  </div>
                  {s.exercises.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {s.exercises.slice(0, 5).map((ex, j) => {
                        const trend = getTrend(ex.name)
                        return (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                            <button onClick={() => setTrendEx(ex.name)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'rgba(255,255,255,0.42)', cursor: trend.length >= 2 ? 'pointer' : 'default', textDecoration: 'none', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>
                              {ex.name}{trend.length >= 2 && <span style={{ color: 'rgba(255,255,255,0.22)', marginLeft: 4 }}>📈</span>}
                            </button>
                            {EXERCISE_INFO[ex.name] && <button onClick={() => setDemoEx(ex.name)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', fontSize: 10, cursor: 'pointer', padding: '0 2px', flexShrink: 0, fontFamily: 'Satoshi,sans-serif' }}>ℹ</button>}
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 700, marginLeft: 2 }}>{fmtSets(ex.sets)}</span>
                          </div>
                        )
                      })}
                      {s.exercises.length > 5 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginLeft: 14 }}>+{s.exercises.length - 5} more</p>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Trend modal */}
      {trendEx && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setTrendEx(null) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', marginBottom: 4 }}>{trendEx}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {prs[trendEx] && <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>PR: {prs[trendEx]}lbs</span>}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{getTrend(trendEx).length} sessions</span>
                </div>
              </div>
              <button onClick={() => setTrendEx(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <TrendLine data={getTrend(trendEx)} />
            {getTrend(trendEx).length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>SESSION HISTORY</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getTrend(trendEx).slice().reverse().slice(0, 6).map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{d.date}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>{d.maxW}lbs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {demoEx && EXERCISE_INFO[demoEx] && <ExerciseDemoModal name={demoEx} info={EXERCISE_INFO[demoEx]} onClose={() => setDemoEx(null)} />}
    </div>
  )
}
