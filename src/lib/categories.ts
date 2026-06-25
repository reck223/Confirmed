export const CATEGORIES = ['health', 'career', 'finance', 'learning', 'creative', 'relationships', 'personal'] as const

export function categoryStyle(cat: string | null) {
  switch (cat?.toLowerCase()) {
    case 'health':        return { badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400', bar: 'bg-emerald-400' }
    case 'career':        return { badge: 'bg-violet-500/15 text-violet-400',   dot: 'bg-violet-400',  bar: 'bg-violet-400'  }
    case 'finance':       return { badge: 'bg-amber-500/15 text-amber-400',     dot: 'bg-amber-400',   bar: 'bg-amber-400'   }
    case 'learning':      return { badge: 'bg-sky-500/15 text-sky-400',         dot: 'bg-sky-400',     bar: 'bg-sky-400'     }
    case 'creative':      return { badge: 'bg-orange-500/15 text-orange-400',   dot: 'bg-orange-400',  bar: 'bg-orange-400'  }
    case 'relationships': return { badge: 'bg-rose-500/15 text-rose-400',       dot: 'bg-rose-400',    bar: 'bg-rose-400'    }
    case 'personal':      return { badge: 'bg-teal-500/15 text-teal-400',       dot: 'bg-teal-400',    bar: 'bg-teal-400'    }
    default:              return { badge: 'bg-white/10 text-[#EFEFEF]',         dot: 'bg-[#555]',      bar: 'bg-[#D4AF37]'   }
  }
}
