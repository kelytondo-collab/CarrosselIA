import { useState, useRef, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Download, FileArchive, Image, Palette, Type, Wand2, Copy, Check, LayoutGrid } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import SlideCard from './SlideCard'
import CaptionEditor from '../caption/CaptionEditor'
import type { ColorPalette, SlideData, Caption } from '../../types'
import type { SlideTemplate } from '../shared/LayoutTemplates'
import { TEMPLATES } from '../shared/LayoutTemplates'
import GradientPicker, { GRADIENT_PRESETS, BackgroundTypeSelector } from '../shared/GradientPicker'
import type { BackgroundType } from '../shared/GradientPicker'
import StyledSlideCard from './StyledSlideCard'
import StyleSelector from '../shared/StyleSelector'
import type { StylePackId, StyleSlideConfig } from '../../types/stylePacks'
import { getStylePackWithUserPalette, getSlideSequence } from '../shared/StylePacks'
import { exportSlideAsImage, exportAllSlidesAsZip, exportManyChatAsTxt } from '../../services/exportService'
import { generateSlideImage } from '../../services/geminiService'
import { updateProjectCarousel, getDefaultProfile } from '../../services/storageService'
import { saveCarouselImages, restoreCarouselImages } from '../../services/imageCache'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

type Tab = 'slides' | 'estrategia' | 'legenda' | 'manychat'

