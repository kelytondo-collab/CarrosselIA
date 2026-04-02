import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Download, FileArchive, Wand2, Palette, Type, Image } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import type { ColorPalette, StorySlide, Caption } from '../../types'
import { exportSlideAsImage, exportAllSlidesAsZip } from '../../services/exportService'
import { generateSlideImage } from '../../services/geminiService'
import { getDefaultProfile, updateProjectStories } from '../../services/storageService'
import CaptionEditor from '../caption/CaptionEditor'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

function buildPalettes(): { id: string; label: string; p: ColorPalette }[] {
  const profile = getDefaultProfile()
  const bk = profile?.brandKit
  const base: { id: string; label: string; p: ColorPalette }[] = []
  if (bk) {
    base.push({ id: 'brand', label: profile?.name || 'Sua Marca', p: bk.colors })
  } else if (profile?.color_palette) {
    const cp = profile.color_palette
    base.push({
      id: 'brand',
      label: profile.name || 'Sua Marca',
      p: {
        primary: cp.primary,
        secondary: cp.secondary || '#0f172a',
        accent: cp.accent || '#f8fafc',
        background: cp.background || cp.secondary || '#0f172a',
        text: cp.text || '#ffffff',
      },
    })
  }
  return [
    ...base,
    { id: 'black', label: 'Preto', p: { primary: '#ffffff', secondary: '#000000', accent: '#ffffff', background: '#000000', text: '#ffffff' } },
    { id: 'white', label: 'Branco', p: { primary: '#000000', secondary: '#ffffff', accent: '#000000', background: '#ffffff', text: '#000000' } },
    { id: 'violet', label: 'Violeta', p: { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc', background: '#0f0a1a', text: '#ffffff' } },
    { id: 'gold', label: 'Ouro', p: { primary: '#d97706', secondary: '#050505', accent: '#fafafa', background: '#050505', text: '#d97706' } },
    { id: 'rose', label: 'Rosa', p: { primary: '#ec4899', secondary: '#1f001a', accent: '#fff', background: '#1f001a', text: '#ffffff' } },
    { id: 'cyan', label: 'Ciano', p: { primary: '#06b6d4', secondary: '#0c1a2e', accent: '#f0f9ff', background: '#0c1a2e', text: '#f0f9ff' } },
    { id: 'emerald', label: 'Verde', p: { primary: '#10b981', secondary: '#052e16', accent: '#f0fdf4', background: '#052e16', text: '#f0fdf4' } },
  ]
}

const FONT_OPTIONS: { id: string; label: string; title: string; sub: string }[] = [
  { id: 'inter', label: 'Inter', title: 'Inter, sans-serif', sub: 'Inter, sans-serif' },
  { id: 'playfair', label: 'Elegante', title: '"Playfair Display", serif', sub: 'Inter, sans-serif' },
  { id: 'georgia', label: 'Clássica', title: 'Georgia, serif', sub: 'Georgia, serif' },
  { id: 'helvetica', label: 'Bold', title: '"Helvetica Neue", Arial, sans-serif', sub: 'Arial, sans-serif' },
]

function buildFonts() {
  const profile = getDefaultProfile()
  const bk = profile?.brandKit
  const base: { id: string; label: string; title: string; sub: string }[] = []
  if (bk) base.push({ id: 'brand', label: 'Sua Marca', title: `"${bk.fonts.title.family}", ${bk.fonts.title.category}`, sub: `"${bk.fonts.body.family}", ${bk.fonts.body.category}` })
  return [...base, ...FONT_OPTIONS]
}

function getProfileFont() {
  const profile = getDefaultProfile()
  if (profile?.preferred_font) {
    return FONT_OPTIONS.find(f => f.id === profile.preferred_font) || FONT_OPTIONS[0]
  }
  if (profile?.brandKit) return buildFonts()[0]
  return FONT_OPTIONS[0]
}

// Display: 216x384 (x5 = 1080x1920)
const DISP_W = 216
const DISP_H = 384

export default function StoriesPreview() {
  const { currentProject, setView, apiKey, expertPhotoBase64, refreshProjects } = useApp()
  const storiesData = currentProject?.current_stories_data
  const profile = getDefaultProfile()
  const logo = profile?.brandKit?.logo

  const PALETTES = buildPalettes()
  const FONTS = buildFonts()

  const brandPal = PALETTES.find(p => p.id === 'brand') || PALETTES[0]
  const [palette, setPalette] = useState(brandPal)
  const [font, setFont] = useState(getProfileFont())
  const [slides, setSlides] = useState<StorySlide[]>(storiesData?.slides || [])
  const [generatingImg, setGeneratingImg] = useState<Set<number>>(new Set())
  const [dlAllLoading, setDlAllLoading] = useState(false)
  const [fontScale, setFontScale] = useState(1.0)

  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  if (!storiesData || slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum story carregado</p>
          <button onClick={() => setView('stories-editor' as View)} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Criar stories</button>
        </div>
      </div>
    )
  }

  const saveSlides = (newSlides: StorySlide[]) => {
    setSlides(newSlides)
    if (currentProject && storiesData) {
      const updated = { ...storiesData, slides: newSlides }
      updateProjectStories(currentProject.id, updated)
      refreshProjects()
    }
  }

  const handleImageUpload = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const next = [...slides]; next[idx] = { ...next[idx], imageUrl: ev.target?.result as string }
      saveSlides(next)
    }
    reader.readAsDataURL(file)
  }

  const genImage = async (idx: number, useExpertPhoto: boolean) => {
    if (!apiKey) { toast.error('Configure chave Gemini'); return }
    setGeneratingImg(prev => new Set([...prev, idx]))
    const label = useExpertPhoto ? 'foto expert' : 'fundo'
    const toastId = toast.loading(`Gerando ${label} story ${idx + 1}...`)
    try {
      const slide = slides[idx]
      let prompt: string
      if (useExpertPhoto) {
        prompt = slide.visualPrompt || `Fotografia profissional de especialista em ${profile?.niche || 'negócios'}, formato vertical stories`
      } else {
        const contentContext = `Fundo abstrato/metafórico para story sobre: "${slide.headline}". ${slide.body ? `Contexto: ${slide.body.slice(0, 100)}` : ''}`
        prompt = `${slide.visualPrompt || contentContext}. IMPORTANTE: Fundo abstrato, texturas, gradientes ou metáfora visual. SEM rostos humanos, SEM texto escrito na imagem, SEM logos.`
      }
      const url = await generateSlideImage(prompt, '9:16', useExpertPhoto ? expertPhotoBase64 : undefined)
      const next = [...slides]; next[idx] = { ...next[idx], imageUrl: url }
      saveSlides(next)
      toast.success(`${useExpertPhoto ? 'Foto expert' : 'Fundo'} gerado!`, { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally {
      setGeneratingImg(prev => { const n = new Set(prev); n.delete(idx); return n })
    }
  }

  const dlSlide = async (i: number) => {
    const el = slideRefs.current[i]
    if (!el) return
    try {
      const blob = await exportSlideAsImage(el, 5) // 216*5=1080
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `story-${i + 1}.png`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Erro ao exportar') }
  }

  const handleDlAll = async () => {
    const els = slideRefs.current.filter(Boolean) as HTMLElement[]
    if (!els.length) return
    setDlAllLoading(true)
    const toastId = toast.loading('Exportando ZIP...')
    try {
      await exportAllSlidesAsZip(els, currentProject?.name || 'stories')
      toast.success('ZIP baixado!', { id: toastId })
    } catch { toast.error('Erro', { id: toastId }) } finally { setDlAllLoading(false) }
  }

  const bgColor = palette.p.background || palette.p.secondary
  const txtColor = palette.p.text || palette.p.accent

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('stories-editor' as View)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">{currentProject?.name || 'Stories'}</h1>
            <p className="text-xs text-gray-400">{slides.length} stories · 1080×1920</p>
          </div>
        </div>
        <button onClick={handleDlAll} disabled={dlAllLoading} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          <FileArchive size={15} /> Download ZIP
        </button>
      </div>

      {/* Controls */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette size={11} /> Cor</p>
            <div className="flex gap-2">
              {PALETTES.map(p => (
                <button key={p.id} onClick={() => setPalette(p)} title={p.label} style={{ background: `linear-gradient(135deg, ${p.p.background || p.p.secondary} 50%, ${p.p.primary} 50%)` }} className={cn('w-7 h-7 rounded-full transition-all border', palette.id === p.id ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-105', p.p.background === '#ffffff' ? 'border-gray-300' : 'border-transparent')} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Type size={11} /> Fonte</p>
            <div className="flex gap-1">
              {FONTS.map(f => (
                <button key={f.id} onClick={() => setFont(f)} className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all', font.id === f.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>{f.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Type size={11} /> Tamanho</p>
            <div className="flex items-center gap-2">
              <input type="range" min="0.7" max="1.8" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-20 h-1.5 accent-violet-600" />
              <span className="text-xs text-gray-500 font-mono w-8">{Math.round(fontScale * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stories grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex gap-6 overflow-x-auto pb-4">
          {slides.map((slide, i) => {
            const bg = slide.imageUrl
              ? `linear-gradient(to bottom, ${bgColor}10 0%, ${bgColor}30 30%, ${bgColor}dd 100%), url(${slide.imageUrl}) center/cover no-repeat`
              : `linear-gradient(180deg, ${bgColor} 0%, ${palette.p.secondary} 100%)`
            const color = slide.imageUrl ? palette.p.primary : txtColor
            const subColor = slide.imageUrl ? `${palette.p.primary}dd` : `${txtColor}cc`

            return (
              <div key={slide.id} className="flex flex-col gap-2 shrink-0">
                {/* Card */}
                <div
                  ref={el => { slideRefs.current[i] = el }}
                  style={{
                    width: DISP_W, height: DISP_H, background: bg,
                    padding: 20, paddingTop: 50, paddingBottom: 60,
                    display: 'flex', flexDirection: 'column', justifyContent: slide.imageUrl ? 'flex-end' : 'center',
                    boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
                    fontFamily: font.sub, borderRadius: 16,
                  }}
                  className="shadow-lg"
                >
                  {/* Safe zone top indicator */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, background: 'rgba(0,0,0,0.1)' }} />

                  {/* Content */}
                  <h2 style={{ fontSize: 18 * fontScale, fontWeight: 900, color, lineHeight: 1.2, margin: 0, fontFamily: font.title, letterSpacing: '-0.01em' }}>
                    {slide.headline}
                  </h2>
                  <div style={{ height: 8 }} />
                  <p style={{ fontSize: 11 * fontScale, color: subColor, lineHeight: 1.6, margin: 0, fontFamily: font.sub }}>
                    {slide.body}
                  </p>

                  {/* Question box */}
                  {slide.type === 'question' && slide.questionText && (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.15)', borderRadius: 12, backdropFilter: 'blur(10px)' }}>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Sua pergunta</p>
                      <p style={{ fontSize: 11, color, margin: 0, fontWeight: 600 }}>{slide.questionText}</p>
                      <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Toque para responder...</span>
                      </div>
                    </div>
                  )}

                  {/* Poll */}
                  {slide.type === 'poll' && slide.pollOptions && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 10, color, margin: '0 0 6px', fontWeight: 700 }}>{slide.pollQuestion}</p>
                      {slide.pollOptions.map((opt, oi) => (
                        <div key={oi} style={{ marginBottom: 4, padding: '8px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 8 }}>
                          <span style={{ fontSize: 10, color, fontWeight: 500 }}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Logo */}
                  {logo && (
                    <div style={{ position: 'absolute', bottom: 65, right: 16 }}>
                      <img src={logo} alt="" style={{ height: 16, maxWidth: 50, objectFit: 'contain', opacity: 0.6 }} />
                    </div>
                  )}

                  {/* Safe zone bottom */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, background: 'rgba(0,0,0,0.1)' }} />

                  {generatingImg.has(i) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70" style={{ borderRadius: 16 }}>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Type badge (outside card - not exported) */}
                <div className="text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    {slide.type === 'question' ? 'Caixinha' : slide.type === 'poll' ? 'Enquete' : `Story ${i + 1}`}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-1" style={{ width: DISP_W }}>
                  <button onClick={() => { const next = [...slides]; next[i] = { ...next[i], imageUrl: undefined }; saveSlides(next) }} className="flex-1 py-1 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500">🎨</button>
                  <label className="flex-1 py-1 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 text-center cursor-pointer">
                    <Image size={10} className="inline mr-0.5" />Foto
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(i, e)} />
                  </label>
                  <button onClick={() => genImage(i, true)} disabled={generatingImg.has(i)} className="flex-1 py-1 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 disabled:opacity-40" title="Foto com seu rosto">
                    <Wand2 size={10} className="inline mr-0.5" />Expert
                  </button>
                  <button onClick={() => genImage(i, false)} disabled={generatingImg.has(i)} className="flex-1 py-1 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 disabled:opacity-40" title="Fundo abstrato sem rosto">
                    <Wand2 size={10} className="inline mr-0.5" />Fundo
                  </button>
                  <button onClick={() => dlSlide(i)} className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500">
                    <Download size={10} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Caption section */}
        {storiesData.caption && (
          <div className="mt-6 max-w-2xl">
            <CaptionEditor
              caption={storiesData.caption}
              onChange={(updated: Caption) => {
                if (currentProject && storiesData) {
                  const newData = { ...storiesData, caption: updated }
                  updateProjectStories(currentProject.id, newData)
                  refreshProjects()
                }
              }}
              projectName={currentProject?.name || 'stories'}
              niche={profile?.niche || ''}
            />
          </div>
        )}
      </div>
    </div>
  )
}
