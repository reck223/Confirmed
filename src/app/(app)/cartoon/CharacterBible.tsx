'use client'

import React, { useState, useRef } from 'react'

// ─── types ────────────────────────────────────────────────────────────────────
export type CharRelation = {
  charId: string
  type: 'family' | 'rival' | 'ally' | 'mentor' | 'romantic' | 'enemy' | 'colleague'
  label: string
}

export type FullChar = {
  id: string
  name: string
  age: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  occupation: string
  personality: string[]
  motivation: string
  backstory: string
  catchphrase: string
  description: string
  refImages: string[]   // [front, ¾ front, side, back]
  relationships: CharRelation[]
  archived: boolean
  analyzing: boolean
}

type BibleView = 'grid' | 'detail' | 'map'

// ─── constants ────────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; glow: string }> = {
  protagonist: { label: 'Protagonist', color: '#D4AF37', glow: 'rgba(212,175,55,.3)' },
  antagonist:  { label: 'Antagonist',  color: '#ff4f4f', glow: 'rgba(255,79,79,.3)'  },
  supporting:  { label: 'Supporting',  color: '#00d4ff', glow: 'rgba(0,212,255,.3)'  },
  recurring:   { label: 'Recurring',   color: '#a78bfa', glow: 'rgba(167,139,250,.3)'},
}

const RELATION_META: Record<string, { color: string; label: string }> = {
  family:    { color: '#D4AF37', label: 'Family'    },
  ally:      { color: '#4ade80', label: 'Ally'      },
  rival:     { color: '#ff4f4f', label: 'Rival'     },
  enemy:     { color: '#f97316', label: 'Enemy'     },
  romantic:  { color: '#f472b6', label: 'Romantic'  },
  mentor:    { color: '#00d4ff', label: 'Mentor'    },
  colleague: { color: '#a78bfa', label: 'Colleague' },
}

const ANGLE_LABELS = ['Front', '¾ Front', 'Side', 'Back']

const uid = () => Math.random().toString(36).slice(2, 9)

// Split a turnaround sheet (4-across wide image) into 4 portrait strips
async function splitTurnaround(dataUrl: string): Promise<string[]> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => {
      const sliceW = Math.floor(img.width / 4)
      const strips: string[] = []
      for (let i = 0; i < 4; i++) {
        const canvas = document.createElement('canvas')
        canvas.width  = sliceW
        canvas.height = img.height
        canvas.getContext('2d')!.drawImage(img, i * sliceW, 0, sliceW, img.height, 0, 0, sliceW, img.height)
        strips.push(canvas.toDataURL('image/png'))
      }
      resolve(strips)
    }
    img.src = dataUrl
  })
}

// Call Vision API with a base64 data URL (for turnaround auto-describe)
async function describeFromDataUrl(dataUrl: string): Promise<string> {
  const [header, b64] = dataUrl.split(',')
  const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  try {
    const res = await fetch('/api/cartoon/analyze-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: b64, mediaType }),
    })
    const { description } = await res.json()
    return description ?? ''
  } catch { return '' }
}

export function makeBlankChar(): FullChar {
  return {
    id: uid(), name: '', age: '', role: 'supporting',
    occupation: '', personality: [], motivation: '',
    backstory: '', catchphrase: '', description: '',
    refImages: [], relationships: [],
    archived: false, analyzing: false,
  }
}

