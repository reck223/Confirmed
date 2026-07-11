'use client'
import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  addMeal, deleteMeal, copyLastWeek, estimateCalories,
  saveCalorieTarget, addFavorite, removeFavorite, setWater, generateGroceryList,
  generateMealPlan, bulkAddMeals,
} from './actions'

type Meal     = { id: string; plan_date: string; meal_type: string; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
type Favorite = { id: string; meal_type: string; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
type Pref     = { calorie_target: number | null; protein_target_g: number | null; carbs_target_g: number | null; fat_target_g: number | null }
type WaterLog = { date: string; glasses: number }
type GroceryCat = { category: string; items: string[] }
type ScanResult = { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; confidence: string }

type Props = {
  meals: Meal[]
  weekDays: string[]
  today: string
  weekStart: string
  preferences: Pref | null
  favorites: Favorite[]
  waterLogs: WaterLog[]
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅', color: '#f97316' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️',  color: '#fbbf24' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙',  color: '#a78bfa' },
  { key: 'snack',     label: 'Snack',     emoji: '🍎',  color: '#4ade80' },
]

const DIETS = [
  { key: 'all',     label: 'All',           emoji: '🍽️', color: 'rgba(255,255,255,0.58)'    },
  { key: 'keto',    label: 'Keto',          emoji: '🥑', color: '#4ade80' },
  { key: 'medi',    label: 'Mediterranean', emoji: '🫒', color: '#38bdf8' },
  { key: 'protein', label: 'High Protein',  emoji: '💪', color: '#ef4444' },
  { key: 'vegan',   label: 'Vegan',         emoji: '🌱', color: '#a3e635' },
  { key: 'paleo',   label: 'Paleo',         emoji: '🦴', color: '#f59e0b' },
]

const DIET_MEALS: Record<string, Record<string, string[]>> = {
  all: {
    breakfast: ['Oatmeal','Greek Yogurt','Eggs & Toast','Smoothie','Avocado Toast','Protein Shake','Overnight Oats','Fruit Bowl'],
    lunch:     ['Grilled Chicken Salad','Turkey Wrap','Brown Rice Bowl','Quinoa Salad','Tuna Sandwich','Veggie Stir Fry','Soup','Burrito Bowl'],
    dinner:    ['Salmon & Veggies','Chicken & Rice','Steak & Potatoes','Pasta','Stir Fry','Tacos','Grilled Fish','Lentil Soup'],
    snack:     ['Almonds','Protein Bar','Apple & PB','Cottage Cheese','Hummus & Carrots','Mixed Nuts','Rice Cakes','Banana'],
  },
  keto: {
    breakfast: ['Bacon & Eggs','Avocado & Eggs','Cheese Omelette','Keto Coffee','Smoked Salmon Eggs','Spinach Frittata','Sausage & Eggs','Cream Cheese Pancakes'],
    lunch:     ['BLT Lettuce Wraps','Tuna Salad','Caesar Salad','Ground Beef Bowl','Chicken Avocado Bowl','Cobb Salad','Egg Salad','Steak Salad'],
    dinner:    ['Salmon & Asparagus','Ribeye Steak','Chicken Thighs','Pork Belly','Lamb Chops','Stuffed Bell Peppers','Baked Cod','Pork Ribs'],
    snack:     ['Almonds','String Cheese','Pork Rinds','Macadamia Nuts','Hard Boiled Eggs','Pepperoni Slices','Olives','Celery & PB'],
  },
  medi: {
    breakfast: ['Greek Yogurt & Honey','Whole Grain Toast & Eggs','Fruit & Walnut Bowl','Shakshuka','Labneh & Veggies','Feta Omelette','Olive Toast','Fruit Salad'],
    lunch:     ['Greek Salad','Hummus & Pita','Falafel Wrap','Tuna Niçoise','Fattoush Salad','Lentil Soup','Stuffed Grape Leaves','Caprese Salad'],
    dinner:    ['Grilled Sea Bass','Lamb Chops','Chicken Souvlaki','Stuffed Peppers','Shrimp & Orzo','Baked Salmon','Moussaka','Whole Roasted Chicken'],
    snack:     ['Olives','Hummus & Carrots','Walnuts','Fresh Fruit','Tzatziki & Cucumber','Roasted Chickpeas','Figs','Almonds'],
  },
  protein: {
    breakfast: ['Eggs & Turkey Bacon','Greek Yogurt & Berries','Protein Shake','Cottage Cheese Bowl','Egg White Omelette','Chicken & Eggs','Smoked Salmon','Whey Pancakes'],
    lunch:     ['Grilled Chicken Breast','Turkey & Sweet Potato','Tuna Power Bowl','Ground Beef & Rice','Salmon Bowl','Shrimp Stir Fry','Chicken Wrap','Beef & Broccoli'],
    dinner:    ['Chicken Breast & Veg','Lean Steak','Salmon Fillet','Shrimp & Zucchini','Ground Turkey Bowl','Bison Burger','Tilapia & Rice','Chicken Stir Fry'],
    snack:     ['Protein Bar','Cottage Cheese','Hard Boiled Eggs','Beef Jerky','Greek Yogurt','Edamame','Tuna Pack','Protein Shake'],
  },
  vegan: {
    breakfast: ['Oatmeal & Berries','Smoothie Bowl','Tofu Scramble','Chia Pudding','Avocado Toast','Overnight Oats','Fruit Salad','Coconut Yogurt Parfait'],
    lunch:     ['Buddha Bowl','Lentil Soup','Veggie Wrap','Quinoa Tabbouleh','Falafel Bowl','Chickpea Salad','Black Bean Tacos','Roasted Veggie Bowl'],
    dinner:    ['Chickpea Curry','Red Lentil Dal','Tofu Stir Fry','Veggie Pad Thai','Mushroom Risotto','Black Bean Tacos','Cauliflower Steak','Tempeh Bowl'],
    snack:     ['Apple & Almond Butter','Hummus & Veggies','Trail Mix','Fresh Fruit','Roasted Chickpeas','Rice Cakes','Edamame','Dates & Nut Butter'],
  },
  paleo: {
    breakfast: ['Eggs & Sweet Potato','Bacon & Avocado','Almond Banana Pancakes','Veggie Frittata','Berries & Nuts','Smoked Salmon & Eggs','Turkey Sausage','Coconut Porridge'],
    lunch:     ['Chicken & Roasted Veg','Tuna Lettuce Wraps','Beef & Veggie Bowl','Grilled Salmon Salad','Turkey Avocado Bowl','Pulled Pork Bowl','Shrimp & Cauli Rice','Paleo BLT'],
    dinner:    ['Grass-fed Steak','Baked Salmon','Roast Chicken','Pork Tenderloin','Lamb Chops','Shrimp Skewers','Ground Beef Stir Fry','Whole Roasted Fish'],
    snack:     ['Mixed Nuts','Apple Slices','Beef Jerky','Hard Boiled Eggs','Dried Mango','Coconut Flakes','Sweet Potato Chips','Avocado'],
  },
}

type Recipe = { name: string; time: string; cals: number; tags: string[] }
const DIET_RECIPES: Record<string, Record<string, Recipe[]>> = {
  all: {
    breakfast: [{ name: 'Classic Eggs & Toast', time: '10min', cals: 320, tags: ['Easy','High Protein'] }, { name: 'Overnight Oats', time: '5min', cals: 380, tags: ['Prep Ahead','Fiber'] }, { name: 'Smoothie Bowl', time: '8min', cals: 290, tags: ['Quick','Vitamins'] }],
    lunch:     [{ name: 'Grilled Chicken Salad', time: '20min', cals: 420, tags: ['High Protein','Low Carb'] }, { name: 'Turkey Quinoa Bowl', time: '25min', cals: 480, tags: ['Balanced','Meal Prep'] }, { name: 'Tuna Avocado Wrap', time: '10min', cals: 350, tags: ['Quick','Omega-3'] }],
    dinner:    [{ name: 'Salmon & Roasted Veg', time: '30min', cals: 520, tags: ['Omega-3','Vitamins'] }, { name: 'Chicken Stir Fry', time: '20min', cals: 450, tags: ['Quick','High Protein'] }, { name: 'Lean Beef Tacos', time: '25min', cals: 490, tags: ['Balanced','Crowd Pleaser'] }],
    snack:     [{ name: 'Apple & Almond Butter', time: '2min', cals: 180, tags: ['Quick','Fiber'] }, { name: 'Greek Yogurt Parfait', time: '5min', cals: 220, tags: ['Probiotic','Protein'] }, { name: 'Trail Mix', time: '1min', cals: 200, tags: ['Portable','Energy'] }],
  },
  keto: {
    breakfast: [{ name: 'Bacon & Avocado Eggs', time: '15min', cals: 420, tags: ['Zero Carb','High Fat'] }, { name: 'Keto Cream Cheese Pancakes', time: '20min', cals: 380, tags: ['3g Carb','Satisfying'] }, { name: 'Smoked Salmon Omelette', time: '12min', cals: 360, tags: ['Omega-3','Low Carb'] }],
    lunch:     [{ name: 'BLT Lettuce Wraps', time: '10min', cals: 310, tags: ['1g Carb','Quick'] }, { name: 'Keto Cobb Salad', time: '15min', cals: 480, tags: ['High Fat','Filling'] }, { name: 'Tuna Avocado Bowl', time: '8min', cals: 390, tags: ['No Cook','Omega-3'] }],
    dinner:    [{ name: 'Ribeye & Asparagus', time: '25min', cals: 620, tags: ['Zero Carb','High Fat'] }, { name: 'Lemon Herb Salmon', time: '20min', cals: 480, tags: ['2g Carb','Omega-3'] }, { name: 'Chicken Thighs & Cauliflower', time: '35min', cals: 520, tags: ['Low Carb','Crispy'] }],
    snack:     [{ name: 'Cheese & Salami Board', time: '3min', cals: 230, tags: ['Zero Carb','Satisfying'] }, { name: 'Keto Fat Bombs', time: '10min', cals: 180, tags: ['Prep Ahead','High Fat'] }, { name: 'Hard Boiled Eggs & Salt', time: '12min', cals: 155, tags: ['Simple','Protein'] }],
  },
  medi: {
    breakfast: [{ name: 'Shakshuka', time: '20min', cals: 310, tags: ['Lycopene','Protein'] }, { name: 'Greek Yogurt & Fig Honey', time: '5min', cals: 280, tags: ['Probiotic','Quick'] }, { name: 'Whole Grain Toast & Labneh', time: '8min', cals: 320, tags: ['Fiber','Calcium'] }],
    lunch:     [{ name: 'Classic Greek Salad', time: '10min', cals: 280, tags: ['Heart Healthy','Antioxidants'] }, { name: 'Falafel & Hummus Bowl', time: '15min', cals: 450, tags: ['Plant Protein','Fiber'] }, { name: 'Tuna Niçoise', time: '20min', cals: 380, tags: ['Omega-3','Light'] }],
    dinner:    [{ name: 'Herb Lemon Sea Bass', time: '25min', cals: 420, tags: ['Omega-3','Heart Healthy'] }, { name: 'Greek Lamb Chops', time: '30min', cals: 560, tags: ['High Protein','Iron'] }, { name: 'Stuffed Bell Peppers', time: '40min', cals: 380, tags: ['Vitamins','Fiber'] }],
    snack:     [{ name: 'Hummus & Veggie Sticks', time: '5min', cals: 160, tags: ['Fiber','Plant Protein'] }, { name: 'Olive & Feta Plate', time: '3min', cals: 190, tags: ['Healthy Fats','Calcium'] }, { name: 'Roasted Chickpeas', time: '30min', cals: 180, tags: ['Prep Ahead','Crunchy'] }],
  },
  protein: {
    breakfast: [{ name: 'Egg White Power Omelette', time: '12min', cals: 280, tags: ['35g Protein','Low Fat'] }, { name: 'Cottage Cheese Pancakes', time: '15min', cals: 320, tags: ['25g Protein','Low Carb'] }, { name: 'Chicken & Egg Scramble', time: '15min', cals: 380, tags: ['42g Protein','Post-Workout'] }],
    lunch:     [{ name: 'Grilled Chicken Bowl', time: '25min', cals: 480, tags: ['50g Protein','Meal Prep'] }, { name: 'Ground Turkey & Sweet Potato', time: '30min', cals: 520, tags: ['45g Protein','Clean Carbs'] }, { name: 'Shrimp & Broccoli Stir Fry', time: '20min', cals: 350, tags: ['40g Protein','Low Cal'] }],
    dinner:    [{ name: 'Lean Steak & Veggie Bowl', time: '25min', cals: 560, tags: ['55g Protein','Iron'] }, { name: 'Baked Salmon Fillet', time: '20min', cals: 460, tags: ['42g Protein','Omega-3'] }, { name: 'Ground Bison Burgers', time: '20min', cals: 480, tags: ['50g Protein','Lean'] }],
    snack:     [{ name: 'Cottage Cheese & Berries', time: '2min', cals: 190, tags: ['25g Protein','Quick'] }, { name: 'Tuna Packet & Rice Cakes', time: '3min', cals: 210, tags: ['28g Protein','Portable'] }, { name: 'Greek Yogurt & Protein Powder', time: '3min', cals: 250, tags: ['35g Protein','Easy'] }],
  },
  vegan: {
    breakfast: [{ name: 'Tofu Scramble & Toast', time: '15min', cals: 340, tags: ['18g Protein','Iron'] }, { name: 'Chia Pudding Bowl', time: '5min', cals: 290, tags: ['Prep Ahead','Omega-3'] }, { name: 'Acai Smoothie Bowl', time: '10min', cals: 320, tags: ['Antioxidants','Vitamins'] }],
    lunch:     [{ name: 'Chickpea Buddha Bowl', time: '20min', cals: 430, tags: ['20g Protein','Complete Meal'] }, { name: 'Lentil & Kale Soup', time: '30min', cals: 320, tags: ['Protein','Iron'] }, { name: 'Quinoa Tabbouleh', time: '15min', cals: 360, tags: ['Complete Protein','Fresh'] }],
    dinner:    [{ name: 'Chickpea Tikka Masala', time: '30min', cals: 420, tags: ['22g Protein','Fiber'] }, { name: 'Tempeh Stir Fry', time: '20min', cals: 380, tags: ['25g Protein','Probiotic'] }, { name: 'Black Bean Tacos', time: '20min', cals: 400, tags: ['18g Protein','Fiber'] }],
    snack:     [{ name: 'Dates & Nut Butter', time: '2min', cals: 220, tags: ['Natural Sugar','Magnesium'] }, { name: 'Edamame with Sea Salt', time: '5min', cals: 180, tags: ['18g Protein','Easy'] }, { name: 'Roasted Chickpeas', time: '30min', cals: 190, tags: ['Prep Ahead','Crunchy'] }],
  },
  paleo: {
    breakfast: [{ name: 'Sweet Potato & Egg Hash', time: '25min', cals: 390, tags: ['Whole Food','High Protein'] }, { name: 'Almond Flour Pancakes', time: '20min', cals: 340, tags: ['Grain-Free','Natural'] }, { name: 'Smoked Salmon & Eggs', time: '15min', cals: 360, tags: ['Omega-3','Clean'] }],
    lunch:     [{ name: 'Pulled Chicken Lettuce Bowls', time: '30min', cals: 400, tags: ['Whole Food','High Protein'] }, { name: 'Tuna & Avocado Boats', time: '10min', cals: 370, tags: ['No Cook','Omega-3'] }, { name: 'Beef & Roasted Veggie Bowl', time: '35min', cals: 480, tags: ['Iron','Clean'] }],
    dinner:    [{ name: 'Grass-Fed Steak & Veg', time: '25min', cals: 590, tags: ['Whole Food','Iron'] }, { name: 'Herb Roasted Chicken', time: '50min', cals: 460, tags: ['Meal Prep','High Protein'] }, { name: 'Garlic Butter Shrimp', time: '15min', cals: 320, tags: ['Quick','Low Carb'] }],
    snack:     [{ name: 'Beef Jerky & Almonds', time: '1min', cals: 220, tags: ['Portable','Protein'] }, { name: 'Apple & Almond Butter', time: '2min', cals: 190, tags: ['Natural Sugar','Healthy Fats'] }, { name: 'Coconut Flakes & Berries', time: '3min', cals: 160, tags: ['Antioxidants','Fiber'] }],
  },
}

function dayShort(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) }
function dayNum(d: string)   { return new Date(d + 'T12:00:00').getDate() }

async function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1024
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else       { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function MealsClient({ meals: initMeals, weekDays, today, weekStart, preferences, favorites: initFavs, waterLogs: initWater }: Props) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [meals, setMeals]           = useState(initMeals)
  const [activeDay, setActiveDay]   = useState(today)
  const [selectedDiet, setDiet]     = useState('all')
  const [addModal, setAddModal]     = useState<{ mealType: string } | null>(null)
  const [addTab, setAddTab]         = useState<'quick' | 'recipes'>('quick')
  const [mealName, setMealName]     = useState('')
  const [calories, setCalories]     = useState('')
  const [protein, setProtein]       = useState('')
  const [carbs, setCarbs]           = useState('')
  const [fat, setFat]               = useState('')
  const [showMacros, setShowMacros] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [copying, setCopying]       = useState(false)
  const [, startT]                  = useTransition()
  const fileRef                     = useRef<HTMLInputElement>(null)

  // ── Scan state ──────────────────────────────────────────────────────────────
  const [scanOpen, setScanOpen]       = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanning, setScanning]       = useState(false)
  const [scanResult, setScanResult]   = useState<ScanResult | null>(null)
  const [scanError, setScanError]     = useState<string | null>(null)

  // ── Target state ─────────────────────────────────────────────────────────────
  const [targetCal, setTargetCal]     = useState<number | null>(preferences?.calorie_target ?? null)
  const [targetPro, setTargetPro]     = useState<number | null>(preferences?.protein_target_g ?? null)
  const [targetCarbs, setTargetCarbs] = useState<number | null>(preferences?.carbs_target_g ?? null)
  const [targetFat, setTargetFat]     = useState<number | null>(preferences?.fat_target_g ?? null)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetInput, setTargetInput] = useState(String(preferences?.calorie_target ?? ''))
  const [tProInput, setTProInput]     = useState(String(preferences?.protein_target_g ?? ''))
  const [tCarbInput, setTCarbInput]   = useState(String(preferences?.carbs_target_g ?? ''))
  const [tFatInput, setTFatInput]     = useState(String(preferences?.fat_target_g ?? ''))
  const [showMacroTargets, setShowMacroTargets] = useState(!!(preferences?.protein_target_g))
  const [savingTarget, setSavingTarget] = useState(false)

  // ── Favorites ────────────────────────────────────────────────────────────────
  const [favs, setFavs] = useState<Favorite[]>(initFavs)

  // ── Water ────────────────────────────────────────────────────────────────────
  const [waterMap, setWaterMap] = useState<Record<string, number>>(
    Object.fromEntries(initWater.map(w => [w.date, w.glasses]))
  )

  // ── AI Meal Plan ─────────────────────────────────────────────────────────────
  const [showAiMealModal, setShowAiMealModal] = useState(false)
  const [aiMealGenerating, setAiMealGenerating] = useState(false)
  const [aiMealNote, setAiMealNote]           = useState('')
  const [aiMealError, setAiMealError]         = useState<string | null>(null)

  async function handleGenerateWeekPlan() {
    setAiMealGenerating(true); setAiMealError(null)
    try {
      const generated = await generateMealPlan(weekDays, {
        calorieTarget: targetCal, proteinTarget: targetPro,
        carbsTarget: targetCarbs, fatTarget: targetFat,
        diet: selectedDiet === 'all' ? 'balanced' : selectedDiet, note: aiMealNote,
      })
      if (generated.length === 0) { setAiMealError('No meals returned — try again'); setAiMealGenerating(false); return }
      const saved = await bulkAddMeals(generated)
      const newMeals: Meal[] = saved.map((m: { date?: string; plan_date?: string; meal_type: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }) => ({
        id: crypto.randomUUID(),
        plan_date: (m as { date?: string; plan_date?: string }).date ?? (m as { date?: string; plan_date?: string }).plan_date ?? '',
        meal_type: m.meal_type, name: m.name,
        calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g,
      }))
      setMeals(prev => {
        const ids = new Set(prev.map(x => x.plan_date + '|' + x.meal_type + '|' + x.name))
        return [...prev, ...newMeals.filter(x => !ids.has(x.plan_date + '|' + x.meal_type + '|' + x.name))]
      })
      setShowAiMealModal(false); setAiMealNote('')
    } catch (e) {
      setAiMealError(e instanceof Error ? e.message : 'Generation failed')
    }
    setAiMealGenerating(false)
  }

  // ── Summary & Grocery ────────────────────────────────────────────────────────
  const [showSummary, setShowSummary]         = useState(false)
  const [showGrocery, setShowGrocery]         = useState(false)
  const [groceryList, setGroceryList]         = useState<GroceryCat[] | null>(null)
  const [groceryChecked, setGroceryChecked]   = useState<Set<string>>(new Set())
  const [generatingGrocery, setGeneratingGrocery] = useState(false)
  const [groceryCopied, setGroceryCopied]     = useState(false)

  // ── Computed values ──────────────────────────────────────────────────────────
  const dayMeals     = meals.filter(m => m.plan_date === activeDay)
  const dayCalories  = dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
  const mt           = MEAL_TYPES.find(t => t.key === addModal?.mealType)
  const dietColor    = DIETS.find(d => d.key === selectedDiet)?.color ?? 'rgba(255,255,255,0.55)'
  const quickPicks   = DIET_MEALS[selectedDiet] ?? DIET_MEALS.all
  const recipes      = DIET_RECIPES[selectedDiet] ?? DIET_RECIPES.all
  const currentWater = waterMap[activeDay] ?? 0
  const calPct       = targetCal && dayCalories > 0 ? Math.min(100, Math.round((dayCalories / targetCal) * 100)) : 0
  const overTarget   = targetCal ? dayCalories > targetCal : false

  // Week summary
  const weekStats = weekDays.map(d => {
    const dm = meals.filter(m => m.plan_date === d)
    return { date: d, count: dm.length, cal: dm.reduce((s, m) => s + (m.calories ?? 0), 0), p: dm.reduce((s, m) => s + (m.protein_g ?? 0), 0), c: dm.reduce((s, m) => s + (m.carbs_g ?? 0), 0), f: dm.reduce((s, m) => s + (m.fat_g ?? 0), 0) }
  })
  const trackedDays = weekStats.filter(d => d.count > 0)
  const avgCal  = trackedDays.length ? Math.round(trackedDays.reduce((s, d) => s + d.cal, 0) / trackedDays.length) : 0
  const avgPro  = trackedDays.length ? Math.round(trackedDays.reduce((s, d) => s + d.p,   0) / trackedDays.length) : 0
  const avgCarb = trackedDays.length ? Math.round(trackedDays.reduce((s, d) => s + d.c,   0) / trackedDays.length) : 0
  const avgFat  = trackedDays.length ? Math.round(trackedDays.reduce((s, d) => s + d.f,   0) / trackedDays.length) : 0
  const bestDay = trackedDays.length ? [...trackedDays].sort((a, b) => b.cal - a.cal)[0] : null
  const macroCalTotal = avgPro * 4 + avgCarb * 4 + avgFat * 9
  const proPct  = macroCalTotal > 0 ? Math.round(avgPro  * 4 / macroCalTotal * 100) : 0
  const carbPct = macroCalTotal > 0 ? Math.round(avgCarb * 4 / macroCalTotal * 100) : 0
  const fatPct  = macroCalTotal > 0 ? Math.round(avgFat  * 9 / macroCalTotal * 100) : 0

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function isFav(meal: Meal) { return favs.some(f => f.name === meal.name && f.meal_type === meal.meal_type) }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function openAdd(mealType: string) {
    setAddModal({ mealType }); setMealName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
    setShowMacros(false); setAddTab('quick')
  }
  function closeAdd() { setAddModal(null) }

  async function handleAdd() {
    if (!mealName.trim() || !addModal) return
    setSaving(true)
    const cal = calories ? parseInt(calories) : null
    const pro = protein  ? parseInt(protein)  : null
    const crb = carbs    ? parseInt(carbs)    : null
    const ft  = fat      ? parseInt(fat)      : null
    const tmp: Meal = { id: crypto.randomUUID(), plan_date: activeDay, meal_type: addModal.mealType, name: mealName.trim(), calories: cal, protein_g: pro, carbs_g: crb, fat_g: ft }
    setMeals(prev => [...prev, tmp])
    closeAdd()
    await addMeal(activeDay, addModal.mealType, mealName.trim(), cal, pro, crb, ft)
    setSaving(false)
  }

  function handleDelete(id: string) {
    setMeals(prev => prev.filter(m => m.id !== id))
    startT(() => deleteMeal(id))
  }

  async function handleCopyLastWeek() {
    setCopying(true)
    const newMeals = await copyLastWeek(weekStart)
    if (newMeals.length > 0) {
      setMeals(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [...prev, ...newMeals.filter(m => !ids.has(m.id))]
      })
    }
    setCopying(false)
  }

  function openScan() { setScanOpen(true); setScanPreview(null); setScanResult(null); setScanError(null) }
  function closeScan() { setScanOpen(false) }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanPreview(URL.createObjectURL(file))
    setScanResult(null); setScanError(null)
    e.target.value = ''
  }

  async function handleScan() {
    if (!scanPreview) return
    setScanning(true); setScanError(null)
    try {
      const resp = await fetch(scanPreview)
      const blob = await resp.blob()
      const base64 = await compressImage(new File([blob], 'food.jpg', { type: 'image/jpeg' }))
      setScanResult(await estimateCalories(base64))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally { setScanning(false) }
  }

  async function addScanned(mealType: string) {
    if (!scanResult) return
    const tmp: Meal = { id: crypto.randomUUID(), plan_date: activeDay, meal_type: mealType, name: scanResult.name, calories: scanResult.calories, protein_g: scanResult.protein_g, carbs_g: scanResult.carbs_g, fat_g: scanResult.fat_g }
    setMeals(prev => [...prev, tmp])
    closeScan()
    await addMeal(activeDay, mealType, scanResult.name, scanResult.calories, scanResult.protein_g, scanResult.carbs_g, scanResult.fat_g)
  }

  // Water
  function handleWater(n: number) {
    const next = currentWater === n ? n - 1 : n
    const clamped = Math.max(0, next)
    setWaterMap(prev => ({ ...prev, [activeDay]: clamped }))
    startT(() => setWater(activeDay, clamped))
  }

  // Favorites
  function toggleFav(meal: Meal) {
    const exists = isFav(meal)
    if (exists) {
      setFavs(prev => prev.filter(f => !(f.name === meal.name && f.meal_type === meal.meal_type)))
      startT(() => removeFavorite(meal.name, meal.meal_type))
    } else {
      const tmp: Favorite = { id: crypto.randomUUID(), meal_type: meal.meal_type, name: meal.name, calories: meal.calories, protein_g: meal.protein_g, carbs_g: meal.carbs_g, fat_g: meal.fat_g }
      setFavs(prev => [tmp, ...prev])
      startT(() => addFavorite(meal.name, meal.meal_type, meal.calories, meal.protein_g, meal.carbs_g, meal.fat_g))
    }
  }

  function useFavorite(fav: Favorite) {
    setMealName(fav.name)
    setCalories(fav.calories ? String(fav.calories) : '')
    setProtein(fav.protein_g ? String(fav.protein_g) : '')
    setCarbs(fav.carbs_g ? String(fav.carbs_g) : '')
    setFat(fav.fat_g ? String(fav.fat_g) : '')
    if (fav.protein_g || fav.carbs_g || fav.fat_g) setShowMacros(true)
  }

  // Target
  async function handleSaveTarget() {
    setSavingTarget(true)
    const cal  = targetInput ? parseInt(targetInput) : null
    const pro  = tProInput   ? parseInt(tProInput)   : null
    const crb  = tCarbInput  ? parseInt(tCarbInput)  : null
    const ft   = tFatInput   ? parseInt(tFatInput)   : null
    setTargetCal(cal); setTargetPro(pro); setTargetCarbs(crb); setTargetFat(ft)
    await saveCalorieTarget(cal, pro, crb, ft)
    setSavingTarget(false)
    setShowTargetModal(false)
  }

  // Grocery
  async function handleOpenGrocery() {
    setShowGrocery(true)
    if (groceryList === null && meals.length > 0) {
      setGeneratingGrocery(true)
      const mealsList = meals.map(m => `${dayShort(m.plan_date)} ${m.meal_type}: ${m.name}`)
      try {
        setGroceryList(await generateGroceryList(mealsList))
      } catch { setGroceryList([]) }
      setGeneratingGrocery(false)
    } else if (groceryList === null) {
      setGroceryList([])
    }
  }

  function toggleGroceryItem(item: string) {
    setGroceryChecked(prev => { const n = new Set(prev); n.has(item) ? n.delete(item) : n.add(item); return n })
  }

  async function copyGrocery() {
    if (!groceryList) return
    const text = groceryList.map(c => `${c.category}:\n${c.items.map(i => `• ${i}`).join('\n')}`).join('\n\n')
    await navigator.clipboard.writeText(text)
    setGroceryCopied(true)
    setTimeout(() => setGroceryCopied(false), 2000)
  }

  const confidenceColor: Record<string, string> = { high: '#4ade80', medium: '#fbbf24', low: '#f87171' }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .diet-chip { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
        .diet-chip:hover { transform: translateY(-1px); }
        .water-drop { transition: all 0.15s ease; }
        .water-drop:hover { transform: scale(1.1); }
      `}</style>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* Back */}
      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Meal Prep</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
          Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </p>
        {/* Action buttons — horizontal scroll so they never wrap */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          <button onClick={() => { setShowAiMealModal(true); setAiMealError(null) }} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(99,102,241,0.12))', border: '1px solid rgba(139,92,246,0.35)', fontSize: 12, fontWeight: 800, color: '#a78bfa', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', minHeight: 40 }}>
            ✦ AI Plan
          </button>
          <button onClick={openScan} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 12, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', fontSize: 12, fontWeight: 800, color: '#38bdf8', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', minHeight: 40 }}>
            📸 Scan
          </button>
          <button onClick={handleOpenGrocery} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', fontSize: 12, fontWeight: 800, color: '#4ade80', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', minHeight: 40 }}>
            🛒 Grocery
          </button>
          <button onClick={() => setShowSummary(true)} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 12, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', fontSize: 12, fontWeight: 800, color: '#a78bfa', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', minHeight: 40 }}>
            📊 Summary
          </button>
          <button onClick={handleCopyLastWeek} disabled={copying} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 12, fontWeight: 800, color: copying ? 'rgba(255,255,255,0.28)' : '#f97316', cursor: copying ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', minHeight: 40 }}>
            {copying ? '…' : '↺ Copy Last Week'}
          </button>
        </div>
      </div>

      {/* Diet plan selector */}
      <div style={{ marginBottom: 18, animation: 'fadeUp 0.38s 0.06s ease both' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>DIET PLAN</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {DIETS.map(d => {
            const active = selectedDiet === d.key
            return (
              <button key={d.key} className="diet-chip" onClick={() => setDiet(d.key)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 12, background: active ? `${d.color}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? d.color + '50' : 'rgba(255,255,255,0.07)'}`, fontSize: 12, fontWeight: 800, color: active ? d.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', gap: 5, boxShadow: active ? `0 0 16px ${d.color}25` : 'none' }}>
                <span>{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Water tracker */}
      <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 16, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)', animation: 'fadeUp 0.39s 0.07s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)' }}>💧 HYDRATION</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: currentWater >= 8 ? '#4ade80' : '#38bdf8' }}>
            {currentWater} / 8 glasses
          </p>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = i < currentWater
            return (
              <button key={i} className="water-drop" onClick={() => handleWater(i + 1)} style={{ flex: 1, height: 34, borderRadius: 10, background: filled ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.03)', border: `1px solid ${filled ? 'rgba(56,189,248,0.45)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', fontSize: 14, color: filled ? '#38bdf8' : '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {filled ? '💧' : '·'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, animation: 'fadeUp 0.4s 0.08s ease both' }}>
        {weekDays.map(d => {
          const isToday  = d === today
          const isActive = d === activeDay
          const hasMeals = meals.some(m => m.plan_date === d)
          return (
            <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, padding: '10px 0', borderRadius: 14, cursor: 'pointer', border: 'none', background: isActive ? 'linear-gradient(135deg,#f97316,#fbbf24)' : 'rgba(255,255,255,0.03)', outline: isToday && !isActive ? '2px solid rgba(249,115,22,0.4)' : 'none', outlineOffset: 2 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{dayShort(d).toUpperCase()}</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: isActive ? '#0A0A0A' : '#EFEFEF' }}>{dayNum(d)}</p>
              {hasMeals && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? '#0A0A0A' : '#f97316', margin: '4px auto 0' }} />}
            </button>
          )
        })}
      </div>

      {/* Calorie summary + progress bar */}
      {(dayCalories > 0 || targetCal !== null) && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 16, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', animation: 'fadeUp 0.3s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: 22, marginTop: 2 }}>🔥</span>
            <div style={{ flex: 1 }}>
              {/* Calories + target */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: overTarget ? '#f87171' : '#f97316', lineHeight: 1 }}>
                    {dayCalories.toLocaleString()}
                  </p>
                  {targetCal && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>/ {targetCal.toLocaleString()} cal</p>}
                  {!targetCal && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>cal</p>}
                </div>
                {/* Macros */}
                {(() => {
                  const p = dayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0)
                  const c = dayMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0)
                  const f = dayMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0)
                  return (p + c + f > 0) ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {p > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8' }}>{p}g P</span>}
                      {c > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>{c}g C</span>}
                      {f > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316' }}>{f}g F</span>}
                    </div>
                  ) : null
                })()}
              </div>
              {/* Progress bar */}
              {targetCal && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${calPct}%`, background: overTarget ? '#f87171' : calPct >= 80 ? '#4ade80' : '#f97316', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{calPct}% of daily goal</p>
                    <button onClick={() => setShowTargetModal(true)} style={{ background: 'none', border: 'none', fontSize: 10, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0, fontFamily: 'Satoshi,sans-serif' }}>Edit goal →</button>
                  </div>
                </div>
              )}
              {!targetCal && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                  <button onClick={() => setShowTargetModal(true)} style={{ background: 'none', border: 'none', fontSize: 10, color: '#f97316', cursor: 'pointer', padding: 0, fontFamily: 'Satoshi,sans-serif', fontWeight: 700 }}>Set daily goal →</button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {dayCalories === 0 && !targetCal && null}

      {/* "Set goal" prompt if no meals yet and no target */}
      {dayCalories === 0 && !targetCal && (
        <div style={{ marginBottom: 16, animation: 'fadeUp 0.3s ease both' }}>
          <button onClick={() => setShowTargetModal(true)} style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
            🎯 Set daily calorie goal
          </button>
        </div>
      )}

      {/* Meal type sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {MEAL_TYPES.map((mealType, i) => {
          const typeMeals    = dayMeals.filter(m => m.meal_type === mealType.key)
          const typeCalories = typeMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
          return (
            <div key={mealType.key} style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', animation: `fadeUp 0.4s ${i * 0.06}s ease both` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: typeMeals.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${mealType.color}18`, border: `1px solid ${mealType.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                    {mealType.emoji}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#EFEFEF' }}>{mealType.label}</p>
                    {typeCalories > 0 && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{typeCalories} cal</p>}
                  </div>
                </div>
                <button onClick={() => openAdd(mealType.key)} style={{ width: 30, height: 30, borderRadius: '50%', background: `${mealType.color}15`, border: `1px solid ${mealType.color}30`, color: mealType.color, fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>

              {typeMeals.map(meal => (
                <div key={meal.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: mealType.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</p>
                    {(meal.calories || meal.protein_g || meal.carbs_g || meal.fat_g) && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                        {meal.calories  && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{meal.calories} cal</span>}
                        {meal.protein_g && <span style={{ fontSize: 10, color: '#38bdf8' }}>{meal.protein_g}g P</span>}
                        {meal.carbs_g   && <span style={{ fontSize: 10, color: '#fbbf24' }}>{meal.carbs_g}g C</span>}
                        {meal.fat_g     && <span style={{ fontSize: 10, color: '#f97316' }}>{meal.fat_g}g F</span>}
                      </div>
                    )}
                  </div>
                  {/* Favorite toggle */}
                  <button onClick={() => toggleFav(meal)} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', padding: 4, color: isFav(meal) ? '#fbbf24' : '#252525', flexShrink: 0, transition: 'color 0.15s ease' }} title={isFav(meal) ? 'Remove from favorites' : 'Save as favorite'}>
                    {isFav(meal) ? '★' : '☆'}
                  </button>
                  <button onClick={() => handleDelete(meal.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 }}>×</button>
                </div>
              ))}

              {typeMeals.length === 0 && (
                <button onClick={() => openAdd(mealType.key)} style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>+ Add {mealType.label.toLowerCase()}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Add meal modal ── */}
      {addModal && mt && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) closeAdd() }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{mt.emoji}</span>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF' }}>Add {mt.label}</p>
              </div>
              <button onClick={closeAdd} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, padding: '4px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['quick', 'recipes'] as const).map(tab => (
                <button key={tab} onClick={() => setAddTab(tab)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: addTab === tab ? 'rgba(255,255,255,0.08)' : 'none', border: 'none', fontSize: 12, fontWeight: 800, color: addTab === tab ? '#EFEFEF' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {tab === 'quick' ? '⚡ Quick Add' : '👨‍🍳 Recipes'}
                </button>
              ))}
            </div>

            {addTab === 'quick' && (
              <>
                {/* Favorites for this meal type */}
                {(() => {
                  const mealFavs = favs.filter(f => f.meal_type === mt.key)
                  return mealFavs.length > 0 ? (
                    <div style={{ marginBottom: 18 }}>
                      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#fbbf24', marginBottom: 10 }}>⭐ FAVORITES</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {mealFavs.map(f => (
                          <button key={f.id} onClick={() => useFavorite(f)} style={{ padding: '6px 12px', borderRadius: 99, background: mealName === f.name ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.06)', border: `1px solid ${mealName === f.name ? 'rgba(251,191,36,0.5)' : 'rgba(251,191,36,0.2)'}`, fontSize: 12, color: '#fbbf24', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span>{f.name}</span>
                            {f.calories && <span style={{ fontSize: 9, opacity: 0.7 }}>{f.calories}cal</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Diet quick picks */}
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
                  {selectedDiet !== 'all' ? `${DIETS.find(d => d.key === selectedDiet)?.label?.toUpperCase()} PICKS` : 'QUICK PICKS'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
                  {quickPicks[mt.key]?.map(q => (
                    <button key={q} onClick={() => setMealName(q)} style={{ padding: '6px 12px', borderRadius: 99, background: mealName === q ? `${mt.color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${mealName === q ? mt.color + '50' : 'rgba(255,255,255,0.08)'}`, fontSize: 12, color: mealName === q ? mt.color : 'rgba(255,255,255,0.48)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s ease' }}>
                      {q}
                    </button>
                  ))}
                </div>

                <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder={`Or type your ${mt.label.toLowerCase()}…`} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>CALORIES</p>
                    <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="e.g. 450" style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
                  </div>
                  <button onClick={() => setShowMacros(s => !s)} style={{ alignSelf: 'flex-end', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Satoshi,sans-serif' }}>
                    {showMacros ? 'Hide macros' : '+ Macros'}
                  </button>
                </div>

                {showMacros && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[{ label: 'PROTEIN', val: protein, set: setProtein, color: '#38bdf8' }, { label: 'CARBS', val: carbs, set: setCarbs, color: '#fbbf24' }, { label: 'FAT', val: fat, set: setFat, color: '#f97316' }].map(m => (
                      <div key={m.label}>
                        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: m.color, marginBottom: 5 }}>{m.label} (g)</p>
                        <input type="number" value={m.val} onChange={e => m.set(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: `1px solid ${m.color}25`, color: '#EFEFEF', fontSize: 14, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={handleAdd} disabled={!mealName.trim() || saving} style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: mealName.trim() ? `linear-gradient(135deg,${mt.color},${mt.color}bb)` : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: mealName.trim() ? '#0A0A0A' : 'rgba(255,255,255,0.28)', cursor: mealName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif', marginBottom: 10 }}>
                  {saving ? 'SAVING…' : `ADD ${mt.label.toUpperCase()}`}
                </button>

                <button onClick={() => { closeAdd(); openScan() }} style={{ width: '100%', padding: '12px 0', borderRadius: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', fontSize: 12, fontWeight: 700, color: '#38bdf8', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  📸 Scan food with AI instead →
                </button>
              </>
            )}

            {addTab === 'recipes' && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
                  {selectedDiet !== 'all' ? `${DIETS.find(d => d.key === selectedDiet)?.label?.toUpperCase()} RECIPES` : 'RECIPE IDEAS'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(recipes[mt.key] ?? []).map(r => (
                    <div key={r.name} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>{r.name}</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>⏱ {r.time}</span>
                          <span style={{ fontSize: 10, color: mt.color, fontWeight: 700 }}>≈ {r.cals} cal</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {r.tags.map(tag => (
                            <span key={tag} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${dietColor}15`, color: dietColor, border: `1px solid ${dietColor}25` }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => { setMealName(r.name); setCalories(String(r.cals)); setAddTab('quick') }} style={{ padding: '10px 14px', borderRadius: 12, background: `${mt.color}15`, border: `1px solid ${mt.color}30`, fontSize: 11, fontWeight: 800, color: mt.color, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Use this
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Photo calorie scanner modal ── */}
      {scanOpen && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) closeScan() }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', marginBottom: 2 }}>📸 Scan Food</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Claude AI estimates calories from your photo</p>
              </div>
              <button onClick={closeScan} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div onClick={() => fileRef.current?.click()} style={{ width: '100%', aspectRatio: '16/9', borderRadius: 18, border: `2px dashed ${scanPreview ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}`, background: scanPreview ? 'none' : 'rgba(255,255,255,0.02)', marginBottom: 16, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {scanPreview ? (
                <img src={scanPreview} alt="Food preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>📷</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 4 }}>Tap to take a photo</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>or choose from your library</p>
                </div>
              )}
            </div>

            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '13px 0', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 700, color: '#EFEFEF', cursor: 'pointer', marginBottom: 12, fontFamily: 'Satoshi,sans-serif' }}>
              {scanPreview ? '📷 Choose Different Photo' : '📷 Choose Photo'}
            </button>

            {scanPreview && !scanResult && (
              <button onClick={handleScan} disabled={scanning} style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: scanning ? 'rgba(56,189,248,0.1)' : 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', fontSize: 14, fontWeight: 900, color: scanning ? '#38bdf8' : '#fff', cursor: scanning ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {scanning ? (
                  <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #38bdf8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />Claude is analyzing…</>
                ) : '🔍 ANALYZE WITH AI →'}
              </button>
            )}

            {scanError && (
              <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#f87171' }}>{scanError}</p>
              </div>
            )}

            {scanResult && (
              <div style={{ animation: 'fadeUp 0.35s ease both' }}>
                <div style={{ padding: '18px 20px', borderRadius: 18, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>{scanResult.name}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${confidenceColor[scanResult.confidence] ?? 'rgba(255,255,255,0.55)'}20`, color: confidenceColor[scanResult.confidence] ?? 'rgba(255,255,255,0.55)', border: `1px solid ${confidenceColor[scanResult.confidence] ?? 'rgba(255,255,255,0.55)'}40` }}>
                        {scanResult.confidence} confidence
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{scanResult.calories}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>calories</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[{ v: scanResult.protein_g, l: 'PROTEIN', c: '#38bdf8' }, { v: scanResult.carbs_g, l: 'CARBS', c: '#fbbf24' }, { v: scanResult.fat_g, l: 'FAT', c: '#f97316' }].map(m => (
                      <div key={m.l} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: m.c }}>{m.v}g</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em' }}>{m.l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>ADD TO</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {MEAL_TYPES.map(t => (
                    <button key={t.key} onClick={() => addScanned(t.key)} style={{ padding: '13px 0', borderRadius: 14, background: `${t.color}12`, border: `1px solid ${t.color}30`, fontSize: 13, fontWeight: 800, color: t.color, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>

                <button onClick={() => { setScanResult(null); setScanPreview(null) }} style={{ width: '100%', padding: '12px 0', borderRadius: 14, background: 'none', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginTop: 10 }}>
                  ↺ Scan a different photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Calorie target modal ── */}
      {showTargetModal && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowTargetModal(false) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', marginBottom: 2 }}>🎯 Daily Targets</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Set your nutrition goals</p>
              </div>
              <button onClick={() => setShowTargetModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>DAILY CALORIES</p>
            <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="e.g. 2000" style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(249,115,22,0.25)', color: '#EFEFEF', fontSize: 16, fontWeight: 700, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none', marginBottom: 16 }} />

            <button onClick={() => setShowMacroTargets(s => !s)} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 700, color: showMacroTargets ? '#EFEFEF' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 16 }}>
              {showMacroTargets ? '▾' : '▸'} Macro targets (optional)
            </button>

            {showMacroTargets && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[{ label: 'PROTEIN', val: tProInput, set: setTProInput, color: '#38bdf8' }, { label: 'CARBS', val: tCarbInput, set: setTCarbInput, color: '#fbbf24' }, { label: 'FAT', val: tFatInput, set: setTFatInput, color: '#f97316' }].map(m => (
                  <div key={m.label}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: m.color, marginBottom: 6 }}>{m.label} (g)</p>
                    <input type="number" value={m.val} onChange={e => m.set(e.target.value)} placeholder="0" style={{ width: '100%', padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${m.color}25`, color: '#EFEFEF', fontSize: 14, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSaveTarget} disabled={savingTarget} style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: 'linear-gradient(135deg,#f97316,#fbbf24)', border: 'none', fontSize: 14, fontWeight: 900, color: '#0A0A0A', cursor: savingTarget ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
              {savingTarget ? 'SAVING…' : 'SAVE TARGETS'}
            </button>
          </div>
        </div>
      )}

      {/* ── AI Meal Plan Modal ── */}
      {showAiMealModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget && !aiMealGenerating) setShowAiMealModal(false) }}>
          <div style={{ width: '100%', maxWidth: 480, borderRadius: 24, background: '#0e0e14', border: '1px solid rgba(139,92,246,0.3)', padding: '32px 28px', animation: 'slideUp 0.22s ease both', boxShadow: '0 0 60px rgba(139,92,246,0.15)' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>✦</span>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em' }}>Generate Week Plan</p>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
                AI will build a full 7-day meal plan — breakfast, lunch, dinner & snack — tailored to your targets and diet style.
              </p>
            </div>

            {/* Context chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {targetCal && (
                <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', fontSize: 11, fontWeight: 700, color: '#f97316' }}>🔥 {targetCal} kcal/day</span>
              )}
              {targetPro && (
                <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 11, fontWeight: 700, color: '#f87171' }}>💪 {targetPro}g protein</span>
              )}
              <span style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>
                {DIETS.find(d => d.key === selectedDiet)?.emoji} {DIETS.find(d => d.key === selectedDiet)?.label}
              </span>
              {!targetCal && !targetPro && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>No targets set — balanced portions will be used</span>
              )}
            </div>

            {/* Notes input */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>EXTRA NOTES (optional)</p>
              <textarea
                value={aiMealNote}
                onChange={e => setAiMealNote(e.target.value)}
                disabled={aiMealGenerating}
                placeholder="e.g. I hate fish, I love spicy food, keep lunches simple..."
                rows={3}
                style={{ width: '100%', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#EFEFEF', fontSize: 13, padding: '12px 14px', fontFamily: 'Satoshi,sans-serif', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
            </div>

            {aiMealError && (
              <p style={{ fontSize: 12, color: '#f87171', marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>⚠ {aiMealError}</p>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAiMealModal(false)} disabled={aiMealGenerating} style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700, cursor: aiMealGenerating ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                Cancel
              </button>
              <button onClick={handleGenerateWeekPlan} disabled={aiMealGenerating} style={{ flex: 2, padding: '14px', borderRadius: 14, background: aiMealGenerating ? 'rgba(139,92,246,0.12)' : 'linear-gradient(135deg,#8b5cf6,#6366f1)', border: 'none', color: aiMealGenerating ? '#6b5b9a' : '#fff', fontSize: 13, fontWeight: 800, cursor: aiMealGenerating ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.01em' }}>
                {aiMealGenerating ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #6b5b9a', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Building your week...
                  </>
                ) : '✦ Generate Week Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly summary modal ── */}
      {showSummary && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowSummary(false) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', marginBottom: 2 }}>📊 This Week</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </p>
              </div>
              <button onClick={() => setShowSummary(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {trackedDays.length === 0 ? (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '40px 0' }}>No meals logged this week yet.</p>
            ) : (
              <>
                {/* Days tracked */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                  <div style={{ flex: 1, padding: '16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{trackedDays.length}<span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>/7</span></p>
                    <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 6 }}>DAYS LOGGED</p>
                  </div>
                  <div style={{ flex: 1, padding: '16px', borderRadius: 16, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>{avgCal.toLocaleString()}</p>
                    <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 6 }}>AVG CAL / DAY</p>
                    {targetCal && <p style={{ fontSize: 10, color: avgCal > targetCal ? '#f87171' : '#4ade80', marginTop: 2 }}>{avgCal > targetCal ? '+' : ''}{avgCal - targetCal} vs goal</p>}
                  </div>
                </div>

                {/* Macro breakdown */}
                {macroCalTotal > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>MACROS (avg/day)</p>
                    {[
                      { label: 'Protein', val: avgPro, pct: proPct, color: '#38bdf8', target: targetPro },
                      { label: 'Carbs',   val: avgCarb, pct: carbPct, color: '#fbbf24', target: targetCarbs },
                      { label: 'Fat',     val: avgFat,  pct: fatPct,  color: '#f97316', target: targetFat },
                    ].map(m => (
                      <div key={m.label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.label}</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                            {m.val}g {m.pct > 0 && <span style={{ color: 'rgba(255,255,255,0.28)' }}>({m.pct}%)</span>}
                            {m.target && <span style={{ color: 'rgba(255,255,255,0.28)' }}> / {m.target}g</span>}
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${m.target ? Math.min(100, Math.round(m.val / m.target * 100)) : m.pct}%`, background: m.color, transition: 'width 0.4s ease', opacity: 0.85 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Day breakdown */}
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>DAILY BREAKDOWN</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {weekStats.map(day => {
                    const maxCal = Math.max(...weekStats.map(d => d.cal), 1)
                    const pct    = Math.round(day.cal / maxCal * 100)
                    return (
                      <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: day.date === today ? '#f97316' : 'rgba(255,255,255,0.42)', width: 28, flexShrink: 0 }}>{dayShort(day.date)}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: day.count === 0 ? 'transparent' : day.date === today ? '#f97316' : 'rgba(249,115,22,0.4)', transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, color: day.count > 0 ? '#EFEFEF' : 'rgba(255,255,255,0.18)', width: 60, textAlign: 'right', flexShrink: 0 }}>
                          {day.count > 0 ? `${day.cal.toLocaleString()} cal` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {bestDay && (
                  <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                      Best day: {dayShort(bestDay.date)} · {bestDay.cal.toLocaleString()} cal
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Grocery list modal ── */}
      {showGrocery && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px 16px' }} onClick={e => { if (e.target === e.currentTarget) setShowGrocery(false) }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', marginBottom: 2 }}>🛒 Grocery List</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Based on {meals.length} meals this week</p>
              </div>
              <button onClick={() => setShowGrocery(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {generatingGrocery && (
              <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #4ade80', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Claude is building your list…</p>
              </div>
            )}

            {!generatingGrocery && groceryList !== null && groceryList.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                  {meals.length === 0 ? 'Add some meals to your plan first.' : 'Could not generate list. Try again.'}
                </p>
                {meals.length > 0 && (
                  <button onClick={async () => { setGroceryList(null); setGeneratingGrocery(true); const list = await generateGroceryList(meals.map(m => `${dayShort(m.plan_date)} ${m.meal_type}: ${m.name}`)); setGroceryList(list); setGeneratingGrocery(false) }} style={{ marginTop: 14, padding: '10px 20px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', fontSize: 12, fontWeight: 700, color: '#4ade80', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                    Try again
                  </button>
                )}
              </div>
            )}

            {!generatingGrocery && groceryList && groceryList.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, marginTop: 16 }}>
                  <button onClick={copyGrocery} style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: groceryCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${groceryCopied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`, fontSize: 12, fontWeight: 700, color: groceryCopied ? '#4ade80' : '#EFEFEF', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                    {groceryCopied ? '✓ Copied!' : '📋 Copy list'}
                  </button>
                  <button onClick={() => { setGroceryList(null); setGroceryChecked(new Set()); setGeneratingGrocery(true); generateGroceryList(meals.map(m => `${dayShort(m.plan_date)} ${m.meal_type}: ${m.name}`)).then(l => { setGroceryList(l); setGeneratingGrocery(false) }) }} style={{ padding: '11px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', fontSize: 12, fontWeight: 700, color: '#4ade80', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap' }}>
                    ↺ Refresh
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {groceryList.map(cat => (
                    <div key={cat.category}>
                      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#4ade80', marginBottom: 10 }}>{cat.category.toUpperCase()}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cat.items.map(item => {
                          const checked = groceryChecked.has(item)
                          return (
                            <button key={item} onClick={() => toggleGroceryItem(item)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: checked ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', textAlign: 'left' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? '#4ade80' : 'rgba(255,255,255,0.15)'}`, background: checked ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' }}>
                                {checked && <span style={{ fontSize: 10, color: '#0A0A0A', fontWeight: 900 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: 13, color: checked ? 'rgba(255,255,255,0.35)' : '#EFEFEF', textDecoration: checked ? 'line-through' : 'none', fontFamily: 'Satoshi,sans-serif', fontWeight: 500, transition: 'all 0.15s ease' }}>{item}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
