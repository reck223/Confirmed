'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

// ─── types ────────────────────────────────────────────────────────────────────
type Step = 'concept' | 'generating' | 'review' | 'preview'

type Character = {
  id: string
  name: string
  description: string
  role: 'protagonist' | 'antagonist' | 'supporting'
}

type Dialogue = { character: string; text: string }

type Panel = {
  panel_number: number
  scene_title: string
  setting: string
  action: string
  characters_present: string[]
  dialogue: Dialogue[]
  image_prompt: string
  image_url?: string
  image_loaded: boolean
  image_error: boolean
}

type CartoonData = {
  title: string
  logline: string
  story_summary: string
  panels: Panel[]
}

type ConceptForm = {
  title: string
  genre: string
  style: string
  premise: string
  characters: Character[]
  panelCount: number
}

// ─── constants ────────────────────────────────────────────────────────────────
const GENRES = [
  { id: 'superhero', label: 'Superhero', icon: '⚡' },
  { id: 'scifi',     label: 'Sci-Fi',    icon: '🚀' },
  { id: 'fantasy',   label: 'Fantasy',   icon: '🧙' },
  { id: 'comedy',    label: 'Comedy',    icon: '😂' },
  { id: 'drama',     label: 'Drama',     icon: '🎭' },
  { id: 'action',    label: 'Action',    icon: '💥' },
  { id: 'kids',      label: 'Kids',      icon: '🌈' },
  { id: 'horror',    label: 'Horror',    icon: '👻' },
]

const STYLES = [
  { id: 'comic_book', label: 'Comic Book', desc: 'Bold outlines, flat colors' },
  { id: 'manga',      label: 'Manga',      desc: 'Japanese anime style' },
  { id: 'cartoon',    label: 'Cartoon',    desc: 'Disney/Pixar inspired' },
  { id: 'sketch',     label: 'Sketch',     desc: 'Hand-drawn pencil art' },
]

const STYLE_PREFIXES: Record<string, string> = {
  comic_book: 'Marvel DC comic book panel, bold black outlines, vibrant flat colors, dynamic action composition, professional comic illustration',
  manga:      'Japanese manga panel art, clean expressive linework, large emotive eyes, screentone shading, anime style',
  cartoon:    'Western cartoon animation, Disney-Pixar style, smooth rounded shapes, bright saturated colors, expressive characters',
  sketch:     'Pencil sketch illustration, detailed hand-drawn linework, crosshatching, artistic black and white sketch',
}

const LOADING_MSGS = [
  'Writing your story…',
  'Developing your characters…',
  'Crafting dramatic scenes…',
  'Building the plot…',
  'Writing dialogue…',
  'Planning panel compositions…',
  'Almost there…',
]

const KB = [
  ['scale(1) translate(0,0)',      'scale(1.12) translate(-2%,-1%)'],
  ['scale(1.1) translate(-2%,2%)', 'scale(1) translate(2%,-2%)'   ],
  ['scale(1) translate(2%,0)',     'scale(1.12) translate(0,2%)'   ],
  ['scale(1.1) translate(0,-2%)',  'scale(1) translate(-1%,1%)'    ],
  ['scale(1) translate(-1%,1%)',   'scale(1.12) translate(2%,-1%)' ],
  ['scale(1.12) translate(1%,1%)', 'scale(1) translate(-2%,0)'     ],
]

// ─── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

