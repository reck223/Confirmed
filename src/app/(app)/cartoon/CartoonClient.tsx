'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

// ─── types ────────────────────────────────────────────────────────────────────
type MainTab = 'cast' | 'scene' | 'import'
type SceneStep = 'setup' | 'generating' | 'review' | 'preview'

type SavedChar = {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  description: string
  refImage?: string
  analyzing?: boolean
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

type SceneData = {
  title: string
  logline: string
  story_summary: string
  panels: Panel[]
}

type Project = { name: string; style: string }

// ─── constants ────────────────────────────────────────────────────────────────
const STYLES = [
  { id: 'cartoon',    label: 'Cartoon',    desc: 'Disney/Pixar inspired' },
  { id: 'comic_book', label: 'Comic Book', desc: 'Bold outlines, flat colors' },
  { id: 'manga',      label: 'Manga',      desc: 'Japanese anime style' },
  { id: 'sketch',     label: 'Sketch',     desc: 'Hand-drawn pencil art' },
]

const STYLE_PREFIXES: Record<string, string> = {
  cartoon:    'Western cartoon animation style, bold outlines, bright flat colors, expressive characters, professional animation',
  comic_book: 'Comic book panel art, bold black outlines, vibrant flat colors, dynamic composition, professional illustration',
  manga:      'Japanese manga panel art, clean expressive linework, large emotive eyes, screentone shading, anime style',
  sketch:     'Pencil sketch illustration, detailed hand-drawn linework, crosshatching, artistic black and white',
}

const ROLE_COLORS: Record<string, string> = {
  protagonist: '#D4AF37',
  antagonist:  '#e05555',
  supporting:  '#4ade80',
  recurring:   '#a78bfa',
}

const LOADING_MSGS = [
  'Writing the scene…', 'Developing the action…', 'Crafting dialogue…',
  'Planning panel compositions…', 'Adding finishing touches…',
]

const KB = [
  ['scale(1) translate(0,0)',      'scale(1.12) translate(-2%,-1%)'],
  ['scale(1.1) translate(-2%,2%)', 'scale(1) translate(2%,-2%)'   ],
  ['scale(1) translate(2%,0)',     'scale(1.12) translate(0,2%)'   ],
  ['scale(1.1) translate(0,-2%)',  'scale(1) translate(-1%,1%)'    ],
]

const uid = () => Math.random().toString(36).slice(2, 9)

function buildImageUrl(prompt: string, style: string, seed: number) {
  const prefix = STYLE_PREFIXES[style] ?? STYLE_PREFIXES.cartoon
  const full   = `${prefix}, ${prompt}, high quality, detailed, cinematic`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=768&height=512&model=flux&nologo=true&seed=${seed}`
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadProject(): Project {
  try { return JSON.parse(localStorage.getItem('cc_project') ?? '{}') } catch { return { name: '', style: 'cartoon' } }
}
function saveProject(p: Project) { localStorage.setItem('cc_project', JSON.stringify(p)) }
function loadChars(): SavedChar[] {
  try { return JSON.parse(localStorage.getItem('cc_chars') ?? '[]') } catch { return [] }
}
function saveChars(chars: SavedChar[]) { localStorage.setItem('cc_chars', JSON.stringify(chars)) }

// ─── shared CSS ───────────────────────────────────────────────────────────────
const SHARED_CSS = `
  .cc-input { background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#f0f0f0;padding:10px 14px;width:100%;font-size:.95rem;outline:none;transition:border-color .2s;font-family:inherit; }
  .cc-input:focus { border-color:#D4AF37; }
  .cc-input:disabled { opacity:.4;cursor:not-allowed; }
  .cc-label { font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:6px;display:block; }
  .cc-btn-gold { background:#D4AF37;color:#000;border:none;border-radius:8px;padding:12px 28px;font-size:.95rem;font-weight:700;cursor:pointer;transition:opacity .15s;white-space:nowrap; }
  .cc-btn-gold:hover { opacity:.88; }
  .cc-btn-ghost { background:#1a1a1a;color:#aaa;border:1px solid #2a2a2a;border-radius:8px;padding:10px 18px;font-size:.88rem;cursor:pointer;transition:all .15s;white-space:nowrap; }
  .cc-btn-ghost:hover { border-color:#444;color:#ddd; }
  .cc-btn-danger { background:transparent;color:#e05555;border:1px solid rgba(224,85,85,.4);border-radius:6px;padding:5px 12px;font-size:.8rem;cursor:pointer;transition:all .15s; }
  .cc-btn-danger:hover { background:rgba(224,85,85,.1); }
  .cc-chip { padding:7px 14px;border-radius:20px;border:1px solid #2a2a2a;background:#111;color:#888;cursor:pointer;font-size:.82rem;transition:all .15s;white-space:nowrap; }
  .cc-chip.on { border-color:#D4AF37;background:rgba(212,175,55,.1);color:#D4AF37; }
  .cc-chip:hover:not(.on) { border-color:#444;color:#ccc; }
  .cc-style-btn { padding:12px 14px;border-radius:10px;border:1px solid #2a2a2a;background:#111;cursor:pointer;transition:all .15s;text-align:left;width:100%; }
  .cc-style-btn.on { border-color:#D4AF37;background:rgba(212,175,55,.08); }
  .cc-style-btn:hover:not(.on) { border-color:#333; }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dialogIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
`

// ─── main ─────────────────────────────────────────────────────────────────────
export function CartoonClient() {
  const [tab, setTab]           = useState<MainTab>('cast')
  const [project, setProjectRaw] = useState<Project>({ name: '', style: 'cartoon' })
  const [chars, setCharsRaw]    = useState<SavedChar[]>([])
  const [hydrated, setHydrated] = useState(false)

  // scene state
  const [sceneStep, setSceneStep]         = useState<SceneStep>('setup')
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([])
  const [scenePremise, setScenePremise]   = useState('')
  const [scenePanels, setScenePanels]     = useState(6)
  const [sceneData, setSceneData]         = useState<SceneData | null>(null)
  const [sceneError, setSceneError]       = useState('')
  const [loadingMsg, setLoadingMsg]       = useState(LOADING_MSGS[0])
  const [generatingImgs, setGeneratingImgs] = useState(false)
  const [loadedCount, setLoadedCount]     = useState(0)
  const [previewIdx, setPreviewIdx]       = useState(0)
  const [autoPlay, setAutoPlay]           = useState(false)

  // import state
  const [importScript, setImportScript]   = useState('')
  const [importStyle, setImportStyle]     = useState('cartoon')
  const [importPanelCount, setImportPanelCount] = useState(8)
  const [extractedImages, setExtractedImages] = useState<string[]>([])
  const [importError, setImportError]     = useState('')

  const seedsRef = useRef<number[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // hydrate from localStorage
  useEffect(() => {
    const p = loadProject()
    setProjectRaw({ name: p.name ?? '', style: p.style ?? 'cartoon' })
    setCharsRaw(loadChars())
    setHydrated(true)
  }, [])

  const setProject = (p: Project) => { setProjectRaw(p); saveProject(p) }
  const setChars   = (c: SavedChar[]) => { setCharsRaw(c); saveChars(c) }

  // loading msg rotation
  useEffect(() => {
    if (sceneStep !== 'generating') return
    let i = 0
    const t = setInterval(() => { i = (i + 1) % LOADING_MSGS.length; setLoadingMsg(LOADING_MSGS[i]) }, 1900)
    return () => clearInterval(t)
  }, [sceneStep])

  // auto-play
  useEffect(() => {
    if (!autoPlay || !sceneData) return
    timerRef.current = setInterval(() => setPreviewIdx(p => (p + 1) % sceneData.panels.length), 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoPlay, sceneData])

  // ── character actions ──────────────────────────────────────────────────────
  const addChar = () => setChars([...chars, { id: uid(), name: '', role: 'supporting', description: '' }])

  const updateChar = (id: string, patch: Partial<SavedChar>) =>
    setChars(chars.map(c => c.id === id ? { ...c, ...patch } : c))

  const removeChar = (id: string) => setChars(chars.filter(c => c.id !== id))

  const analyzeCharImg = async (id: string, file: File) => {
    updateChar(id, { analyzing: true })
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const [header, b64] = dataUrl.split(',')
      const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      updateChar(id, { refImage: dataUrl })
      try {
        const res = await fetch('/api/cartoon/analyze-character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64, mediaType }),
        })
        const { description } = await res.json()
        if (description) updateChar(id, { description })
      } catch { /* leave as-is */ }
      updateChar(id, { analyzing: false })
    }
    reader.readAsDataURL(file)
  }

  // ── scene generation ───────────────────────────────────────────────────────
  const generateScene = async () => {
    if (!scenePremise.trim()) { setSceneError('Describe what happens in this scene.'); return }
    if (!selectedCharIds.length) { setSceneError('Select at least one character.'); return }
    setSceneError('')
    setSceneStep('generating')

    const sceneChars = chars.filter(c => selectedCharIds.includes(c.id))

    try {
      const res = await fetch('/api/cartoon/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.name || 'One Size Fits All',
          genre: 'comedy',
          style: project.style,
          premise: scenePremise,
          characters: sceneChars.map(c => ({ name: c.name, description: c.description, role: c.role })),
          panelCount: scenePanels,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const panels: Panel[] = (data.panels ?? []).map((p: Panel) => ({ ...p, image_loaded: false, image_error: false }))
      seedsRef.current = panels.map(() => Math.floor(Math.random() * 99999))
      setSceneData({ ...data, panels })
      setGeneratingImgs(false)
      setLoadedCount(0)
      setSceneStep('review')
    } catch {
      setSceneError('Generation failed — try again.')
      setSceneStep('setup')
    }
  }

  const generateImages = useCallback(() => {
    if (!sceneData) return
    setGeneratingImgs(true)
    setLoadedCount(0)
    setSceneData(d => d ? {
      ...d,
      panels: d.panels.map((p, i) => ({
        ...p,
        image_url:    buildImageUrl(p.image_prompt, project.style, seedsRef.current[i] ?? i * 137),
        image_loaded: false,
        image_error:  false,
      })),
    } : d)
  }, [sceneData, project.style])

  const onImageLoad = useCallback((idx: number) => {
    setSceneData(d => d ? { ...d, panels: d.panels.map((p, i) => i === idx ? { ...p, image_loaded: true } : p) } : d)
    setLoadedCount(n => n + 1)
  }, [])

  const onImageError = useCallback((idx: number) => {
    setSceneData(d => d ? { ...d, panels: d.panels.map((p, i) => i === idx ? { ...p, image_error: true } : p) } : d)
    setLoadedCount(n => n + 1)
  }, [])

  const retryImage = (idx: number) => {
    if (!sceneData) return
    const seed = Math.floor(Math.random() * 99999)
    seedsRef.current[idx] = seed
    setLoadedCount(n => Math.max(0, n - 1))
    setSceneData(d => d ? {
      ...d,
      panels: d.panels.map((p, i) => i === idx ? {
        ...p,
        image_url: buildImageUrl(p.image_prompt, project.style, seed),
        image_loaded: false, image_error: false,
      } : p),
    } : d)
  }

  // ── import ─────────────────────────────────────────────────────────────────
  const importScript_fn = async () => {
    if (!importScript.trim()) { setImportError('Paste or drop your document first.'); return }
    setImportError('')
    setSceneStep('generating')
    setTab('scene')
    try {
      const res = await fetch('/api/cartoon/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: importScript, style: importStyle, panelCount: importPanelCount }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const panels: Panel[] = (data.panels ?? []).map((p: Panel, i: number) => ({
        ...p,
        image_url:    extractedImages[i] ?? undefined,
        image_loaded: !!extractedImages[i],
        image_error:  false,
      }))
      seedsRef.current = panels.map(() => Math.floor(Math.random() * 99999))
      setSceneData({ ...data, panels })
      setGeneratingImgs(false)
      setLoadedCount(extractedImages.filter(Boolean).length)
      setSceneStep('review')
    } catch {
      setImportError('Import failed — try again.')
      setSceneStep('setup')
      setTab('import')
    }
  }

  const exportPDF = () => {
    if (!sceneData) return
    const win = window.open('', '_blank')
    if (!win) { alert('Allow popups to export PDF.'); return }
    const panelHtml = sceneData.panels.map(p => `
      <div class="panel">
        ${p.image_url && p.image_loaded ? `<img src="${p.image_url}" alt="Panel ${p.panel_number}" />` : `<div class="no-img">${p.panel_number}</div>`}
        <div class="caption">
          <div class="scene">${p.scene_title}</div>
          ${p.dialogue.map(d => `<div class="line"><b>${d.character}:</b> "${d.text}"</div>`).join('')}
        </div>
      </div>`).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sceneData.title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Comic Sans MS",cursive;background:#fff;padding:20px}h1{text-align:center;font-size:2rem;border-bottom:4px solid #000;padding-bottom:10px;margin-bottom:6px}.logline{text-align:center;font-style:italic;font-size:.9rem;margin-bottom:20px;color:#333}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.panel{border:3px solid #000;border-radius:3px;overflow:hidden;break-inside:avoid}.panel img{width:100%;height:200px;object-fit:cover;display:block;border-bottom:2px solid #000}.no-img{width:100%;height:200px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:bold;border-bottom:2px solid #000}.caption{padding:8px 12px}.scene{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:#555;margin-bottom:4px}.line{font-size:.85rem;margin-bottom:2px}@media print{html,body{height:auto}}</style></head><body>
<h1>${sceneData.title}</h1><p class="logline">${sceneData.logline}</p>
<div class="grid">${panelHtml}</div></body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  if (!hydrated) return null

  // ── routing ────────────────────────────────────────────────────────────────
  // scene steps take over full screen
  if (tab === 'scene' && sceneStep === 'generating') return <GeneratingStep msg={loadingMsg} />
  if (tab === 'scene' && sceneStep === 'review' && sceneData) return (
    <ReviewStep
      sceneData={sceneData} style={project.style}
      generatingImgs={generatingImgs} loadedCount={loadedCount}
      onGenerateImages={generateImages}
      onImageLoad={onImageLoad} onImageError={onImageError} onRetry={retryImage}
      onPreview={() => { setPreviewIdx(0); setAutoPlay(false); setSceneStep('preview') }}
      onBack={() => setSceneStep('setup')}
    />
  )
  if (tab === 'scene' && sceneStep === 'preview' && sceneData) return (
    <PreviewStep
      sceneData={sceneData} previewIdx={previewIdx}
      setPreviewIdx={setPreviewIdx} autoPlay={autoPlay}
      setAutoPlay={setAutoPlay}
      onBack={() => setSceneStep('review')}
      onNewScene={() => { setSceneData(null); setScenePremise(''); setSceneStep('setup') }}
      onExport={exportPDF}
    />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{SHARED_CSS}</style>

      {/* Project header */}
      <div style={{ borderBottom: '1px solid #141414', padding: '16px 20px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              className="cc-input"
              placeholder="Show / project name…"
              value={project.name}
              onChange={e => setProject({ ...project, name: e.target.value })}
              style={{ fontWeight: 700, fontSize: '1rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STYLES.map(s => (
              <button
                key={s.id}
                className={`cc-chip ${project.style === s.id ? 'on' : ''}`}
                onClick={() => setProject({ ...project, style: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ borderBottom: '1px solid #141414' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex' }}>
          {([
            { id: 'cast',   label: '👥 Cast' },
            { id: 'scene',  label: '🎬 Scene' },
            { id: 'import', label: '📄 Import Script' },
          ] as { id: MainTab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'scene') setSceneStep('setup') }}
              style={{
                padding: '14px 20px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? '#D4AF37' : 'transparent'}`,
                color: tab === t.id ? '#D4AF37' : '#555',
                fontWeight: tab === t.id ? 700 : 400,
                fontSize: '.9rem', cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'cast'   && <CastTab chars={chars} addChar={addChar} updateChar={updateChar} removeChar={removeChar} analyzeCharImg={analyzeCharImg} />}
        {tab === 'scene'  && sceneStep === 'setup' && (
          <SceneTab
            chars={chars}
            selectedCharIds={selectedCharIds} setSelectedCharIds={setSelectedCharIds}
            premise={scenePremise} setPremise={setScenePremise}
            panelCount={scenePanels} setPanelCount={setScenePanels}
            error={sceneError} onGenerate={generateScene}
          />
        )}
        {tab === 'import' && (
          <ImportTab
            importScript={importScript} setImportScript={setImportScript}
            importStyle={importStyle} setImportStyle={setImportStyle}
            importPanelCount={importPanelCount} setImportPanelCount={setImportPanelCount}
            extractedImages={extractedImages} setExtractedImages={setExtractedImages}
            error={importError} onImport={importScript_fn}
          />
        )}
      </div>
    </div>
  )
}

// ─── cast tab ─────────────────────────────────────────────────────────────────
function CastTab({ chars, addChar, updateChar, removeChar, analyzeCharImg }: {
  chars: SavedChar[]
  addChar: () => void
  updateChar: (id: string, patch: Partial<SavedChar>) => void
  removeChar: (id: string) => void
  analyzeCharImg: (id: string, file: File) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Cast & Characters</h2>
          <p style={{ color: '#444', fontSize: '.82rem', marginTop: 2 }}>Upload reference images — Claude locks in their visual style for every scene</p>
        </div>
        <button className="cc-btn-gold" onClick={addChar}>+ Add Character</button>
      </div>

      {chars.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed #1e1e1e', borderRadius: 12 }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>👥</div>
          <div style={{ color: '#444', marginBottom: 16 }}>No characters yet</div>
          <button className="cc-btn-gold" onClick={addChar}>Add Your First Character</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chars.map((c, idx) => (
          <div key={c.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Photo upload */}
              <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) analyzeCharImg(c.id, f) }} />
                <div style={{
                  width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                  border: c.refImage ? '2px solid #D4AF37' : '2px dashed #2a2a2a',
                  background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'border-color .15s',
                }}>
                  {c.analyzing ? (
                    <div style={{ width: 22, height: 22, border: '2px solid #333', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  ) : c.refImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.refImage} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', opacity: .3 }}>📷</div>
                      <div style={{ fontSize: '.6rem', color: '#333', marginTop: 2 }}>Upload</div>
                    </div>
                  )}
                </div>
              </label>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input className="cc-input" placeholder={`Character ${idx + 1} name`}
                    value={c.name} onChange={e => updateChar(c.id, { name: e.target.value })}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '.9rem' }} />
                  <select className="cc-input" value={c.role}
                    onChange={e => updateChar(c.id, { role: e.target.value as SavedChar['role'] })}
                    style={{ width: 'auto', minWidth: 130, padding: '8px 10px', fontSize: '.85rem' }}>
                    <option value="protagonist">Protagonist</option>
                    <option value="antagonist">Antagonist</option>
                    <option value="supporting">Supporting</option>
                    <option value="recurring">Recurring</option>
                  </select>
                  <button className="cc-btn-danger" onClick={() => removeChar(c.id)}>✕</button>
                </div>
                <textarea className="cc-input"
                  placeholder={c.analyzing ? 'Analyzing your image…' : 'Visual description — or upload a photo above to auto-fill'}
                  value={c.description}
                  onChange={e => updateChar(c.id, { description: e.target.value })}
                  disabled={!!c.analyzing}
                  rows={2}
                  style={{ resize: 'none', fontSize: '.85rem', lineHeight: 1.5 }}
                />
                {c.refImage && !c.analyzing && (
                  <div style={{ fontSize: '.7rem', color: '#D4AF37', marginTop: 4 }}>✓ Visual style locked from reference image</div>
                )}
              </div>
            </div>

            {/* Role badge */}
            {c.name && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em',
                  color: ROLE_COLORS[c.role], border: `1px solid ${ROLE_COLORS[c.role]}40`,
                  borderRadius: 4, padding: '2px 8px', background: `${ROLE_COLORS[c.role]}10`,
                }}>{c.role}</span>
                {c.description && <span style={{ fontSize: '.75rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description.slice(0, 60)}…</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {chars.length > 0 && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: '.75rem', color: '#444' }}>
            {chars.filter(c => c.description).length} of {chars.length} characters described — go to <strong style={{ color: '#D4AF37' }}>Scene</strong> to start generating
          </div>
        </div>
      )}
    </div>
  )
}

// ─── scene tab ────────────────────────────────────────────────────────────────
function SceneTab({ chars, selectedCharIds, setSelectedCharIds, premise, setPremise, panelCount, setPanelCount, error, onGenerate }: {
  chars: SavedChar[]
  selectedCharIds: string[]; setSelectedCharIds: (ids: string[]) => void
  premise: string; setPremise: (s: string) => void
  panelCount: number; setPanelCount: (n: number) => void
  error: string; onGenerate: () => void
}) {
  const toggle = (id: string) =>
    setSelectedCharIds(selectedCharIds.includes(id) ? selectedCharIds.filter(x => x !== id) : [...selectedCharIds, id])

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Generate a Scene</h2>
      <p style={{ color: '#444', fontSize: '.82rem', marginBottom: 24 }}>Each scene is {panelCount} panels. Build your episode scene by scene.</p>

      {/* Character select */}
      <div style={{ marginBottom: 24 }}>
        <label className="cc-label">Who's in this scene?</label>
        {chars.length === 0 ? (
          <div style={{ color: '#444', fontSize: '.85rem', padding: '12px 16px', background: '#0f0f0f', borderRadius: 8, border: '1px solid #1a1a1a' }}>
            No characters yet — add them in the <strong style={{ color: '#D4AF37' }}>Cast</strong> tab first
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chars.map(c => (
              <button
                key={c.id}
                className={`cc-chip ${selectedCharIds.includes(c.id) ? 'on' : ''}`}
                onClick={() => toggle(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 7 }}
              >
                {c.refImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.refImage} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                {c.name || `Character ${chars.indexOf(c) + 1}`}
                <span style={{ fontSize: '.7rem', color: ROLE_COLORS[c.role], opacity: .8 }}>·</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scene description */}
      <div style={{ marginBottom: 24 }}>
        <label className="cc-label">What happens in this scene? *</label>
        <textarea
          className="cc-input"
          rows={4}
          placeholder="Describe the scene — setting, conflict, action, and tone. The more specific, the better the panels.&#10;&#10;Example: Uncle T is outside Oracle Arena hustling bootleg SF Giants shirts when Carlos shows up with a legitimate merch stand right next to him. The two go back and forth until Nia shows up with a school fundraiser sign and steals all the customers."
          value={premise}
          onChange={e => setPremise(e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Panel count */}
      <div style={{ marginBottom: 28 }}>
        <label className="cc-label">Panels in this scene</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[4, 6, 8, 10].map(n => (
            <button key={n} className={`cc-chip ${panelCount === n ? 'on' : ''}`} onClick={() => setPanelCount(n)}>{n}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(224,85,85,.08)', border: '1px solid rgba(224,85,85,.25)', borderRadius: 8, padding: '10px 14px', color: '#e05555', marginBottom: 16, fontSize: '.88rem' }}>
          {error}
        </div>
      )}

      <button className="cc-btn-gold" onClick={onGenerate} style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
        Generate Scene →
      </button>
    </div>
  )
}

// ─── generating step ──────────────────────────────────────────────────────────
function GeneratingStep({ msg }: { msg: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid #1a1a1a', borderTopColor: '#D4AF37', animation: 'spin 1s linear infinite' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#D4AF37', fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>Generating Scene</div>
        <div style={{ color: '#444', fontSize: '.88rem', animation: 'pulse 1.9s ease-in-out infinite' }}>{msg}</div>
      </div>
    </div>
  )
}

// ─── review step ──────────────────────────────────────────────────────────────
function ReviewStep({ sceneData, style, generatingImgs, loadedCount, onGenerateImages, onImageLoad, onImageError, onRetry, onPreview, onBack }: {
  sceneData: SceneData; style: string
  generatingImgs: boolean; loadedCount: number
  onGenerateImages: () => void
  onImageLoad: (i: number) => void; onImageError: (i: number) => void; onRetry: (i: number) => void
  onPreview: () => void; onBack: () => void
}) {
  const total = sceneData.panels.length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', padding: '20px 16px' }}>
      <style>{SHARED_CSS + `.cc-panel-img{width:100%;aspect-ratio:3/2;object-fit:cover;display:block} .cc-panel-ph{width:100%;aspect-ratio:3/2;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px} @keyframes spin2{to{transform:rotate(360deg)}} .cc-spinner{width:22px;height:22px;border:2px solid #222;border-top-color:#D4AF37;border-radius:50%;animation:spin2 .8s linear infinite}`}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '.75rem', color: '#D4AF37', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Scene Generated</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{sceneData.title}</h1>
            <p style={{ color: '#555', fontSize: '.85rem', fontStyle: 'italic', margin: 0 }}>{sceneData.logline}</p>
          </div>
          <button className="cc-btn-ghost" onClick={onBack}>← Back to Setup</button>
        </div>

        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: '.7rem', color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Summary</div>
          <p style={{ color: '#888', fontSize: '.88rem', margin: 0, lineHeight: 1.6 }}>{sceneData.story_summary}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ color: '#444', fontSize: '.82rem' }}>
            {generatingImgs ? `${loadedCount} / ${total} images ready` : `${total} panels`}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!generatingImgs && <button className="cc-btn-gold" onClick={onGenerateImages}>Generate Images</button>}
            {generatingImgs && loadedCount > 0 && <button className="cc-btn-gold" onClick={onPreview}>▶ Preview</button>}
          </div>
        </div>

        {generatingImgs && (
          <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#D4AF37', width: `${(loadedCount / total) * 100}%`, transition: 'width .4s ease', borderRadius: 2 }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {sceneData.panels.map((panel, idx) => (
            <div key={panel.panel_number} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
              {panel.image_url ? (
                panel.image_error ? (
                  <div className="cc-panel-ph">
                    <div style={{ color: '#444', fontSize: '.8rem' }}>Failed</div>
                    <button className="cc-btn-ghost" onClick={() => onRetry(idx)} style={{ padding: '5px 12px', fontSize: '.78rem' }}>Retry</button>
                  </div>
                ) : panel.image_loaded ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={panel.image_url} alt={panel.scene_title} className="cc-panel-img" />
                ) : (
                  <div className="cc-panel-ph">
                    <div className="cc-spinner" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={panel.image_url} alt="" style={{ display: 'none' }} onLoad={() => onImageLoad(idx)} onError={() => onImageError(idx)} />
                  </div>
                )
              ) : (
                <div className="cc-panel-ph">
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e1e1e' }}>{String(idx + 1).padStart(2, '0')}</div>
                  <div style={{ color: '#333', fontSize: '.75rem', textAlign: 'center', maxWidth: '80%', lineHeight: 1.4 }}>{panel.action}</div>
                </div>
              )}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.07em', color: '#333', marginBottom: 3 }}>Panel {panel.panel_number}</div>
                <div style={{ fontWeight: 600, color: '#ddd', fontSize: '.88rem', marginBottom: 6 }}>{panel.scene_title}</div>
                {panel.dialogue.slice(0, 2).map((d, i) => (
                  <div key={i} style={{ fontSize: '.78rem', color: '#555', marginBottom: 2 }}>
                    <span style={{ color: '#D4AF37', fontWeight: 600 }}>{d.character}: </span>
                    <span>&ldquo;{d.text}&rdquo;</span>
                  </div>
                ))}
                {panel.image_loaded && (
                  <button className="cc-btn-ghost" onClick={() => onRetry(idx)} style={{ marginTop: 6, padding: '4px 10px', fontSize: '.72rem' }}>↺ Regenerate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── preview step ─────────────────────────────────────────────────────────────
function PreviewStep({ sceneData, previewIdx, setPreviewIdx, autoPlay, setAutoPlay, onBack, onNewScene, onExport }: {
  sceneData: SceneData; previewIdx: number
  setPreviewIdx: (n: number | ((p: number) => number)) => void
  autoPlay: boolean; setAutoPlay: (v: boolean) => void
  onBack: () => void; onNewScene: () => void; onExport: () => void
}) {
  const panel = sceneData.panels[previewIdx]
  const total = sceneData.panels.length
  const kb    = KB[previewIdx % KB.length]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#f0f0f0', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes kb{from{transform:${kb[0]}}to{transform:${kb[1]}}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes dialogIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} .nav-btn{background:rgba(255,255,255,.08);border:none;color:#fff;width:42px;height:42px;border-radius:50%;font-size:1.2rem;cursor:pointer;transition:background .15s;flex-shrink:0} .nav-btn:hover{background:rgba(255,255,255,.18)} .nav-btn:disabled{opacity:.2;cursor:not-allowed} .sm-btn{background:transparent;color:#D4AF37;border:1px solid rgba(212,175,55,.35);border-radius:6px;padding:6px 14px;font-size:.82rem;cursor:pointer} .sm-btn:hover{background:rgba(212,175,55,.08)} .sm-btn.green{color:#4ade80;border-color:rgba(74,222,128,.35)} .sm-btn.green:hover{background:rgba(74,222,128,.08)}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #111', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sm-btn" onClick={onBack}>← Panels</button>
          <button className="sm-btn" onClick={onNewScene}>+ New Scene</button>
        </div>
        <span style={{ color: '#222', fontSize: '.82rem' }}>{sceneData.title}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`sm-btn ${autoPlay ? 'green' : ''}`} onClick={() => setAutoPlay(!autoPlay)}>
            {autoPlay ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="sm-btn" onClick={onExport}>PDF</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {panel.image_url && panel.image_loaded ? (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={previewIdx} src={panel.image_url} alt={panel.scene_title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'kb 7s ease-in-out forwards', transformOrigin: 'center center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,.5) 0%,transparent 28%,transparent 55%,rgba(0,0,0,.88) 100%)' }} />
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#141414', marginBottom: 8 }}>{String(previewIdx + 1).padStart(2, '0')}</div>
              <div style={{ color: '#2a2a2a', fontSize: '.88rem' }}>{panel.action}</div>
            </div>
          </div>
        )}

        <div key={`t-${previewIdx}`} style={{ position: 'absolute', top: 16, left: 18, right: 18, animation: 'fadeUp .5s ease both' }}>
          <div style={{ fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(212,175,55,.7)', marginBottom: 3 }}>
            {previewIdx + 1} / {total}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>{panel.scene_title}</div>
        </div>

        {panel.dialogue.length > 0 && (
          <div key={`d-${previewIdx}`} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px', animation: 'dialogIn .6s .3s ease both' }}>
            {panel.dialogue.map((d, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,.82)', border: '1px solid rgba(212,175,55,.18)', borderRadius: 8, padding: '7px 13px', marginBottom: 6, backdropFilter: 'blur(4px)', maxWidth: 520 }}>
                <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '.78rem', marginRight: 6 }}>{d.character}:</span>
                <span style={{ color: '#f0f0f0', fontSize: '.88rem' }}>&ldquo;{d.text}&rdquo;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 18px', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button className="nav-btn" onClick={() => setPreviewIdx(p => Math.max(0, p - 1))} disabled={previewIdx === 0}>‹</button>
        <div style={{ flex: 1, display: 'flex', gap: 5, justifyContent: 'center', overflowX: 'auto', padding: '4px 0' }}>
          {sceneData.panels.map((_, i) => (
            <div key={i} onClick={() => setPreviewIdx(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === previewIdx ? '#D4AF37' : '#222', transform: i === previewIdx ? 'scale(1.4)' : 'scale(1)', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }} />
          ))}
        </div>
        <button className="nav-btn" onClick={() => setPreviewIdx(p => Math.min(total - 1, p + 1))} disabled={previewIdx === total - 1}>›</button>
      </div>
    </div>
  )
}

// ─── import tab ───────────────────────────────────────────────────────────────
function ImportTab({ importScript, setImportScript, importStyle, setImportStyle, importPanelCount, setImportPanelCount, extractedImages, setExtractedImages, error, onImport }: {
  importScript: string; setImportScript: (s: string) => void
  importStyle: string;  setImportStyle: (s: string) => void
  importPanelCount: number; setImportPanelCount: (n: number) => void
  extractedImages: string[]; setExtractedImages: (imgs: string[]) => void
  error: string; onImport: () => void
}) {
  const [parsing, setParsing]   = useState(false)
  const [parseErr, setParseErr] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = async (file: File) => {
    setParseErr('')
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'txt') {
      setFileName(file.name); setParsing(true)
      try { setImportScript(await file.text()); setExtractedImages([]) } finally { setParsing(false) }
      return
    }
    if (!['docx', 'doc'].includes(ext ?? '')) {
      setParseErr('Please use a .docx file — File → Download → Microsoft Word (.docx)')
      return
    }
    setParsing(true); setFileName(file.name)
    try {
      const JSZip = (await import('jszip')).default
      const zip   = await JSZip.loadAsync(await file.arrayBuffer())
      const docXml = await zip.file('word/document.xml')?.async('string') ?? ''
      const text = docXml
        .replace(/<w:p[ >][^>]*>/g, '\n').replace(/<w:br[^>]*\/>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
        .replace(/&#x[0-9A-Fa-f]+;/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim()
      const images: string[] = []
      const mediaPaths = Object.keys(zip.files).filter(p => p.startsWith('word/media/') && !zip.files[p].dir)
      for (const p of mediaPaths) {
        const extImg = p.split('.').pop()?.toLowerCase() ?? ''
        const mime   = extImg==='png'?'image/png':extImg==='gif'?'image/gif':extImg==='webp'?'image/webp':'image/jpeg'
        images.push(`data:${mime};base64,${await zip.files[p].async('base64')}`)
      }
      setImportScript(text); setExtractedImages(images)
    } catch (e) {
      console.error(e); setParseErr('Could not read the file. Try exporting as .docx from Google Docs.')
    } finally { setParsing(false) }
  }

  const ready = !!importScript.trim()

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Import Script</h2>
      <p style={{ color: '#444', fontSize: '.82rem', marginBottom: 20 }}>Drop your Google Doc and Claude converts it into scenes</p>

      {!ready ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? '#a78bfa' : '#1e1e1e'}`, borderRadius: 14, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(167,139,250,.05)' : 'transparent', transition: 'all .2s', marginBottom: 16 }}
        >
          <input ref={inputRef} type="file" accept=".docx,.doc,.txt" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
          {parsing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, border: '2px solid #2a2a2a', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ color: '#a78bfa', fontSize: '.9rem' }}>Reading {fileName}…</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📄</div>
              <div style={{ color: '#888', fontWeight: 600, marginBottom: 4 }}>{dragging ? 'Drop it' : 'Drop your .docx here'}</div>
              <div style={{ color: '#333', fontSize: '.8rem', marginBottom: 12 }}>or click to browse</div>
              <div style={{ fontSize: '.75rem', color: '#2a2a2a' }}>Google Docs → File → Download → Microsoft Word (.docx)</div>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ color: '#4ade80', fontWeight: 600, fontSize: '.88rem' }}>✓ {fileName} parsed</div>
            <button className="cc-btn-ghost" onClick={() => { setImportScript(''); setExtractedImages([]); setFileName('') }} style={{ padding: '5px 12px', fontSize: '.78rem' }}>Replace</button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ fontSize: '.65rem', color: '#333', textTransform: 'uppercase' }}>Text</div>
              <div style={{ color: '#ddd', fontWeight: 600, fontSize: '.88rem' }}>{importScript.length.toLocaleString()} chars</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ fontSize: '.65rem', color: '#333', textTransform: 'uppercase' }}>Images</div>
              <div style={{ color: extractedImages.length > 0 ? '#D4AF37' : '#444', fontWeight: 600, fontSize: '.88rem' }}>{extractedImages.length}</div>
            </div>
          </div>
          {extractedImages.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {extractedImages.slice(0, 10).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #222' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {parseErr && <div style={{ background: 'rgba(224,85,85,.08)', border: '1px solid rgba(224,85,85,.25)', borderRadius: 8, padding: '10px 14px', color: '#e05555', marginBottom: 14, fontSize: '.85rem' }}>{parseErr}</div>}

      {ready && (
        <>
          <div style={{ marginBottom: 18 }}>
            <label className="cc-label">Panels to generate</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[6, 8, 10, 12].map(n => (
                <button key={n} className={`cc-chip ${importPanelCount === n ? 'on' : ''}`} onClick={() => setImportPanelCount(n)}>{n}</button>
              ))}
            </div>
          </div>
          {error && <div style={{ background: 'rgba(224,85,85,.08)', border: '1px solid rgba(224,85,85,.25)', borderRadius: 8, padding: '10px 14px', color: '#e05555', marginBottom: 14, fontSize: '.88rem' }}>{error}</div>}
          <button className="cc-btn-gold" onClick={onImport} style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>Convert to Scene →</button>
        </>
      )}
    </div>
  )
}
