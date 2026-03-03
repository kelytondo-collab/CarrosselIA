import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Download, FileArchive, Image, Palette, Type, Wand2, Copy, Check } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import SlideCard from './SlideCard'
import type { ColorPalette, SlideData } from '../../types'
import { exportSlideAsImage, exportAllSlidesAsZip, exportCaptionAsTxt, exportManyChatAsTxt } from '../../services/exportService'
import { generateSlideImage } from '../../services/geminiService'
import { updateProjectCarousel } from '../../services/storageService'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

type Tab = 'slides' | 'estrategia' | 'legenda' | 'manychat'

const PALETTES: { id: string; label: string; p: ColorPalette }[] = [
  { id: 'violet', label: 'Violeta', p: { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc' } },
  { id: 'gold', label: 'Ouro', p: { primary: '#d97706', secondary: '#050505', accent: '#fafafa' } },
  { id: 'rose', label: 'Rosa', p: { primary: '#ec4899', secondary: '#1f001a', accent: '#fff' } },
  { id: 'cyan', label: 'Ciano', p: { primary: '#06b6d4', secondary: '#0c1a2e', accent: '#f0f9ff' } },
  { id: 'emerald', label: 'Verde', p: { primary: '#10b981', secondary: '#052e16', accent: '#f0fdf4' } },
  { id: 'white', label: 'Branco', p: { primary: '#1e293b', secondary: '#f8fafc', accent: '#1e293b' } },
]

const FONTS = [
  { id: 'inter', label: 'Inter', title: 'Inter, sans-serif', sub: 'Inter, sans-serif' },
  { id: 'georgia', label: 'Clássica', title: 'Georgia, serif', sub: 'Georgia, serif' },
  { id: 'helvetica', label: 'Bold', title: '"Helvetica Neue", Arial, sans-serif', sub: 'Arial, sans-serif' },
]

// Display sizes (4:5 ratio)
const DISP_W = 300
const DISP_H = 375

export default function CarouselPreview() {
  const { setView, currentProject, currentCarousel, setCurrentCarousel, refreshProjects, apiKey } = useApp()
  const [tab, setTab] = useState<Tab>('slides')
  const [palette, setPalette] = useState(PALETTES[0])
  const [font, setFont] = useState(FONTS[0])
  const [brand, setBrand] = useState('')
  const [slides, setSlides] = useState<SlideData[]>(currentCarousel?.slides || [])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editHeadline, setEditHeadline] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [generatingImg, setGeneratingImg] = useState<Set<number>>(new Set())
  const [promptEditIdx, setPromptEditIdx] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [genAllProgress, setGenAllProgress] = useState<{ current: number; total: number } | null>(null)
  const [downloadingSlide, setDownloadingSlide] = useState<number | null>(null)
  const [dlAllLoading, setDlAllLoading] = useState(false)
  const [copied, setCopied] = useState('')
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

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
          currentProject?.inputs_json?.expertPhotoBase64
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
    setEditPrompt(slides[idx].visualPrompt)
    setPromptEditIdx(idx)
  }

  const genImage = async (idx: number, prompt?: string) => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configurações'); return }
    const finalPrompt = prompt ?? slides[idx].visualPrompt
    // Save edited prompt to slide
    if (prompt && prompt !== slides[idx].visualPrompt) {
      const next = [...slides]
      next[idx] = { ...next[idx], visualPrompt: prompt }
      setSlides(next)
    }
    setPromptEditIdx(null)
    setGeneratingImg(prev => new Set([...prev, idx]))
    const toastId = toast.loading(`Gerando imagem do slide ${idx + 1}...`)
    try {
      const url = await generateSlideImage(finalPrompt, currentCarousel.format || '4:5', currentProject?.inputs_json?.expertPhotoBase64)
      const next = [...slides]
      next[idx] = { ...next[idx], imageUrl: url, imageError: undefined, visualPrompt: finalPrompt }
      saveSlides(next)
      toast.success('Imagem gerada!', { id: toastId })
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

  const fullCaption = `${caption.hook}\n\n${caption.body}\n\n${caption.cta}\n\n${caption.hashtags}`

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
              {/* Palette */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette size={11} /> Cor</p>
                <div className="flex gap-2">
                  {PALETTES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPalette(p)}
                      title={p.label}
                      style={{ background: p.p.primary }}
                      className={cn('w-6 h-6 rounded-full transition-all', palette.id === p.id ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-105')}
                    />
                  ))}
                </div>
              </div>

              {/* Font */}
              <div>
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
              </div>

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
            </div>

            {/* Slides grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((slide, i) => (
                <div key={slide.id} className="flex flex-col gap-2">
                  {/* Card */}
                  <div style={{ width: DISP_W, borderRadius: 12, overflow: 'hidden', position: 'relative' }} className="shadow-md">
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
                    />
                    {generatingImg.has(i) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 rounded-xl">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <p className="text-white text-xs font-medium">Gerando imagem...</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1" style={{ width: DISP_W }}>
                    <button onClick={() => removeImage(i)} title="Cor" className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all', !slide.imageUrl ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>🎨</button>
                    <label className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border text-center cursor-pointer transition-all', slide.imageUrl ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                      <Image size={12} className="inline mr-1" />Foto
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(i, e)} />
                    </label>
                    <button onClick={() => openPromptEdit(i)} disabled={generatingImg.has(i)} title="Gerar com IA" className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all disabled:opacity-40">
                      <Wand2 size={12} className="inline mr-1" />IA
                    </button>
                  </div>

                  <div className="flex gap-1" style={{ width: DISP_W }}>
                    <button onClick={() => startEdit(i)} className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all">✎ Editar</button>
                    <button onClick={() => dlSlide(i)} disabled={downloadingSlide === i} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-700 transition-all disabled:opacity-40">
                      {downloadingSlide === i ? '⏳' : <Download size={13} />}
                    </button>
                  </div>

                  <div className="flex gap-1" style={{ width: DISP_W }}>
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
                  </div>

                  {/* Edit panel */}
                  {editingIdx === i && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-violet-300 dark:border-violet-700 space-y-2" style={{ width: DISP_W }}>
                      <input value={editHeadline} onChange={e => setEditHeadline(e.target.value)} className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" placeholder="Título" />
                      <textarea value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} rows={3} className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white resize-none focus:outline-none focus:border-violet-400" placeholder="Subtítulo" />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex-1 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold">✓ Salvar</button>
                        <button onClick={() => setEditingIdx(null)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-500 rounded-lg text-xs">✕</button>
                      </div>
                    </div>
                  )}

                  {/* Prompt edit panel */}
                  {promptEditIdx === i && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-violet-300 dark:border-violet-700 space-y-2" style={{ width: DISP_W }}>
                      <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Prompt da imagem</p>
                      <textarea
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        rows={4}
                        className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white resize-none focus:outline-none focus:border-violet-400 leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => genImage(i, editPrompt)} disabled={generatingImg.has(i)} className="flex-1 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
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
        {tab === 'estrategia' && strategy && (
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
        )}

        {/* LEGENDA TAB */}
        {tab === 'legenda' && caption && (
          <div className="px-6 py-6 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-800 dark:text-white">Legenda Completa</h3>
                <div className="flex gap-2">
                  <button onClick={() => copy(fullCaption, 'legenda')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-all">
                    {copied === 'legenda' ? <Check size={12} /> : <Copy size={12} />}
                    {copied === 'legenda' ? 'Copiado!' : 'Copiar tudo'}
                  </button>
                  <button onClick={() => exportCaptionAsTxt(caption, currentProject?.name || 'carrossel')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 transition-all">
                    <Download size={12} /> .txt
                  </button>
                </div>
              </div>
              <div className="space-y-5">
                {[
                  { label: 'Hook (1ª linha)', value: caption.hook, key: 'hook' },
                  { label: 'Corpo', value: caption.body, key: 'body' },
                  { label: 'CTA', value: caption.cta, key: 'cta' },
                ].map(item => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <button onClick={() => copy(item.value, item.key)} className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                        {copied === item.key ? <Check size={10} /> : <Copy size={10} />}
                        {copied === item.key ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <pre className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">{item.value}</pre>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Hashtags</p>
                  <p className="text-sm text-violet-600 dark:text-violet-400 leading-relaxed bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">{caption.hashtags}</p>
                </div>
              </div>
            </div>
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