function buildPalettes(): { id: string; label: string; p: ColorPalette }[] {
  const defaultProfile = getDefaultProfile()
  const brandKit = defaultProfile?.brandKit
  const base: { id: string; label: string; p: ColorPalette }[] = []

  // Use brandKit if available, otherwise use profile color_palette
  if (brandKit) {
    base.push({ id: 'brand', label: defaultProfile?.name || 'Sua Marca', p: brandKit.colors })
  } else if (defaultProfile?.color_palette) {
    const cp = defaultProfile.color_palette
    base.push({
      id: 'brand',
      label: defaultProfile.name || 'Sua Marca',
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

function buildFonts(): { id: string; label: string; title: string; sub: string }[] {
  const defaultProfile = getDefaultProfile()
  const brandKit = defaultProfile?.brandKit
  const base: { id: string; label: string; title: string; sub: string }[] = []

  if (brandKit) {
    base.push({
      id: 'brand',
      label: 'Sua Marca',
      title: `"${brandKit.fonts.title.family}", ${brandKit.fonts.title.category}`,
      sub: `"${brandKit.fonts.body.family}", ${brandKit.fonts.body.category}`,
    })
  }

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

// Display sizes (4:5 ratio)
const DISP_W = 300
const DISP_H = 375

export default function CarouselPreview() {
  const { setView, currentProject, currentCarousel, setCurrentCarousel, refreshProjects, apiKey, expertPhotoBase64 } = useApp()
  const [tab, setTab] = useState<Tab>('slides')
  const PALETTES = buildPalettes()
  const FONTS = buildFonts()
  const brandPal = PALETTES.find(p => p.id === 'brand') || PALETTES[0]
  const [palette, setPalette] = useState(brandPal)
  const [font, setFont] = useState(getProfileFont())
  const [brand, setBrand] = useState(() => {
    const p = getDefaultProfile()
    return p?.instagramHandle || (p?.name ? `@${p.name.toLowerCase().replace(/\s+/g, '')}` : '')
  })
  const [slides, setSlides] = useState<SlideData[]>(currentCarousel?.slides || [])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editHeadline, setEditHeadline] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [generatingImg, setGeneratingImg] = useState<Set<number>>(new Set())
  const [promptEditIdx, setPromptEditIdx] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const editPromptRef = useRef('')
  const [genAllProgress, setGenAllProgress] = useState<{ current: number; total: number } | null>(null)
  const [downloadingSlide, setDownloadingSlide] = useState<number | null>(null)
  const [dlAllLoading, setDlAllLoading] = useState(false)
  const [copied, setCopied] = useState('')
  const [slideTemplates, setSlideTemplates] = useState<Record<number, SlideTemplate>>({})
  const [slideBgTypes, setSlideBgTypes] = useState<Record<number, BackgroundType>>({})
  const [customGradient, setCustomGradient] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [fontScale, setFontScale] = useState(1.0)
  const [stylePack, setStylePack] = useState<StylePackId>(() => {
    const p = getDefaultProfile()
    return (p?.stylePackId as StylePackId) || 'livre'
  })
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  // Restore cached images on mount
  useEffect(() => {
    if (currentProject?.id && slides.length > 0) {
      restoreCarouselImages(currentProject.id, slides).then(restored => {
        const hasChanges = restored.some((s, i) => s.imageUrl !== slides[i].imageUrl)
        if (hasChanges) setSlides(restored as SlideData[])
      })
    }
  }, [currentProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-apply style pack when imported with autoStyle flag
  useEffect(() => {
    const carousel = currentCarousel as any
    if (carousel?.autoStyle && stylePack === 'livre') {
      const profile = getDefaultProfile()
      const profileStyle = (profile?.stylePackId as StylePackId) || 'presenca-dourada'
      if (profileStyle !== 'livre') setStylePack(profileStyle)
      else setStylePack('presenca-dourada') // fallback to first pack
    }
  }, [currentCarousel]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Style Pack logic ──
  const userPalette = getDefaultProfile()?.brandKit?.colors || getDefaultProfile()?.color_palette || null
  const activePack = stylePack !== 'livre' ? getStylePackWithUserPalette(stylePack, userPalette) : null
  const slideSeq = activePack ? getSlideSequence(activePack, slides.length) : null

  function mapSlide(i: number): StyleSlideConfig {
    if (!slideSeq) return { variant: 'gold-dark', role: 'content' }
    const slide = slides[i]
    const sem = slide?.semanticType

    // Semantic type only used for special roles (cover, cta, checklist)
    // Content slides ALWAYS use positional mapping to preserve alternation
    if (sem) {
      const specialMap: Record<string, StyleSlideConfig['role']> = {
        capa: 'cover', lista: 'checklist', cta: 'cta',
      }
      const specialRole = specialMap[sem]
      if (specialRole) {
        const match = slideSeq.find(s => s.role === specialRole)
        if (match) return match
      }
      // dor, conteudo → fall through to positional mapping below
    }

    // Positional mapping — preserves design alternation (dark/light, photo/accent/white)
    if (i === 0) return slideSeq[0]
    if (i === slides.length - 1) return slideSeq[slideSeq.length - 1]
    const mid = slideSeq.slice(1, -1)
    if (mid.length === 0) return slideSeq[0]
    return mid[(i - 1) % mid.length]
  }

  if (!currentCarousel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum carrossel carregado</p>
          <button onClick={() => setView('editor')} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">
            Criar carrossel
          </button>
        </div>
      </div>
    )
  }

  const { strategy, caption, manychat, seoKeywords } = currentCarousel

  const saveSlides = (newSlides: SlideData[]) => {
    setSlides(newSlides)
    if (currentProject && currentCarousel) {
      const updated = { ...currentCarousel, slides: newSlides }
      setCurrentCarousel(updated)
      updateProjectCarousel(currentProject.id, updated)
      refreshProjects()
      // Persist images to IndexedDB (async, non-blocking)
      saveCarouselImages(currentProject.id, newSlides)
    }
  }

  const setTextPosition = (idx: number, pos: 'top' | 'middle' | 'bottom') => {
    const next = [...slides]
    next[idx] = { ...next[idx], style: { ...next[idx].style, textPosition: pos } }
    saveSlides(next)
  }

  const startEdit = (i: number) => {
    setEditingIdx(i)
    setEditHeadline(slides[i].headline)
    setEditSubtitle(slides[i].subtitle)
  }

  const saveEdit = () => {
    if (editingIdx === null) return
    const next = [...slides]
    next[editingIdx] = { ...next[editingIdx], headline: editHeadline, subtitle: editSubtitle }
    saveSlides(next)
    setEditingIdx(null)
  }

  const handleImageUpload = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const next = [...slides]
      next[idx] = { ...next[idx], imageUrl: ev.target?.result as string, imageError: undefined }
      saveSlides(next)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (idx: number) => {
    const next = [...slides]
    next[idx] = { ...next[idx], imageUrl: undefined }
    saveSlides(next)
  }

  const genAllImages = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configurações'); return }
    const total = slides.length
    setGenAllProgress({ current: 0, total })
    const toastId = toast.loading(`Gerando imagens 0/${total}...`)
    let updatedSlides = [...slides]
    for (let i = 0; i < total; i++) {
      setGenAllProgress({ current: i + 1, total })
      toast.loading(`Gerando slide ${i + 1}/${total}...`, { id: toastId })
      try {
        const url = await generateSlideImage(
          slides[i].visualPrompt,
          currentCarousel.format || '4:5',
          expertPhotoBase64
        )
        updatedSlides = updatedSlides.map((s, idx) =>
          idx === i ? { ...s, imageUrl: url, imageError: undefined } : s
        )
        setSlides([...updatedSlides])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro'
        updatedSlides = updatedSlides.map((s, idx) =>
          idx === i ? { ...s, imageError: msg } : s
        )
      }
    }
    saveSlides(updatedSlides)
    setGenAllProgress(null)
    toast.success('Imagens geradas!', { id: toastId })
  }

  const openPromptEdit = (idx: number) => {
    const p = slides[idx].visualPrompt
    setEditPrompt(p)
    editPromptRef.current = p
    setPromptEditIdx(idx)
  }

  const genImage = async (idx: number, prompt?: string, useExpertPhoto: boolean = false) => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configurações'); return }
    let finalPrompt = prompt ?? slides[idx].visualPrompt
    // Save edited prompt to slide
    if (prompt && prompt !== slides[idx].visualPrompt) {
      const next = [...slides]
      next[idx] = { ...next[idx], visualPrompt: prompt }
      setSlides(next)
    }
    // For background mode, add safe instructions
    if (!useExpertPhoto && !prompt) {
      const slide = slides[idx]
      finalPrompt = `Fundo abstrato/metafórico para slide sobre: "${slide.headline}". ${finalPrompt || ''}. IMPORTANTE: Fundo abstrato, texturas, gradientes ou metáfora visual. SEM rostos humanos, SEM texto, SEM logos.`
    }
    setPromptEditIdx(null)
    setGeneratingImg(prev => new Set([...prev, idx]))
    const label = useExpertPhoto ? 'foto expert' : 'fundo'
    const toastId = toast.loading(`Gerando ${label} do slide ${idx + 1}...`)
    try {
      const url = await generateSlideImage(finalPrompt, currentCarousel.format || '4:5', useExpertPhoto ? expertPhotoBase64 : undefined)
      const next = [...slides]
      next[idx] = { ...next[idx], imageUrl: url, imageError: undefined, visualPrompt: finalPrompt }
      saveSlides(next)
      toast.success(`${useExpertPhoto ? 'Foto expert' : 'Fundo'} gerado!`, { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      toast.error(msg, { id: toastId })
      const next = [...slides]
      next[idx] = { ...next[idx], imageError: msg }
      setSlides(next)
    } finally {
      setGeneratingImg(prev => { const n = new Set(prev); n.delete(idx); return n })
    }
  }

  const dlSlide = async (i: number) => {
    const el = slideRefs.current[i]
    if (!el) return
    setDownloadingSlide(i)
    try {
      const blob = await exportSlideAsImage(el, 3)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `slide-${i + 1}.png`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Erro ao exportar') } finally { setDownloadingSlide(null) }
  }

  const handleDlAll = async () => {
    const els = slideRefs.current.filter(Boolean) as HTMLElement[]
    if (!els.length) return
    setDlAllLoading(true)
    const toastId = toast.loading('Exportando ZIP...')
    try {
      await exportAllSlidesAsZip(els, currentProject?.name || 'carrossel')
      toast.success('ZIP baixado!', { id: toastId })
    } catch { toast.error('Erro ao exportar', { id: toastId }) } finally { setDlAllLoading(false) }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
    toast.success('Copiado!')
  }

  const formatFlow = (flow: typeof manychat.flow2) => {
    if (typeof flow === 'string') return flow
    if (Array.isArray(flow)) return (flow as { step: string; message: string }[]).map(f => `${f.step}:\n${f.message}`).join('\n\n')
    return ''
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'slides', label: '🖼 Slides' },
    { id: 'estrategia', label: '🧠 Estratégia' },
    { id: 'legenda', label: '✍️ Legenda' },
    { id: 'manychat', label: '💬 ManyChat' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">{currentProject?.name || 'Carrossel'}</h1>
            <p className="text-xs text-gray-400">{slides.length} slides · {currentCarousel.format || '4:5'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDlAll}
            disabled={dlAllLoading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            <FileArchive size={15} />
            <span className="hidden sm:inline">Download ZIP</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 pb-0 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all',
                tab === t.id
                  ? 'bg-white dark:bg-gray-900 border border-b-white dark:border-gray-700 dark:border-b-gray-900 text-violet-700 dark:text-violet-300 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* SLIDES TAB */}
        {tab === 'slides' && (
          <div className="px-6 py-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-start mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              {/* Style Pack selector */}
              <StyleSelector selected={stylePack} onChange={setStylePack} />

              {/* Palette — only in livre mode */}
              {!activePack && <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette size={11} /> Cor</p>
                <div className="flex gap-2">
                  {PALETTES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPalette(p)}
                      title={p.label}
                      style={{ background: `linear-gradient(135deg, ${p.p.background || p.p.secondary} 50%, ${p.p.primary} 50%)` }}
                      className={cn('w-7 h-7 rounded-full transition-all border', palette.id === p.id ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-105', p.p.background === '#ffffff' ? 'border-gray-300' : 'border-transparent')}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-center gap-0.5">
                      <input type="color" value={palette.p.primary} onChange={e => setPalette({ ...palette, id: 'custom', label: 'Custom', p: { ...palette.p, primary: e.target.value } })} className="w-6 h-6 rounded cursor-pointer border border-gray-300 dark:border-gray-600" title="Cor principal" />
                      <span className="text-[8px] text-gray-400">Texto</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <input type="color" value={palette.p.background || palette.p.secondary} onChange={e => setPalette({ ...palette, id: 'custom', label: 'Custom', p: { ...palette.p, background: e.target.value } })} className="w-6 h-6 rounded cursor-pointer border border-gray-300 dark:border-gray-600" title="Cor de fundo" />
                      <span className="text-[8px] text-gray-400">Fundo</span>
                    </div>
                  </div>
                </div>
              </div>}

              {/* Gradient override — only in livre mode */}
              {!activePack && <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette size={11} /> Fundo</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setCustomGradient('')}
                    title="Usar cor da paleta"
                    className={cn('w-7 h-7 rounded-full transition-all border text-[8px] font-bold flex items-center justify-center', !customGradient ? 'ring-2 ring-offset-2 ring-violet-500 scale-110 border-violet-400 bg-gray-100 dark:bg-gray-700' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-400')}
                  >
                    ✕
                  </button>
                  {GRADIENT_PRESETS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setCustomGradient(g.id)}
                      title={g.label}
                      style={{ background: g.css }}
                      className={cn('w-7 h-7 rounded-full transition-all border', customGradient === g.id ? 'ring-2 ring-offset-2 ring-violet-500 scale-110 border-violet-400' : 'border-gray-300 dark:border-gray-600 hover:scale-105')}
                    />
                  ))}
                </div>
              </div>}

              {/* Font — only in livre mode */}
              {!activePack && <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Type size={11} /> Fonte</p>
                <div className="flex gap-1">
                  {FONTS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFont(f)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        font.id === f.id
                          ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>}

              {/* Gen All */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Wand2 size={11} /> IA</p>
                <button
                  onClick={genAllImages}
                  disabled={genAllProgress !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} />
                  {genAllProgress ? `${genAllProgress.current}/${genAllProgress.total}` : 'Gerar todas'}
                </button>
                {genAllProgress && (
                  <div className="mt-1.5 h-1.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${(genAllProgress.current / genAllProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Brand */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Marca</p>
                <input
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="@sua_marca"
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white w-32 focus:outline-none focus:border-violet-400"
                />
              </div>

              {/* Font Scale */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Type size={11} /> Tamanho</p>
                <div className="flex items-center gap-2">
                  <input type="range" min="0.7" max="1.6" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-20 h-1.5 accent-violet-600" />
                  <span className="text-xs text-gray-500 font-mono w-8">{Math.round(fontScale * 100)}%</span>
                </div>
              </div>

              {/* Templates toggle — only in livre mode */}
              {!activePack && <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><LayoutGrid size={11} /> Layout</p>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all', showTemplates ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}
                >
                  <LayoutGrid size={12} />
                  Templates
                </button>
              </div>}
            </div>

            {/* Template selector panel — only in livre mode */}
            {!activePack && showTemplates && (
              <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 mb-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gradientes</p>
                  <GradientPicker selected={customGradient} onSelect={g => setCustomGradient(g.id)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Templates de Texto (aplique por slide abaixo)</p>
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATES.map(t => (
                      <span key={t.id} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-400">
                        {t.category === 'capa' ? '🎯' : t.category === 'cta' ? '🔥' : '📝'} {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Slides grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((slide, i) => (
                <div key={slide.id} className="flex flex-col gap-2">
                  {/* Card */}
                  <div style={{ width: DISP_W, borderRadius: 12, overflow: 'hidden', position: 'relative' }} className="shadow-md group cursor-pointer" onClick={() => { if (editingIdx !== i && !generatingImg.has(i)) startEdit(i) }}>
                    {activePack && slideSeq ? (
                      <StyledSlideCard
                        ref={el => { slideRefs.current[i] = el }}
                        slide={slide}
                        index={i}
                        total={slides.length}
                        pack={activePack}
                        variant={mapSlide(i).variant}
                        role={mapSlide(i).role}
                        brand={brand}
                        expertPhoto={expertPhotoBase64}
                        width={DISP_W}
                        height={DISP_H}
                        fontScale={fontScale}
                      />
                    ) : (
                      <SlideCard
                        ref={el => { slideRefs.current[i] = el }}
                        slide={slide}
                        index={i}
                        total={slides.length}
                        palette={palette.p}
                        brand={brand}
                        width={DISP_W}
                        height={DISP_H}
                        titleFont={font.title}
                        subtitleFont={font.sub}
                        template={slideTemplates[i]}
                        customGradient={!slide.imageUrl && customGradient ? GRADIENT_PRESETS.find(g => g.id === customGradient)?.css : undefined}
                        fontScale={fontScale}
                      />
                    )}
                    {generatingImg.has(i) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 rounded-xl">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <p className="text-white text-xs font-medium">Gerando imagem...</p>
                      </div>
                    )}
                    {/* Hover edit indicator */}
                    {editingIdx !== i && !generatingImg.has(i) && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none rounded-xl">
                        <span className="px-3 py-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-lg">Clique para editar</span>
                      </div>
                    )}
                  </div>

                  {/* Background type */}
                  <BackgroundTypeSelector
                    value={slideBgTypes[i] || (slide.imageUrl ? 'photo' : 'gradient')}
                    onChange={(type) => {
                      setSlideBgTypes(prev => ({ ...prev, [i]: type }))
                      if (type === 'gradient') removeImage(i)
                      else if (type === 'ia') openPromptEdit(i)
                    }}
                  />

                  {/* Actions */}
                  <div className="flex gap-1" style={{ width: DISP_W }}>
                    {(slideBgTypes[i] === 'photo' || slideBgTypes[i] === 'photo-text') && (
                      <label className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 text-center cursor-pointer hover:border-violet-400 transition-all">
                        <Image size={12} className="inline mr-1" />Upload Foto
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(i, e)} />
                      </label>
                    )}
                    {slideBgTypes[i] === 'ia' && (
                      <>
                        <button onClick={() => genImage(i, undefined, true)} disabled={generatingImg.has(i)} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-amber-300 dark:border-amber-700 text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-40" title="Foto com seu rosto">
                          <Wand2 size={10} className="inline mr-0.5" />Foto Expert
                        </button>
                        <button onClick={() => genImage(i, undefined, false)} disabled={generatingImg.has(i)} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-amber-300 dark:border-amber-700 text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-40" title="Fundo abstrato sem rosto">
                          <Wand2 size={10} className="inline mr-0.5" />Fundo IA
                        </button>
                        <button onClick={() => openPromptEdit(i)} disabled={generatingImg.has(i)} className="py-1.5 px-2 rounded-lg text-[10px] font-semibold border border-gray-300 dark:border-gray-700 text-gray-500 hover:border-violet-400 transition-all disabled:opacity-40" title="Editar prompt">
                          ✎
                        </button>
                      </>
                    )}
                  </div>

                  {/* Template selector per slide — only in livre mode */}
                  {!activePack && showTemplates && (
                    <div className="flex flex-wrap gap-1" style={{ width: DISP_W }}>
                      {TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSlideTemplates(prev => ({ ...prev, [i]: t.id }))}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all',
                            slideTemplates[i] === t.id
                              ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-600'
                              : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1" style={{ width: DISP_W }}>
                    <button onClick={() => startEdit(i)} className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all">✎ Editar</button>
                    <button onClick={() => dlSlide(i)} disabled={downloadingSlide === i} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-700 transition-all disabled:opacity-40">
                      {downloadingSlide === i ? '⏳' : <Download size={13} />}
                    </button>
                  </div>

                  {/* Text position — only in livre mode */}
                  {!activePack && <div className="flex gap-1" style={{ width: DISP_W }}>
                    {(['top', 'middle', 'bottom'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => setTextPosition(i, pos)}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          (slide.style?.textPosition || 'middle') === pos
                            ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'
                        )}
                      >
                        {pos === 'top' ? '↑ Topo' : pos === 'middle' ? '● Centro' : '↓ Base'}
                      </button>
                    ))}
                  </div>}

                  {/* Inline edit overlay */}
                  {editingIdx === i && (
                    <div
                      className="absolute inset-0 rounded-xl bg-black/60 backdrop-blur-sm flex flex-col justify-center p-4 z-10"
                      style={{ width: DISP_W, height: DISP_H }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editHeadline}
                        onChange={e => setEditHeadline(e.target.value)}
                        className="w-full px-3 py-2 bg-white/95 dark:bg-gray-800/95 border-2 border-violet-400 rounded-lg text-sm font-bold text-gray-900 dark:text-white focus:outline-none mb-2"
                        placeholder="Titulo"
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).nextElementSibling?.querySelector('textarea')?.focus() }}
                      />
                      <textarea
                        value={editSubtitle}
                        onChange={e => setEditSubtitle(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 bg-white/95 dark:bg-gray-800/95 border-2 border-violet-400 rounded-lg text-xs text-gray-900 dark:text-white resize-none focus:outline-none leading-relaxed"
                        placeholder="Texto do slide"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={saveEdit} className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors">Salvar</button>
                        <button onClick={() => setEditingIdx(null)} className="px-4 py-2 bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* Prompt edit panel */}
                  {promptEditIdx === i && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-violet-300 dark:border-violet-700 space-y-2" style={{ width: DISP_W }}>
                      <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Prompt da imagem</p>
                      <textarea
                        value={editPrompt}
                        onChange={e => { setEditPrompt(e.target.value); editPromptRef.current = e.target.value }}
                        rows={4}
                        className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white resize-none focus:outline-none focus:border-violet-400 leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => genImage(i, editPromptRef.current)} disabled={generatingImg.has(i)} className="flex-1 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                          <Wand2 size={11} /> Gerar
                        </button>
                        <button onClick={() => setPromptEditIdx(null)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-500 rounded-lg text-xs">✕</button>
                      </div>
                    </div>
                  )}

                  {slide.imageError && (
                    <p className="text-xs text-red-500 text-center" style={{ width: DISP_W }}>{slide.imageError}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ESTRATÉGIA TAB */}
        {tab === 'estrategia' && (
          strategy && (strategy.persona || strategy.painPoint || strategy.desire || strategy.hook) ? (
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              {[
                { label: '👤 Persona', key: 'persona' },
                { label: '💢 Dor Central', key: 'painPoint' },
                { label: '✨ Desejo Profundo', key: 'desire' },
                { label: '📖 Trilha Narrativa', key: 'narrativePath' },
                { label: '🧠 Nível de Consciência', key: 'consciousnessLevel' },
                { label: '🎯 Gancho', key: 'hook' },
              ].map(item => (
                <div key={item.key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">{item.label}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {(strategy as unknown as Record<string, string>)[item.key] || '—'}
                  </p>
                </div>
              ))}
              {seoKeywords && seoKeywords.length > 0 && (
                <div className="sm:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3">🔍 Palavras-chave SEO</p>
                  <div className="flex flex-wrap gap-2">
                    {seoKeywords.map(kw => (
                      <span key={kw} className="px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-6 max-w-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Nenhuma estrategia disponivel</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs">Gere um carrossel do zero (modo "Criar") para ter a estrategia completa. O modo Luminae importa apenas os slides.</p>
              </div>
            </div>
          )
        )}

        {/* LEGENDA TAB */}
        {tab === 'legenda' && (
          <div className="px-6 py-6 max-w-2xl">
            <CaptionEditor
              caption={caption || { hook: '', body: '', cta: '', hashtags: '', altText: '' }}
              onChange={(updated: Caption) => {
                if (currentProject && currentCarousel) {
                  const newCarousel = { ...currentCarousel, caption: updated }
                  setCurrentCarousel(newCarousel)
                  updateProjectCarousel(currentProject.id, newCarousel)
                  refreshProjects()
                }
              }}
              projectName={currentProject?.name || 'carrossel'}
              niche={currentCarousel?.strategy?.niche || ''}
              theme={currentProject?.theme || ''}
            />
          </div>
        )}

        {/* MANYCHAT TAB */}
        {tab === 'manychat' && manychat && (
          <div className="px-6 py-6 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">Script ManyChat</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Automação de DM para Instagram</p>
                </div>
                <button onClick={() => exportManyChatAsTxt(manychat, currentProject?.name || 'carrossel')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 transition-all">
                  <Download size={12} /> .txt
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Keyword</span>
                  <span className="font-black text-violet-700 dark:text-violet-300 text-lg">{manychat.keyword}</span>
                </div>
                {[
                  { label: '1 — Boas-vindas', content: manychat.flow1 },
                  { label: '2 — Entrega', content: formatFlow(manychat.flow2) },
                  { label: '3 — Follow-up', content: formatFlow(manychat.flow3) },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Flow {item.label}</p>
                      <button onClick={() => copy(String(item.content), item.label)} className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                        {copied === item.label ? <Check size={10} /> : <Copy size={10} />}
                        Copiar
                      </button>
                    </div>
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 leading-relaxed">{item.content}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