function buildImageUrl(prompt: string, style: string, seed: number) {
  const prefix = STYLE_PREFIXES[style] ?? STYLE_PREFIXES.comic_book
  const full   = `${prefix}, ${prompt}, high quality, detailed, cinematic`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=768&height=512&model=flux&nologo=true&seed=${seed}`
}

// ─── main component ───────────────────────────────────────────────────────────
export function CartoonClient() {
  const [step, setStep]     = useState<Step>('concept')
  const [form, setForm]     = useState<ConceptForm>({
    title: '', genre: 'superhero', style: 'comic_book',
    premise: '', panelCount: 10,
    characters: [{ id: uid(), name: '', description: '', role: 'protagonist' }],
  })
  const [cartoon, setCartoon]           = useState<CartoonData | null>(null)
  const [error, setError]               = useState('')
  const [loadingMsg, setLoadingMsg]     = useState(LOADING_MSGS[0])
  const [generatingImgs, setGeneratingImgs] = useState(false)
  const [loadedCount, setLoadedCount]   = useState(0)
  const [previewIdx, setPreviewIdx]     = useState(0)
  const [autoPlay, setAutoPlay]         = useState(false)
  const seedsRef  = useRef<number[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (step !== 'generating') return
    let i = 0
    const t = setInterval(() => { i = (i + 1) % LOADING_MSGS.length; setLoadingMsg(LOADING_MSGS[i]) }, 1900)
    return () => clearInterval(t)
  }, [step])

  useEffect(() => {
    if (!autoPlay || !cartoon) return
    timerRef.current = setInterval(() => setPreviewIdx(p => (p + 1) % cartoon.panels.length), 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoPlay, cartoon])

  const addCharacter = () => {
    if (form.characters.length >= 4) return
    setForm(f => ({ ...f, characters: [...f.characters, { id: uid(), name: '', description: '', role: 'supporting' }] }))
  }
  const removeCharacter = (id: string) =>
    setForm(f => ({ ...f, characters: f.characters.filter(c => c.id !== id) }))
  const updateCharacter = (id: string, field: keyof Character, value: string) =>
    setForm(f => ({ ...f, characters: f.characters.map(c => c.id === id ? { ...c, [field]: value } : c) }))

  const generateStory = async () => {
    if (!form.premise.trim())                              { setError('Add a story premise to continue.'); return }
    if (!form.characters.some(c => c.name.trim()))        { setError('Name at least one character.'); return }
    setError('')
    setStep('generating')
    try {
      const res = await fetch('/api/cartoon/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, characters: form.characters.filter(c => c.name.trim()) }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const panels: Panel[] = (data.panels ?? []).map((p: Panel) => ({ ...p, image_loaded: false, image_error: false }))
      seedsRef.current = panels.map(() => Math.floor(Math.random() * 99999))
      setCartoon({ ...data, panels })
      setGeneratingImgs(false)
      setLoadedCount(0)
      setStep('review')
    } catch {
      setError('Generation failed — please try again.')
      setStep('concept')
    }
  }

  const generateImages = useCallback(() => {
    if (!cartoon) return
    setGeneratingImgs(true)
    setLoadedCount(0)
    setCartoon(c => c ? {
      ...c,
      panels: c.panels.map((p, i) => ({
        ...p,
        image_url:    buildImageUrl(p.image_prompt, form.style, seedsRef.current[i] ?? i * 137),
        image_loaded: false,
        image_error:  false,
      })),
    } : c)
  }, [cartoon, form.style])

  const onImageLoad = useCallback((idx: number) => {
    setCartoon(c => c ? { ...c, panels: c.panels.map((p, i) => i === idx ? { ...p, image_loaded: true } : p) } : c)
    setLoadedCount(n => n + 1)
  }, [])

  const onImageError = useCallback((idx: number) => {
    setCartoon(c => c ? { ...c, panels: c.panels.map((p, i) => i === idx ? { ...p, image_error: true } : p) } : c)
    setLoadedCount(n => n + 1)
  }, [])

  const retryImage = (idx: number) => {
    if (!cartoon) return
    const seed = Math.floor(Math.random() * 99999)
    seedsRef.current[idx] = seed
    setLoadedCount(n => Math.max(0, n - 1))
    setCartoon(c => c ? {
      ...c,
      panels: c.panels.map((p, i) => i === idx ? {
        ...p,
        image_url: buildImageUrl(p.image_prompt, form.style, seed),
        image_loaded: false, image_error: false,
      } : p),
    } : c)
  }

  const exportPDF = () => {
    if (!cartoon) return
    const win = window.open('', '_blank')
    if (!win) { alert('Allow popups to export PDF.'); return }
    const panels = cartoon.panels.map(p => `
      <div class="panel">
        ${p.image_url && p.image_loaded
          ? `<img src="${p.image_url}" alt="Panel ${p.panel_number}" />`
          : `<div class="no-img"><span>${p.panel_number}</span></div>`}
        <div class="caption">
          <div class="scene">${p.scene_title}</div>
          ${p.dialogue.map(d => `<div class="line"><b>${d.character}:</b> ${d.text}</div>`).join('')}
        </div>
      </div>`).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cartoon.title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Comic Sans MS",cursive;background:#fff;padding:20px;color:#000}
h1{text-align:center;font-size:2rem;border-bottom:4px solid #000;padding-bottom:12px;margin-bottom:8px}
.logline{text-align:center;font-style:italic;font-size:.95rem;margin-bottom:24px;color:#333}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.panel{border:3px solid #000;border-radius:3px;overflow:hidden;break-inside:avoid}
.panel img{width:100%;height:220px;object-fit:cover;display:block;border-bottom:2px solid #000}
.no-img{width:100%;height:220px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:bold;border-bottom:2px solid #000}
.caption{padding:10px 12px}
.scene{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:6px;color:#555}
.line{font-size:.88rem;margin-bottom:3px}
@media print{html,body{height:auto}@page{margin:10mm}}
</style></head><body>
<h1>${cartoon.title}</h1>
<p class="logline">${cartoon.logline}</p>
<div class="grid">${panels}</div>
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  // ─── step routing ──────────────────────────────────────────────────────────
  if (step === 'concept') return (
    <ConceptStep
      form={form} setForm={setForm} error={error}
      onGenerate={generateStory}
      addChar={addCharacter} removeChar={removeCharacter} updateChar={updateCharacter}
    />
  )
  if (step === 'generating') return <GeneratingStep msg={loadingMsg} />
  if (step === 'review' && cartoon) return (
    <ReviewStep
      cartoon={cartoon} form={form}
      generatingImgs={generatingImgs}
      loadedCount={loadedCount}
      onGenerateImages={generateImages}
      onImageLoad={onImageLoad} onImageError={onImageError} onRetry={retryImage}
      onPreview={() => { setPreviewIdx(0); setAutoPlay(false); setStep('preview') }}
      onReset={() => { setCartoon(null); setStep('concept') }}
    />
  )
  if (step === 'preview' && cartoon) return (
    <PreviewStep
      cartoon={cartoon} previewIdx={previewIdx}
      setPreviewIdx={setPreviewIdx}
      autoPlay={autoPlay} setAutoPlay={setAutoPlay}
      onBack={() => setStep('review')}
      onExport={exportPDF}
    />
  )
  return null
}

// ─── concept step ─────────────────────────────────────────────────────────────
function ConceptStep({ form, setForm, error, onGenerate, addChar, removeChar, updateChar }: {
  form: ConceptForm
  setForm: React.Dispatch<React.SetStateAction<ConceptForm>>
  error: string
  onGenerate: () => void
  addChar: () => void
  removeChar: (id: string) => void
  updateChar: (id: string, field: keyof Character, value: string) => void
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', padding: '24px 16px' }}>
      <style>{`
        .cc-input { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #f0f0f0; padding: 10px 14px; width: 100%; font-size: 0.95rem; outline: none; transition: border-color .2s; }
        .cc-input:focus { border-color: #D4AF37; }
        .cc-label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 6px; display: block; }
        .cc-chip { padding: 8px 14px; border-radius: 20px; border: 1px solid #333; background: #111; color: #aaa; cursor: pointer; font-size: 0.85rem; transition: all .15s; white-space: nowrap; }
        .cc-chip.selected { border-color: #D4AF37; background: rgba(212,175,55,.12); color: #D4AF37; }
        .cc-chip:hover:not(.selected) { border-color: #555; color: #ddd; }
        .cc-style { padding: 12px 16px; border-radius: 10px; border: 1px solid #333; background: #111; cursor: pointer; transition: all .15s; }
        .cc-style.selected { border-color: #D4AF37; background: rgba(212,175,55,.1); }
        .cc-style:hover:not(.selected) { border-color: #444; }
        .cc-btn-primary { background: #D4AF37; color: #000; border: none; border-radius: 8px; padding: 14px 32px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity .15s; }
        .cc-btn-primary:hover { opacity: .9; }
        .cc-btn-secondary { background: #1a1a1a; color: #aaa; border: 1px solid #333; border-radius: 8px; padding: 8px 14px; font-size: 0.85rem; cursor: pointer; transition: all .15s; }
        .cc-btn-secondary:hover { border-color: #555; color: #ddd; }
        .cc-btn-danger { background: transparent; color: #e05555; border: 1px solid #e05555; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; cursor: pointer; transition: all .15s; }
        .cc-btn-danger:hover { background: rgba(224,85,85,.1); }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: '#D4AF37', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Cartoon Studio</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Create a Cartoon</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: '0.9rem' }}>AI writes the story. AI draws the panels. All free.</p>
        </div>

        {/* Genre */}
        <div style={{ marginBottom: 28 }}>
          <label className="cc-label">Genre</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GENRES.map(g => (
              <button
                key={g.id}
                className={`cc-chip ${form.genre === g.id ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, genre: g.id }))}
              >
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Art Style */}
        <div style={{ marginBottom: 28 }}>
          <label className="cc-label">Art Style</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {STYLES.map(s => (
              <button
                key={s.id}
                className={`cc-style ${form.style === s.id ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, style: s.id }))}
              >
                <div style={{ fontWeight: 600, color: form.style === s.id ? '#D4AF37' : '#ddd', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Story Title */}
        <div style={{ marginBottom: 20 }}>
          <label className="cc-label">Story Title (optional — Claude can name it)</label>
          <input
            className="cc-input"
            placeholder="e.g. The Last Guardian"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        {/* Premise */}
        <div style={{ marginBottom: 28 }}>
          <label className="cc-label">Story Premise *</label>
          <textarea
            className="cc-input"
            rows={3}
            placeholder="Describe what your story is about. Include the main conflict, setting, and tone. The more detail, the better."
            value={form.premise}
            onChange={e => setForm(f => ({ ...f, premise: e.target.value }))}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </div>

        {/* Characters */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="cc-label" style={{ margin: 0 }}>Characters *</label>
            {form.characters.length < 4 && (
              <button className="cc-btn-secondary" onClick={addChar}>+ Add Character</button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.characters.map((c, idx) => (
              <div key={c.id} style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <input
                    className="cc-input"
                    placeholder={`Character ${idx + 1} name`}
                    value={c.name}
                    onChange={e => updateChar(c.id, 'name', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="cc-input"
                    value={c.role}
                    onChange={e => updateChar(c.id, 'role', e.target.value)}
                    style={{ width: 'auto', minWidth: 140 }}
                  >
                    <option value="protagonist">Protagonist</option>
                    <option value="antagonist">Antagonist</option>
                    <option value="supporting">Supporting</option>
                  </select>
                  {form.characters.length > 1 && (
                    <button className="cc-btn-danger" onClick={() => removeChar(c.id)}>✕</button>
                  )}
                </div>
                <input
                  className="cc-input"
                  placeholder="Physical description (appearance, clothing, distinctive features…)"
                  value={c.description}
                  onChange={e => updateChar(c.id, 'description', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Panel Count */}
        <div style={{ marginBottom: 32 }}>
          <label className="cc-label">Number of Panels</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[6, 8, 10, 12].map(n => (
              <button
                key={n}
                className={`cc-chip ${form.panelCount === n ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, panelCount: n }))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,85,85,.1)', border: '1px solid rgba(224,85,85,.3)', borderRadius: 8, padding: '10px 14px', color: '#e05555', marginBottom: 16, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <button className="cc-btn-primary" onClick={onGenerate} style={{ width: '100%' }}>
          Generate Story →
        </button>
      </div>
    </div>
  )
}

// ─── generating step ──────────────────────────────────────────────────────────
function GeneratingStep({ msg }: { msg: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      `}</style>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        border: '3px solid #222', borderTopColor: '#D4AF37',
        animation: 'spin 1s linear infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#D4AF37', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Creating Your Cartoon</div>
        <div style={{ color: '#666', fontSize: '0.9rem', animation: 'pulse 1.9s ease-in-out infinite' }}>{msg}</div>
      </div>
      <div style={{ color: '#333', fontSize: '0.8rem' }}>This takes about 20–40 seconds</div>
    </div>
  )
}

// ─── review step ──────────────────────────────────────────────────────────────
function ReviewStep({ cartoon, form, generatingImgs, loadedCount, onGenerateImages, onImageLoad, onImageError, onRetry, onPreview, onReset }: {
  cartoon: CartoonData
  form: ConceptForm
  generatingImgs: boolean
  loadedCount: number
  onGenerateImages: () => void
  onImageLoad: (idx: number) => void
  onImageError: (idx: number) => void
  onRetry: (idx: number) => void
  onPreview: () => void
  onReset: () => void
}) {
  const total        = cartoon.panels.length
  const allLoaded    = loadedCount >= total && generatingImgs
  const readyForPrev = allLoaded || (generatingImgs && loadedCount > 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', padding: '24px 16px' }}>
      <style>{`
        .cc-panel-card { background: #111; border: 1px solid #222; border-radius: 12px; overflow: hidden; }
        .cc-panel-img  { width: 100%; aspect-ratio: 3/2; object-fit: cover; display: block; }
        .cc-panel-ph   { width: 100%; aspect-ratio: 3/2; background: #1a1a1a; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; }
        @keyframes spin2 { to { transform: rotate(360deg) } }
        .cc-spinner { width: 24px; height: 24px; border: 2px solid #333; border-top-color: #D4AF37; border-radius: 50%; animation: spin2 .8s linear infinite; }
        .cc-btn-primary { background: #D4AF37; color: #000; border: none; border-radius: 8px; padding: 12px 28px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: opacity .15s; }
        .cc-btn-primary:hover { opacity: .9; }
        .cc-btn-secondary { background: #1a1a1a; color: #aaa; border: 1px solid #333; border-radius: 8px; padding: 12px 24px; font-size: 0.95rem; cursor: pointer; transition: all .15s; }
        .cc-btn-secondary:hover { border-color: #555; color: #ddd; }
        .cc-btn-sm { background: transparent; color: #D4AF37; border: 1px solid rgba(212,175,55,.4); border-radius: 6px; padding: 5px 12px; font-size: 0.78rem; cursor: pointer; }
        .cc-btn-sm:hover { background: rgba(212,175,55,.08); }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#D4AF37', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Your Cartoon</div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{cartoon.title}</h1>
              <p style={{ color: '#888', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>{cartoon.logline}</p>
            </div>
            <button className="cc-btn-secondary" onClick={onReset} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              ← Start Over
            </button>
          </div>

          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 16px', marginTop: 16 }}>
            <div style={{ fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Story Summary</div>
            <p style={{ color: '#bbb', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{cartoon.story_summary}</p>
          </div>
        </div>

        {/* Image controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ color: '#666', fontSize: '0.88rem' }}>
            {generatingImgs
              ? `${loadedCount} of ${total} images ready`
              : `${total} panels — no images yet`}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!generatingImgs && (
              <button className="cc-btn-primary" onClick={onGenerateImages}>
                Generate Images
              </button>
            )}
            {generatingImgs && loadedCount > 0 && (
              <button className="cc-btn-primary" onClick={onPreview}>
                Preview Motion Comic →
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {generatingImgs && (
          <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#D4AF37', borderRadius: 2,
              width: `${(loadedCount / total) * 100}%`, transition: 'width .4s ease',
            }} />
          </div>
        )}

        {/* Panel grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {cartoon.panels.map((panel, idx) => (
            <PanelCard
              key={panel.panel_number}
              panel={panel}
              idx={idx}
              onLoad={() => onImageLoad(idx)}
              onError={() => onImageError(idx)}
              onRetry={() => onRetry(idx)}
            />
          ))}
        </div>

        {/* Bottom actions */}
        {generatingImgs && loadedCount > 0 && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="cc-btn-primary" onClick={onPreview} style={{ fontSize: '1.05rem', padding: '16px 40px' }}>
              ▶ Open Motion Comic Preview
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PanelCard({ panel, idx, onLoad, onError, onRetry }: {
  panel: Panel; idx: number
  onLoad: () => void; onError: () => void; onRetry: () => void
}) {
  return (
    <div className="cc-panel-card">
      {panel.image_url ? (
        panel.image_error ? (
          <div className="cc-panel-ph">
            <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: 8 }}>Failed to load</div>
            <button className="cc-btn-sm" onClick={onRetry}>Retry</button>
          </div>
        ) : panel.image_loaded ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={panel.image_url} alt={panel.scene_title} className="cc-panel-img" />
        ) : (
          <div className="cc-panel-ph">
            <div className="cc-spinner" />
            {/* hidden img to trigger load */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={panel.image_url} alt="" style={{ display: 'none' }} onLoad={onLoad} onError={onError} />
          </div>
        )
      ) : (
        <div className="cc-panel-ph">
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2a2a2a' }}>{String(idx + 1).padStart(2, '0')}</div>
          <div style={{ color: '#444', fontSize: '0.78rem', textAlign: 'center', maxWidth: '80%', lineHeight: 1.4 }}>{panel.action}</div>
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '.08em', color: '#555', marginBottom: 4 }}>
          Panel {panel.panel_number}
        </div>
        <div style={{ fontWeight: 600, color: '#ddd', marginBottom: 8, fontSize: '0.9rem' }}>{panel.scene_title}</div>
        {panel.dialogue.slice(0, 2).map((d, i) => (
          <div key={i} style={{ fontSize: '0.82rem', color: '#888', marginBottom: 3 }}>
            <span style={{ color: '#D4AF37', fontWeight: 600 }}>{d.character}: </span>
            <span>&ldquo;{d.text}&rdquo;</span>
          </div>
        ))}
        {panel.dialogue.length > 2 && (
          <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 2 }}>+{panel.dialogue.length - 2} more lines</div>
        )}
        {panel.image_loaded && onRetry && (
          <button className="cc-btn-sm" onClick={onRetry} style={{ marginTop: 8 }}>Regenerate Image</button>
        )}
      </div>
    </div>
  )
}

// ─── preview step (motion comic) ──────────────────────────────────────────────
function PreviewStep({ cartoon, previewIdx, setPreviewIdx, autoPlay, setAutoPlay, onBack, onExport }: {
  cartoon: CartoonData
  previewIdx: number
  setPreviewIdx: (n: number | ((p: number) => number)) => void
  autoPlay: boolean
  setAutoPlay: (v: boolean) => void
  onBack: () => void
  onExport: () => void
}) {
  const panel = cartoon.panels[previewIdx]
  const total = cartoon.panels.length
  const kb    = KB[previewIdx % KB.length]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#f0f0f0', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes kb { from { transform: ${kb[0]} } to { transform: ${kb[1]} } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes dialogIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .prev-btn { background: rgba(255,255,255,.08); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; transition: background .15s; flex-shrink: 0; }
        .prev-btn:hover { background: rgba(255,255,255,.18); }
        .prev-btn:disabled { opacity: .25; cursor: not-allowed; }
        .cc-btn-sm { background: transparent; color: #D4AF37; border: 1px solid rgba(212,175,55,.4); border-radius: 6px; padding: 6px 14px; font-size: 0.82rem; cursor: pointer; }
        .cc-btn-sm:hover { background: rgba(212,175,55,.1); }
        .thumb-dot { width: 8px; height: 8px; border-radius: 50%; cursor: pointer; transition: all .15s; flex-shrink: 0; }
      `}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #111', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cc-btn-sm" onClick={onBack}>← Back</button>
          <span style={{ color: '#444', fontSize: '0.85rem' }}>{cartoon.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="cc-btn-sm"
            onClick={() => setAutoPlay(!autoPlay)}
            style={{ color: autoPlay ? '#4ade80' : '#D4AF37', borderColor: autoPlay ? 'rgba(74,222,128,.4)' : 'rgba(212,175,55,.4)' }}
          >
            {autoPlay ? '⏸ Pause' : '▶ Auto-Play'}
          </button>
          <button className="cc-btn-sm" onClick={onExport}>Export PDF</button>
        </div>
      </div>

      {/* Main panel display */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {panel.image_url && panel.image_loaded ? (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Ken Burns image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewIdx}
              src={panel.image_url}
              alt={panel.scene_title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                animation: 'kb 7s ease-in-out forwards',
                transformOrigin: 'center center',
              }}
            />
            {/* gradient overlays */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.5) 0%, transparent 30%, transparent 55%, rgba(0,0,0,.85) 100%)' }} />
          </div>
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #111 0%, #0a0a0a 100%)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>{String(previewIdx + 1).padStart(2, '0')}</div>
              <div style={{ color: '#333', fontSize: '0.9rem' }}>{panel.action}</div>
            </div>
          </div>
        )}

        {/* Scene title */}
        <div key={`title-${previewIdx}`} style={{
          position: 'absolute', top: 20, left: 20, right: 20,
          animation: 'fadeUp .5s ease both',
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(212,175,55,.8)', marginBottom: 4 }}>
            Panel {panel.panel_number} of {total}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{panel.scene_title}</div>
        </div>

        {/* Dialogue */}
        {panel.dialogue.length > 0 && (
          <div key={`dialog-${previewIdx}`} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px',
            animation: 'dialogIn .6s .3s ease both',
          }}>
            {panel.dialogue.map((d, i) => (
              <div key={i} style={{
                background: 'rgba(0,0,0,.82)', border: '1px solid rgba(212,175,55,.2)',
                borderRadius: 8, padding: '8px 14px', marginBottom: 8, backdropFilter: 'blur(4px)',
                maxWidth: 560,
              }}>
                <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.82rem', marginRight: 6 }}>{d.character}:</span>
                <span style={{ color: '#f0f0f0', fontSize: '0.9rem' }}>&ldquo;{d.text}&rdquo;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button
          className="prev-btn"
          onClick={() => setPreviewIdx(p => Math.max(0, p - 1))}
          disabled={previewIdx === 0}
        >‹</button>

        {/* Thumbnail dots */}
        <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', overflowX: 'auto', padding: '4px 0' }}>
          {cartoon.panels.map((_, i) => (
            <div
              key={i}
              className="thumb-dot"
              onClick={() => setPreviewIdx(i)}
              style={{
                background: i === previewIdx ? '#D4AF37' : '#333',
                transform: i === previewIdx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <button
          className="prev-btn"
          onClick={() => setPreviewIdx(p => Math.min(total - 1, p + 1))}
          disabled={previewIdx === total - 1}
        >›</button>
      </div>
    </div>
  )
}