// migrate old format (refImage string → refImages[])
export function migrateChar(raw: Record<string, unknown>): FullChar {
  const base = makeBlankChar()
  const images: string[] = Array.isArray(raw.refImages)
    ? raw.refImages as string[]
    : raw.refImage ? [raw.refImage as string] : []
  return {
    ...base, ...raw,
    refImages: images,
    personality: Array.isArray(raw.personality) ? raw.personality as string[] : [],
    relationships: Array.isArray(raw.relationships) ? raw.relationships as CharRelation[] : [],
    archived: !!raw.archived,
    analyzing: false,
  } as FullChar
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  :root { --cyan:#00d4ff; --gold:#D4AF37; --bg:#050508; --card:#080812; --border:rgba(0,212,255,.15); }
  .holo-card { background:var(--card);border:1px solid var(--border);border-radius:14px;transition:all .25s;position:relative;overflow:hidden; }
  .holo-card::before { content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,212,255,.018) 3px,rgba(0,212,255,.018) 4px);pointer-events:none;border-radius:14px; }
  .holo-card:hover { border-color:rgba(0,212,255,.4);box-shadow:0 0 28px rgba(0,212,255,.12),0 0 60px rgba(0,212,255,.05); }
  .holo-card.selected { border-color:rgba(0,212,255,.6);box-shadow:0 0 30px rgba(0,212,255,.18); }
  .role-badge { display:inline-flex;align-items:center;padding:3px 10px;border-radius:4px;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em; }
  .trait-tag { display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:.72rem;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);color:#00d4ff;cursor:pointer;transition:all .15s; }
  .trait-tag:hover { background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.3); }
  .fi { background:#0a0a18;border:1px solid rgba(0,212,255,.18);border-radius:8px;color:#e0e8ff;padding:9px 13px;width:100%;font-size:.88rem;outline:none;transition:border-color .2s;font-family:inherit; }
  .fi:focus { border-color:rgba(0,212,255,.5); }
  .fi:disabled { opacity:.35; }
  .fl { font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(0,212,255,.5);margin-bottom:5px;display:block; }
  .gb { background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.25);color:#00d4ff;border-radius:8px;padding:9px 20px;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap; }
  .gb:hover { background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.5);box-shadow:0 0 16px rgba(0,212,255,.15); }
  .gg { background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);color:#D4AF37;border-radius:8px;padding:9px 20px;font-size:.88rem;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap; }
  .gg:hover { background:rgba(212,175,55,.16);box-shadow:0 0 16px rgba(212,175,55,.2); }
  .gr { background:rgba(255,79,79,.06);border:1px solid rgba(255,79,79,.25);color:#ff4f4f;border-radius:6px;padding:5px 12px;font-size:.78rem;cursor:pointer;transition:all .15s; }
  .gr:hover { background:rgba(255,79,79,.12); }
  .tab-btn { padding:11px 18px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(0,212,255,.35);font-size:.85rem;cursor:pointer;transition:all .15s;letter-spacing:.04em; }
  .tab-btn.on { color:#00d4ff;border-bottom-color:#00d4ff; }
  .tab-btn:hover:not(.on) { color:rgba(0,212,255,.6); }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes glow-pulse { 0%,100%{box-shadow:0 0 10px rgba(0,212,255,.15)}50%{box-shadow:0 0 22px rgba(0,212,255,.35)} }
  @keyframes scan { from{top:-20%}to{top:120%} }
  .img-slot { aspect-ratio:3/4;background:#080812;border:1px solid rgba(0,212,255,.12);border-radius:10px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s; }
  .img-slot:hover { border-color:rgba(0,212,255,.35); }
  .img-slot.has-img { border-color:rgba(0,212,255,.3); }
`

// ─── main export ──────────────────────────────────────────────────────────────
export function CharacterBible({ chars, setChars, analyzeCharImg }: {
  chars: FullChar[]
  setChars: (c: FullChar[]) => void
  analyzeCharImg: (id: string, file: File, imgIdx: number) => void
}) {
  const [view, setView]           = useState<BibleView>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [newTrait, setNewTrait]   = useState('')

  const selected = chars.find(c => c.id === selectedId) ?? null

  const updateChar = (id: string, patch: Partial<FullChar>) =>
    setChars(chars.map(c => c.id === id ? { ...c, ...patch } : c))

  const addChar = () => {
    const c = makeBlankChar()
    setChars([...chars, c])
    setSelectedId(c.id)
    setView('detail')
  }

  const archiveChar = (id: string) => {
    updateChar(id, { archived: true })
    setSelectedId(null)
    setView('grid')
  }

  const visible = chars.filter(c => showArchived ? c.archived : !c.archived)

  return (
    <div style={{ color: '#e0e8ff' }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: '.7rem', letterSpacing: '.14em', color: 'rgba(0,212,255,.5)', textTransform: 'uppercase', marginBottom: 3 }}>Character System</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e0e8ff', margin: 0 }}>
            {view === 'grid'   ? 'Cast Bible'          : ''}
            {view === 'detail' ? selected?.name || 'New Character' : ''}
            {view === 'map'    ? 'Relationship Map'    : ''}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {view === 'detail' && <button className="gb" onClick={() => { setSelectedId(null); setView('grid') }}>← Bible</button>}
          {view === 'grid' && (
            <>
              <button className="gb" onClick={() => setShowArchived(!showArchived)} style={{ fontSize: '.78rem', padding: '7px 14px' }}>
                {showArchived ? 'Active Cast' : `Archive (${chars.filter(c => c.archived).length})`}
              </button>
              <button className="gb" onClick={() => setView('map')} style={{ fontSize: '.78rem', padding: '7px 14px' }}>Relation Map</button>
              <button className="gg" onClick={addChar}>+ Add Character</button>
            </>
          )}
          {view === 'map' && <button className="gb" onClick={() => setView('grid')}>← Bible</button>}
        </div>
      </div>

      {/* Views */}
      {view === 'grid' && <GridView chars={visible} onSelect={id => { setSelectedId(id); setView('detail') }} />}
      {view === 'detail' && selected && (
        <DetailView
          char={selected}
          allChars={chars}
          updateChar={p => updateChar(selected.id, p)}
          analyzeCharImg={(file, idx) => analyzeCharImg(selected.id, file, idx)}
          onArchive={() => archiveChar(selected.id)}
          newTrait={newTrait} setNewTrait={setNewTrait}
        />
      )}
      {view === 'map' && <RelationMap chars={chars.filter(c => !c.archived)} onSelect={id => { setSelectedId(id); setView('detail') }} />}
    </div>
  )
}

// ─── grid view ────────────────────────────────────────────────────────────────
function GridView({ chars, onSelect }: { chars: FullChar[]; onSelect: (id: string) => void }) {
  if (chars.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px dashed rgba(0,212,255,.12)', borderRadius: 16 }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: .3 }}>👤</div>
      <div style={{ color: 'rgba(0,212,255,.4)', fontSize: '.9rem' }}>No characters yet — hit Add Character to begin</div>
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
      {chars.map(c => <CharCard key={c.id} char={c} onClick={() => onSelect(c.id)} />)}
    </div>
  )
}

function CharCard({ char: c, onClick }: { char: FullChar; onClick: () => void }) {
  const rm = ROLE_META[c.role]
  const primary = c.refImages[0]

  return (
    <div className="holo-card" onClick={onClick} style={{ cursor: 'pointer', padding: 0 }}>
      {/* Image area */}
      <div style={{ height: 200, background: '#050510', position: 'relative', overflow: 'hidden' }}>
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primary} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(0,212,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'rgba(0,212,255,.3)' }}>
              {c.name ? c.name[0].toUpperCase() : '?'}
            </div>
          </div>
        )}
        {/* Overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #080812 0%, transparent 50%)' }} />
        {/* Scan line animation */}
        <div style={{ position: 'absolute', top: '-20%', left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,.04), transparent)', animation: 'scan 4s linear infinite', pointerEvents: 'none' }} />
        {/* Role badge */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span className="role-badge" style={{ background: `${rm.color}18`, border: `1px solid ${rm.color}40`, color: rm.color }}>
            {rm.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 2 }}>{c.name || 'Unnamed'}</div>
        {c.age && <div style={{ fontSize: '.75rem', color: 'rgba(0,212,255,.4)', marginBottom: 2 }}>Age {c.age}</div>}
        {c.occupation && <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>{c.occupation}</div>}
        {c.personality.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.personality.slice(0, 3).map(t => (
              <span key={t} style={{ fontSize: '.62rem', padding: '2px 7px', borderRadius: 20, background: 'rgba(0,212,255,.05)', border: '1px solid rgba(0,212,255,.12)', color: 'rgba(0,212,255,.6)' }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── detail view ──────────────────────────────────────────────────────────────
function DetailView({ char: c, allChars, updateChar, analyzeCharImg, onArchive, newTrait, setNewTrait }: {
  char: FullChar
  allChars: FullChar[]
  updateChar: (p: Partial<FullChar>) => void
  analyzeCharImg: (file: File, idx: number) => void
  onArchive: () => void
  newTrait: string; setNewTrait: (s: string) => void
}) {
  const [angleIdx, setAngleIdx]     = useState(0)
  const [addingRel, setAddingRel]   = useState(false)
  const [relForm, setRelForm]        = useState({ charId: '', type: 'family' as CharRelation['type'], label: '' })
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const rm = ROLE_META[c.role]

  const handleFileUpload = async (file: File, idx: number) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      // Detect turnaround sheet: width > 2.5× height means it's multi-angle
      const img = new window.Image()
      img.onload = async () => {
        if (idx === 0 && img.width > img.height * 2.2) {
          // Auto-split into 4 angle strips
          updateChar({ analyzing: true })
          const strips = await splitTurnaround(dataUrl)
          const description = await describeFromDataUrl(strips[0])
          updateChar({ refImages: strips, analyzing: false, ...(description ? { description } : {}) })
        } else {
          // Normal single-angle upload
          analyzeCharImg(file, idx)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (idx: number) => {
    const imgs = [...c.refImages]
    imgs.splice(idx, 1)
    // If removing the currently viewed angle, reset to 0
    if (angleIdx >= imgs.length) setAngleIdx(Math.max(0, imgs.length - 1))
    updateChar({ refImages: imgs })
  }

  const addTrait = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTrait.trim()) {
      updateChar({ personality: [...c.personality, newTrait.trim()] })
      setNewTrait('')
    }
  }
  const removeTrait = (t: string) => updateChar({ personality: c.personality.filter(x => x !== t) })

  const addRelation = () => {
    if (!relForm.charId || !relForm.label) return
    updateChar({ relationships: [...c.relationships, { ...relForm }] })
    setRelForm({ charId: '', type: 'family', label: '' })
    setAddingRel(false)
  }

  const others = allChars.filter(x => x.id !== c.id && !x.archived)

  return (
    <div>
      {/* Character header */}
      <div className="holo-card" style={{ padding: 20, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input className="fi" value={c.name} placeholder="Character name"
            onChange={e => updateChar({ name: e.target.value })}
            style={{ fontSize: '1.3rem', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,212,255,.2)', borderRadius: 0, padding: '6px 0', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="fi" value={c.role} onChange={e => updateChar({ role: e.target.value as FullChar['role'] })} style={{ width: 'auto', color: rm.color }}>
              <option value="protagonist">Protagonist</option>
              <option value="antagonist">Antagonist</option>
              <option value="supporting">Supporting</option>
              <option value="recurring">Recurring</option>
            </select>
            <input className="fi" value={c.age} placeholder="Age" onChange={e => updateChar({ age: e.target.value })} style={{ width: 80 }} />
            <input className="fi" value={c.occupation} placeholder="Occupation / role" onChange={e => updateChar({ occupation: e.target.value })} style={{ flex: 1, minWidth: 160 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!c.archived && <button className="gr" onClick={onArchive}>Archive</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* 360° viewer */}
        <div className="holo-card" style={{ padding: 16 }}>
          <div style={{ fontSize: '.68rem', letterSpacing: '.12em', color: 'rgba(0,212,255,.5)', textTransform: 'uppercase', marginBottom: 10 }}>360° Character View</div>

          {/* Main image display */}
          <div style={{ aspectRatio: '3/4', background: '#050510', borderRadius: 10, overflow: 'hidden', marginBottom: 10, position: 'relative', border: '1px solid rgba(0,212,255,.15)' }}>
            {c.refImages[angleIdx] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.refImages[angleIdx]} alt={ANGLE_LABELS[angleIdx]} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <div onClick={() => fileRefs[angleIdx]?.current?.click()} style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '2rem', opacity: .15 }}>📷</div>
                <div style={{ fontSize: '.72rem', color: 'rgba(0,212,255,.25)' }}>Click to add {ANGLE_LABELS[angleIdx]} view</div>
              </div>
            )}
            {c.analyzing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,16,.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, border: '2px solid rgba(0,212,255,.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <div style={{ color: '#00d4ff', fontSize: '.8rem' }}>Auto-splitting turnaround…</div>
              </div>
            )}
            {/* Angle label */}
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: '.65rem', color: 'rgba(0,212,255,.6)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {ANGLE_LABELS[angleIdx]}
            </div>
            {/* Replace / Remove controls on main view */}
            {c.refImages[angleIdx] && !c.analyzing && (
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5 }}>
                <button onClick={() => fileRefs[angleIdx]?.current?.click()}
                  style={{ background: 'rgba(0,0,0,.7)', border: '1px solid rgba(0,212,255,.3)', color: '#00d4ff', borderRadius: 5, padding: '3px 9px', fontSize: '.65rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                  Replace
                </button>
                <button onClick={() => removeImage(angleIdx)}
                  style={{ background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,79,79,.3)', color: '#ff4f4f', borderRadius: 5, padding: '3px 9px', fontSize: '.65rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Angle thumbnails */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {ANGLE_LABELS.map((label, i) => (
              <div key={i}>
                <input ref={fileRefs[i]} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f, i); e.target.value = '' } }} />
                <div
                  className={`img-slot ${c.refImages[i] ? 'has-img' : ''}`}
                  style={{ borderColor: angleIdx === i ? 'rgba(0,212,255,.5)' : undefined, position: 'relative' }}
                  onMouseEnter={() => setHoveredSlot(i)}
                  onMouseLeave={() => setHoveredSlot(null)}
                  onClick={() => { if (c.refImages[i]) setAngleIdx(i); else fileRefs[i].current?.click() }}
                >
                  {c.refImages[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.refImages[i]} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '.9rem', opacity: .2 }}>+</div>
                    </div>
                  )}
                  {/* Hover controls on filled slots */}
                  {c.refImages[i] && hoveredSlot === i && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,16,.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); fileRefs[i].current?.click() }}
                        style={{ background: 'rgba(0,212,255,.15)', border: '1px solid rgba(0,212,255,.4)', color: '#00d4ff', borderRadius: 4, padding: '2px 6px', fontSize: '.55rem', cursor: 'pointer', letterSpacing: '.04em' }}>
                        Replace
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); removeImage(i) }}
                        style={{ background: 'rgba(255,79,79,.1)', border: '1px solid rgba(255,79,79,.3)', color: '#ff4f4f', borderRadius: 4, padding: '2px 6px', fontSize: '.55rem', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '.55rem', textAlign: 'center', color: 'rgba(0,212,255,.3)', marginTop: 3, letterSpacing: '.06em' }}>{label}</div>
              </div>
            ))}
          </div>

          {!c.refImages[0] ? (
            <div style={{ marginTop: 12 }}>
              <button className="gb" onClick={() => fileRefs[0].current?.click()} style={{ width: '100%', padding: '8px', fontSize: '.82rem', marginBottom: 6 }}>
                Upload Reference Image
              </button>
              <div style={{ fontSize: '.66rem', color: 'rgba(0,212,255,.25)', textAlign: 'center', lineHeight: 1.5 }}>
                Got a turnaround sheet? Upload it — we&apos;ll auto-split the 4 angles
              </div>
            </div>
          ) : c.refImages.filter(Boolean).length === 1 && !c.analyzing && (
            <button
              className="gb"
              style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: '.78rem' }}
              onClick={async () => {
                updateChar({ analyzing: true })
                const strips = await splitTurnaround(c.refImages[0])
                const description = await describeFromDataUrl(strips[0])
                updateChar({ refImages: strips, analyzing: false, ...(description ? { description } : {}) })
                setAngleIdx(0)
              }}
            >
              ✦ Split as Turnaround Sheet (4 angles)
            </button>
          )}
          {c.description && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(0,212,255,.03)', border: '1px solid rgba(0,212,255,.08)', borderRadius: 8 }}>
              <div style={{ fontSize: '.65rem', color: 'rgba(0,212,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>AI Visual Profile</div>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.45)', margin: 0, lineHeight: 1.5 }}>{c.description}</p>
            </div>
          )}

          {/* Generate Art from reference */}
          {c.refImages[0] && <GenerateArtPanel char={c} updateChar={updateChar} />}
        </div>

        {/* Profile fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="holo-card" style={{ padding: 14 }}>
            <div style={{ fontSize: '.68rem', letterSpacing: '.12em', color: 'rgba(0,212,255,.5)', textTransform: 'uppercase', marginBottom: 10 }}>Character Profile</div>

            <div style={{ marginBottom: 10 }}>
              <label className="fl">Catchphrase / Signature Line</label>
              <input className="fi" value={c.catchphrase} placeholder={`"Something only ${c.name || 'they'} would say…"`}
                onChange={e => updateChar({ catchphrase: e.target.value })} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label className="fl">Core Motivation</label>
              <input className="fi" value={c.motivation} placeholder="What drives them above everything else?"
                onChange={e => updateChar({ motivation: e.target.value })} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label className="fl">Backstory</label>
              <textarea className="fi" value={c.backstory} rows={3}
                placeholder="Key history, formative events, where they came from…"
                onChange={e => updateChar({ backstory: e.target.value })}
                style={{ resize: 'none', lineHeight: 1.5 }} />
            </div>

            <div>
              <label className="fl">Personality Traits — press Enter to add</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {c.personality.map(t => (
                  <span key={t} className="trait-tag" onClick={() => removeTrait(t)}>
                    {t} ✕
                  </span>
                ))}
              </div>
              <input className="fi" value={newTrait} placeholder="e.g. Charming, Stubborn, Loyal…"
                onChange={e => setNewTrait(e.target.value)} onKeyDown={addTrait} />
            </div>
          </div>

          {/* Relationships */}
          <div className="holo-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: '.68rem', letterSpacing: '.12em', color: 'rgba(0,212,255,.5)', textTransform: 'uppercase' }}>Relationships</div>
              {!addingRel && <button className="gb" onClick={() => setAddingRel(true)} style={{ fontSize: '.72rem', padding: '4px 12px' }}>+ Add</button>}
            </div>

            {c.relationships.length === 0 && !addingRel && (
              <div style={{ color: 'rgba(255,255,255,.2)', fontSize: '.8rem', textAlign: 'center', padding: '12px 0' }}>No relationships mapped yet</div>
            )}

            {c.relationships.map((r, i) => {
              const other = others.find(x => x.id === r.charId)
              const rm2   = RELATION_META[r.type]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '7px 10px', background: 'rgba(0,0,0,.3)', borderRadius: 8, border: `1px solid ${rm2.color}20` }}>
                  {other?.refImages[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={other.refImages[0]} alt={other.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${rm2.color}40` }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: '#e0e8ff', fontSize: '.82rem' }}>{other?.name ?? r.charId}</span>
                    <span style={{ fontSize: '.72rem', color: rm2.color, marginLeft: 8, background: `${rm2.color}15`, padding: '1px 7px', borderRadius: 10 }}>{r.label}</span>
                  </div>
                  <button className="gr" style={{ padding: '2px 8px', fontSize: '.7rem' }}
                    onClick={() => updateChar({ relationships: c.relationships.filter((_, j) => j !== i) })}>✕</button>
                </div>
              )
            })}

            {addingRel && (
              <div style={{ background: 'rgba(0,212,255,.04)', border: '1px solid rgba(0,212,255,.15)', borderRadius: 10, padding: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <select className="fi" value={relForm.charId} onChange={e => setRelForm(f => ({ ...f, charId: e.target.value }))} style={{ flex: 1, minWidth: 120 }}>
                    <option value="">Select character…</option>
                    {others.map(o => <option key={o.id} value={o.id}>{o.name || 'Unnamed'}</option>)}
                  </select>
                  <select className="fi" value={relForm.type} onChange={e => setRelForm(f => ({ ...f, type: e.target.value as CharRelation['type'] }))} style={{ width: 'auto' }}>
                    {Object.entries(RELATION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <input className="fi" value={relForm.label} placeholder={`e.g. "Son", "Business rival", "Childhood friend"`}
                  onChange={e => setRelForm(f => ({ ...f, label: e.target.value }))}
                  style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gg" onClick={addRelation} style={{ flex: 1, padding: '7px' }}>Add Relationship</button>
                  <button className="gb" onClick={() => setAddingRel(false)} style={{ padding: '7px 14px' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── generate art panel ───────────────────────────────────────────────────────
const POSES = [
  'Standing, full body',
  'Action pose, dynamic',
  'Close-up portrait',
  'Sitting, relaxed',
  'Walking, confident stride',
  'Arms crossed, serious',
]

const EXPRESSIONS = [
  'Neutral, composed',
  'Smiling, friendly',
  'Laughing, animated',
  'Serious, intense',
  'Surprised, wide-eyed',
  'Smug, knowing smirk',
]

function GenerateArtPanel({ char: c, updateChar }: {
  char: FullChar
  updateChar: (p: Partial<FullChar>) => void
}) {
  const [open, setOpen]           = useState(false)
  const [pose, setPose]           = useState(POSES[0])
  const [expression, setExpression] = useState(EXPRESSIONS[0])
  const [style, setStyle]         = useState('cartoon')
  const [generating, setGenerating] = useState(false)
  const [result, setResult]       = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [saveSlot, setSaveSlot]   = useState<number | null>(null)

  const generate = async () => {
    if (!c.refImages[0]) return
    setGenerating(true)
    setResult(null)
    setError('')

    // Strip data URL prefix to get raw base64 + mediaType
    const dataUrl = c.refImages[0]
    const [header, b64] = dataUrl.split(',')
    const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'

    try {
      const res = await fetch('/api/cartoon/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: b64,
          mediaType,
          description: c.description,
          style,
          pose,
          expression,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.image)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed — try again')
    } finally {
      setGenerating(false)
    }
  }

  const saveToSlot = (idx: number) => {
    if (!result) return
    const imgs = [...c.refImages]
    imgs[idx] = result
    updateChar({ refImages: imgs })
    setSaveSlot(idx)
    setTimeout(() => setSaveSlot(null), 2000)
  }

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,212,255,.08)', paddingTop: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, marginBottom: open ? 12 : 0 }}
      >
        <span style={{ fontSize: '.68rem', letterSpacing: '.12em', color: 'rgba(0,212,255,.5)', textTransform: 'uppercase' }}>✦ Generate Character Art</span>
        <span style={{ fontSize: '.7rem', color: 'rgba(0,212,255,.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
      </button>

      {open && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <label className="fl">Pose</label>
            <select className="fi" value={pose} onChange={e => setPose(e.target.value)}>
              {POSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="fl">Expression</label>
            <select className="fi" value={expression} onChange={e => setExpression(e.target.value)}>
              {EXPRESSIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="fl">Art Style</label>
            <select className="fi" value={style} onChange={e => setStyle(e.target.value)}>
              <option value="cartoon">Cartoon</option>
              <option value="comic_book">Comic Book</option>
              <option value="manga">Manga</option>
              <option value="sketch">Sketch</option>
            </select>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,79,79,.06)', border: '1px solid rgba(255,79,79,.2)', borderRadius: 8, padding: '8px 12px', color: '#ff4f4f', fontSize: '.78rem', marginBottom: 10 }}>
              {error}
            </div>
          )}

          <button className="gg" onClick={generate} disabled={generating}
            style={{ width: '100%', padding: '9px', fontSize: '.82rem', opacity: generating ? .6 : 1, cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? 'Generating… (up to 60s)' : 'Generate from Reference Image'}
          </button>

          {generating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 12px', background: 'rgba(0,212,255,.03)', borderRadius: 8 }}>
              <div style={{ width: 18, height: 18, border: '2px solid rgba(0,212,255,.15)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div style={{ fontSize: '.75rem', color: 'rgba(0,212,255,.5)', lineHeight: 1.4 }}>
                HuggingFace is generating your character art from the reference image. Model may need to warm up — first run can take up to a minute.
              </div>
            </div>
          )}

          {result && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '.65rem', color: 'rgba(0,212,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Generated Art</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="Generated character art" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,212,255,.2)', display: 'block', marginBottom: 10 }} />

              <div style={{ fontSize: '.68rem', color: 'rgba(0,212,255,.35)', marginBottom: 6 }}>Save to angle slot:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                {ANGLE_LABELS.map((label, i) => (
                  <button key={i} onClick={() => saveToSlot(i)}
                    style={{ background: saveSlot === i ? 'rgba(74,222,128,.1)' : 'rgba(0,212,255,.05)', border: `1px solid ${saveSlot === i ? 'rgba(74,222,128,.4)' : 'rgba(0,212,255,.15)'}`, borderRadius: 6, padding: '5px 4px', fontSize: '.62rem', color: saveSlot === i ? '#4ade80' : 'rgba(0,212,255,.5)', cursor: 'pointer', transition: 'all .15s' }}>
                    {saveSlot === i ? '✓' : label}
                  </button>
                ))}
              </div>

              <button className="gb" onClick={generate} style={{ width: '100%', marginTop: 10, padding: '7px', fontSize: '.78rem' }}>
                Generate Another Variation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── relationship map ─────────────────────────────────────────────────────────
function RelationMap({ chars, onSelect }: { chars: FullChar[]; onSelect: (id: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 720, H = 480, CX = W / 2, CY = H / 2
  const r = Math.min(180, (chars.length > 1 ? 160 : 0))

  const positions = chars.map((_, i) => {
    const angle = (i / chars.length) * 2 * Math.PI - Math.PI / 2
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
  })

  const edges: { x1: number; y1: number; x2: number; y2: number; color: string; label: string }[] = []
  chars.forEach((c, i) => {
    c.relationships.forEach(rel => {
      const j = chars.findIndex(x => x.id === rel.charId)
      if (j > i) {
        edges.push({
          x1: positions[i].x, y1: positions[i].y,
          x2: positions[j].x, y2: positions[j].y,
          color: RELATION_META[rel.type]?.color ?? '#555',
          label: rel.label,
        })
      }
    })
  })

  if (chars.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px dashed rgba(0,212,255,.1)', borderRadius: 16, color: 'rgba(0,212,255,.3)' }}>
      Add characters and relationships to see the map
    </div>
  )

  return (
    <div className="holo-card" style={{ padding: 16, overflow: 'hidden' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,212,255,.04)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,212,255,.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        <ellipse cx={CX} cy={CY} rx={r + 40} ry={r * 0.6 + 30} fill="url(#centerGlow)" />

        {/* Edges */}
        {edges.map((e, i) => {
          const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2
          return (
            <g key={i}>
              <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke={e.color} strokeWidth="1.5" strokeOpacity=".4" strokeDasharray="4 3" />
              <text x={mx} y={my - 6} textAnchor="middle" fill={e.color} fontSize="10" opacity=".7">{e.label}</text>
            </g>
          )
        })}

        {/* Nodes */}
        {chars.map((c, i) => {
          const { x, y } = positions[i]
          const rm = ROLE_META[c.role]
          const img = c.refImages[0]
          const nodeId = `clip-${c.id}`
          return (
            <g key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer' }}>
              <defs>
                <clipPath id={nodeId}><circle cx={x} cy={y} r={28} /></clipPath>
              </defs>
              {/* Glow ring */}
              <circle cx={x} cy={y} r={34} fill="none" stroke={rm.color} strokeWidth="1" strokeOpacity=".2" />
              <circle cx={x} cy={y} r={30} fill="none" stroke={rm.color} strokeWidth="1.5" strokeOpacity=".4" />
              {/* Avatar */}
              <circle cx={x} cy={y} r={28} fill="#080812" />
              {img && <image href={img} x={x - 28} y={y - 28} width={56} height={56} clipPath={`url(#${nodeId})`} preserveAspectRatio="xMidYMin slice" />}
              {!img && <text x={x} y={y + 7} textAnchor="middle" fill={rm.color} fontSize="20" opacity=".4">{c.name?.[0] ?? '?'}</text>}
              {/* Name label */}
              <rect x={x - 40} y={y + 34} width={80} height={18} rx={4} fill="rgba(5,5,16,.85)" />
              <text x={x} y={y + 46} textAnchor="middle" fill="#e0e8ff" fontSize="11" fontWeight="600">{c.name || 'Unnamed'}</text>
              {/* Role dot */}
              <circle cx={x + 20} cy={y - 20} r={5} fill={rm.color} />
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,212,255,.08)' }}>
        {Object.entries(RELATION_META).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 2, background: v.color, borderRadius: 1, opacity: .7 }} />
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
