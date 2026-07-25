// Voice-fill prompt schemas — each describes a real form on the site that the
// voice coach can walk someone through by conversation instead of typing.
// The coach asks about these fields conversationally (not one rigid question
// per field necessarily), then extracts a structured `data` object matching
// the field ids once it has enough to fill the form.

export type PromptField = { id: string; label: string; hint?: string }
export type PromptSchemaId = 'checkin_morning' | 'checkin_evening' | 'meal' | 'workout'

export type PromptSchema = {
  id: PromptSchemaId
  title: string
  route: string
  // Injected into the system prompt verbatim — describes exactly what to ask
  // and in what spirit, tailored per schema.
  guidance: string
  fields: PromptField[]
}

export function buildSchemas(qodQuestion: string): Record<PromptSchemaId, PromptSchema> {
  return {
    checkin_morning: {
      id: 'checkin_morning', title: 'Morning Check-in', route: '/journal',
      guidance: `Walk through the morning check-in conversationally, in this rough order: (1) ask today's question of the day, which is exactly: "${qodQuestion}" (2) ask what their intention is for today, (3) ask for their top 1-3 tasks for today, (4) ask what they're most excited about today. Don't interrogate — keep it warm, one or two things per turn, not a rigid checklist read aloud.`,
      fields: [
        { id: 'qod_answer', label: 'Answer to today\'s question' },
        { id: 'intention', label: 'Intention for today' },
        { id: 'task1', label: 'Top task 1' },
        { id: 'task2', label: 'Top task 2' },
        { id: 'task3', label: 'Top task 3' },
        { id: 'excited', label: 'What they\'re excited about' },
      ],
    },
    checkin_evening: {
      id: 'checkin_evening', title: 'Evening Reflection', route: '/journal',
      guidance: `Walk through the evening reflection conversationally: (1) ask for a win from today (required — at least one real thing that went well), (2) ask about a challenge they faced, (3) ask what lesson they're taking from today, (4) ask their energy level today on a 1-10 scale.`,
      fields: [
        { id: 'win', label: 'A win from today' },
        { id: 'challenge', label: 'A challenge faced' },
        { id: 'lesson', label: 'A lesson learned' },
        { id: 'energy', label: 'Energy level 1-10' },
      ],
    },
    meal: {
      id: 'meal', title: 'Log a Meal', route: '/tools/meals',
      guidance: `Help them log a meal they ate. Ask what meal it was (breakfast/lunch/dinner/snack) and what they ate, in plain language — don't ask them to state exact calories or macros, nobody knows that by heart. Once you know the meal type and what they ate, YOU estimate realistic calories/protein/carbs/fat for it yourself (like a nutrition-aware coach would) and include those numbers in the extracted data.`,
      fields: [
        { id: 'mealType', label: 'breakfast, lunch, dinner, or snack' },
        { id: 'name', label: 'What they ate' },
        { id: 'calories', label: 'Estimated calories (number, your best estimate)' },
        { id: 'proteinG', label: 'Estimated protein grams (number)' },
        { id: 'carbsG', label: 'Estimated carb grams (number)' },
        { id: 'fatG', label: 'Estimated fat grams (number)' },
      ],
    },
    workout: {
      id: 'workout', title: 'Log a Workout', route: '/tools/workout',
      guidance: `Help them log a workout they just did. Ask what kind of workout it was (a short name like "Push day" or "Leg day" or "Cardio"), roughly how long it took in minutes, and have them walk through the exercises they did — for each exercise, capture the name and, if they mention it, sets/reps/weight (in lbs). If they don't give exact sets/reps/weight for something, that's fine, just capture what they say. Extract the exercises as a list.`,
      fields: [
        { id: 'name', label: 'Workout name/type' },
        { id: 'durationMins', label: 'Duration in minutes (number)' },
        { id: 'exercises', label: 'List of {name, sets, reps, weightLbs, isCardio}' },
      ],
    },
  }
}
