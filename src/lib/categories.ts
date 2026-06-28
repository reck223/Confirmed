export const CATEGORIES = [
  'health', 'career', 'business', 'finance', 'learning',
  'creative', 'relationships', 'personal', 'adventure', 'material', 'spiritual',
] as const

export function categoryLabel(cat: string | null): string {
  if (!cat) return ''
  const overrides: Record<string, string> = {
    health: 'Health & Fitness',
  }
  return overrides[cat] ?? (cat.charAt(0).toUpperCase() + cat.slice(1))
}

export function categoryStyle(cat: string | null) {
  switch (cat?.toLowerCase()) {
    case 'health':        return { badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400', bar: 'bg-emerald-400' }
    case 'career':        return { badge: 'bg-violet-500/15 text-violet-400',   dot: 'bg-violet-400',  bar: 'bg-violet-400'  }
    case 'business':      return { badge: 'bg-blue-500/15 text-blue-400',       dot: 'bg-blue-400',    bar: 'bg-blue-400'    }
    case 'finance':       return { badge: 'bg-amber-500/15 text-amber-400',     dot: 'bg-amber-400',   bar: 'bg-amber-400'   }
    case 'learning':      return { badge: 'bg-sky-500/15 text-sky-400',         dot: 'bg-sky-400',     bar: 'bg-sky-400'     }
    case 'creative':      return { badge: 'bg-orange-500/15 text-orange-400',   dot: 'bg-orange-400',  bar: 'bg-orange-400'  }
    case 'relationships': return { badge: 'bg-rose-500/15 text-rose-500',       dot: 'bg-rose-500',    bar: 'bg-rose-500'    }
    case 'personal':      return { badge: 'bg-teal-500/15 text-teal-400',       dot: 'bg-teal-400',    bar: 'bg-teal-400'    }
    case 'adventure':     return { badge: 'bg-lime-500/15 text-lime-400',       dot: 'bg-lime-400',    bar: 'bg-lime-400'    }
    case 'material':      return { badge: 'bg-red-500/15 text-red-400',          dot: 'bg-red-400',     bar: 'bg-red-400'     }
    case 'spiritual':     return { badge: 'bg-purple-400/15 text-purple-300',   dot: 'bg-purple-300',  bar: 'bg-purple-300'  }
    default:              return { badge: 'bg-white/10 text-[#EFEFEF]',         dot: 'bg-[#555]',      bar: 'bg-[#D4AF37]'   }
  }
}
