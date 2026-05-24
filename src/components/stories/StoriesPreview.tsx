import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Download, FileArchive, Wand2, Palette, Type, Image, Pencil, Instagram } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import type { ColorPalette, StorySlide, Caption } from '../../types'
import { exportSlideAsImage, exportAllSlidesAsZip } from '../../services/exportService'
import { generateSlideImage } from '../../services/geminiService'
import { getDefaultProfile, updateProjectStories } from '../../services/storageService'
import { uploadImages, publishStories } from '../../services/apiService'
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
  const { currentProject, setView, apiKey, expertPhotoBase64, refreshProjects, instagram } = useApp()
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
  const [editingSlide, setEditingSlide] = useState<number | null>(null)
  const [publishingStories, setPublishingStories] = useState(false)
  const [publishProgress, setPublishProgress] = useState('')
  const [template, setTemplate] = useState<'padrao' | 'elegante'>('padrao')

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
      const niche = profile?.niche || 'geral'
      const slideTopic = [slide.headline, slide.body].filter(Boolean).join(' — ')
      const aiHint = slide.visualPrompt && slide.visualPrompt.length > 20 ? slide.visualPrompt : ''
      let prompt: string
      if (useExpertPhoto) {
        prompt = `Cenário/ambiente COERENTE com o tema do story onde a pessoa da foto aparecerá. Formato vertical 9:16.
TEMA DO STORY (cenário precisa representar isto):
"${slideTopic}"

${aiHint ? `Sugestão visual:\n${aiHint}\n\n` : ''}Fotografia editorial cinematográfica, nicho: ${niche}. Iluminação emocional coerente com o tema. Sem texto.`
      } else {
        prompt = `Imagem fotográfica vertical (9:16) COERENTE com o tema do story.
TEMA DO STORY (a imagem precisa representar visualmente isto, NÃO algo abstrato genérico):
"${slideTopic}"

${aiHint ? `Sugestão visual do criador:\n${aiHint}\n\n` : ''}REGRAS:
- Pode ter pessoas, cenários, objetos, atmosferas — desde que façam SENTIDO com o tema.
- Foto editorial/cinematográfica, iluminação emocional, alta qualidade.
- Se o tema é conceitual, use metáfora visual concreta (não gradiente vazio).
- SEM texto na imagem, SEM logos, SEM marcas d'água.
- Nicho: ${niche}.`
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
    setDlAllLoading(true)
    const toastId = toast.loading('Exportando ZIP...')
    try {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const els = slideRefs.current.filter(Boolean) as HTMLElement[]
      if (!els.length) throw new Error('Nenhum story renderizado.')
      await exportAllSlidesAsZip(els, currentProject?.name || 'stories')
      toast.success('ZIP baixado!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally { setDlAllLoading(false) }
  }

  const handlePublishStories = async () => {
    if (!instagram) {
      toast.error('Conecte seu Instagram em Configuracoes primeiro')
      return
    }
    const els = slideRefs.current.filter(Boolean) as HTMLElement[]
    if (!els.length) return

    setPublishingStories(true)
    const toastId = toast.loading('Publicando stories...')
    try {
      // 1. Capture all slides
      const html2canvas = (await import('html2canvas')).default
      const blobs: Blob[] = []
      for (let i = 0; i < els.length; i++) {
        setPublishProgress(`Capturando story ${i + 1}/${els.length}...`)
        const canvas = await html2canvas(els[i], { scale: 5, useCORS: true, backgroundColor: null })
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Erro canvas')), 'image/png')
        })
        blobs.push(blob)
      }

      // 2. Upload all
      setPublishProgress('Enviando imagens...')
      const files = blobs.map((b, i) => new File([b], `story-${i + 1}.png`, { type: 'image/png' }))
      const { urls } = await uploadImages(files)

      // 3. Publish as stories
      setPublishProgress('Publicando no Instagram...')
      const result = await publishStories(urls)

      toast.success(`${result.published} stories publicados!`, { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao publicar stories', { id: toastId })
    } finally {
      setPublishingStories(false)
      setPublishProgress('')
    }
  }

  const bgColor = palette.p.background || palette.p.secondary
  const txtColor = palette.p.text || palette.p.accent

  // ── ELEGANTE card render (foto full bg + texto overlay + serif Playfair + vinho/gold) ──
  const renderEleganteCard = (slide: StorySlide, i: number) => {
    const photo = slide.imageUrl || expertPhotoBase64 || undefined
    const hasPhoto = !!photo
    const textOnLeft = i % 2 === 0

    // Headline split — última frase vira highlight box
    const headline = slide.headline || ''
    const splitMatch = headline.match(/^(.*?[.!?…]+\s+)(.+)$/)
    const headMain = splitMatch ? splitMatch[1].trim() : headline
    const headHighlight = splitMatch ? splitMatch[2].trim() : ''

    const slideBg = hasPhoto
      ? `${textOnLeft
          ? 'linear-gradient(to right, rgba(20,12,8,0.55) 0%, rgba(20,12,8,0.30) 32%, rgba(20,12,8,0.08) 55%, rgba(20,12,8,0) 70%)'
          : 'linear-gradient(to left, rgba(20,12,8,0.55) 0%, rgba(20,12,8,0.30) 32%, rgba(20,12,8,0.08) 55%, rgba(20,12,8,0) 70%)'
        }, url(${photo}) center/cover no-repeat`
      : `radial-gradient(ellipse at ${textOnLeft ? 'left' : 'right'} center, #2b1810 0%, #1a0e08 75%, #0a0503 100%)`

    const padX = 16
    const padY = 55  // respeita safe zone top/bottom do Instagram
    const titleSz = 18 * fontScale
    const subSz = 10.5 * fontScale
    const goldColor = '#d4a574'
    const mauveAccent = '#9c5a6f'      // mauve/rosé pra highlight box
    const peachAccent = '#e8b886'      // pêssego ainda usado em question/poll
    const orangeWarm = '#d4a574'       // laranja warm pra última frase

    // Split body — última frase pode virar destaque laranja warm
    const body = slide.body || ''
    const bodyParas = body.split(/\n\s*\n/)
    const lastPara = bodyParas[bodyParas.length - 1] || ''
    const lastSentenceMatch = lastPara.match(/^(.*?)([^.!?…]+[.!?…]?)\s*$/s)
    const bodyMain = bodyParas.slice(0, -1).join('\n\n') + (bodyParas.length > 1 ? '\n\n' : '') + (lastSentenceMatch ? lastSentenceMatch[1].trim() : '')
    const bodyHighlight = lastSentenceMatch && body.length > 60 ? lastSentenceMatch[2].trim() : ''

    return (
      <div
        ref={el => { slideRefs.current[i] = el }}
        style={{
          width: DISP_W, height: DISP_H,
          background: slideBg,
          position: 'relative', overflow: 'hidden',
          borderRadius: 16,
          fontFamily: '"Lora", serif',
        }}
        className="shadow-lg"
      >
        {/* Safe zone top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, background: 'rgba(0,0,0,0.1)' }} />

        {/* Container do texto CENTRALIZADO */}
        <div style={{
          position: 'absolute',
          top: padY, bottom: padY,
          [textOnLeft ? 'left' : 'right']: padX,
          width: DISP_W * 0.55,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', textAlign: 'center',
        }}>
          {/* Heart ornament topo */}
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 10px' }}>
            <path d="M12 20.5 C 6 16, 3 13, 3 9 C 3 6, 5 4, 8 4 C 10 4, 11.5 5.5, 12 7 C 12.5 5.5, 14 4, 16 4 C 19 4, 21 6, 21 9 C 21 13, 18 16, 12 20.5 Z"
              stroke={goldColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: hasPhoto ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' : undefined }} />
          </svg>

          <h2 style={{
            fontSize: titleSz, fontWeight: 400, color: '#fdf4e8',
            lineHeight: 1.18, margin: 0,
            fontFamily: '"Playfair Display", serif',
            textShadow: hasPhoto ? '0 2px 10px rgba(0,0,0,0.6)' : undefined,
          }}>
            {headMain}
            {headHighlight && (
              <>
                <br />
                <span style={{
                  background: mauveAccent,
                  color: '#ffffff',
                  padding: '2px 10px',
                  display: 'inline-block',
                  marginTop: 5,
                  fontStyle: 'italic',
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 500,
                  boxShadow: '0 2px 7px rgba(0,0,0,0.4)',
                }}>
                  {headHighlight}
                </span>
              </>
            )}
          </h2>

          {/* Linha gold curta tapered */}
          <div style={{
            width: 50, height: 1.5,
            background: `linear-gradient(to right, transparent, ${goldColor} 30%, ${goldColor} 70%, transparent)`,
            marginTop: 10, marginBottom: 10, alignSelf: 'center',
          }} />

          {/* Body com destaque na última frase */}
          {slide.body && (
            <p style={{
              fontSize: subSz, color: '#fdf4e8', lineHeight: 1.7,
              margin: 0, fontFamily: '"Lora", serif',
              whiteSpace: 'pre-line',
              textShadow: hasPhoto ? '0 1px 8px rgba(0,0,0,0.6)' : undefined,
            }}>
              {bodyMain}
              {bodyHighlight && (
                <>
                  {bodyMain.endsWith('\n') ? '' : '\n'}
                  <span style={{ color: orangeWarm, fontWeight: 600 }}>
                    {bodyHighlight}
                  </span>
                </>
              )}
            </p>
          )}

          {/* Question box (estilo Elegante: peach com texto vinho) */}
          {slide.type === 'question' && slide.questionText && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: peachAccent, borderRadius: 4,
              boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
              textAlign: 'left',
            }}>
              <p style={{ fontSize: 8, color: `${'#7b1d3a'}aa`, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: '"Playfair Display", serif' }}>
                Sua pergunta
              </p>
              <p style={{ fontSize: 11, color: '#7b1d3a', margin: 0, fontWeight: 600, fontStyle: 'italic', fontFamily: '"Playfair Display", serif' }}>
                {slide.questionText}
              </p>
            </div>
          )}

          {/* Poll */}
          {slide.type === 'poll' && slide.pollOptions && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 10, color: '#fdf4e8', margin: '0 0 6px', fontWeight: 500, fontStyle: 'italic', fontFamily: '"Playfair Display", serif' }}>
                {slide.pollQuestion}
              </p>
              {slide.pollOptions.map((opt, oi) => (
                <div key={oi} style={{
                  marginBottom: 4, padding: '6px 10px',
                  background: peachAccent, borderRadius: 3,
                }}>
                  <span style={{ fontSize: 10, color: '#7b1d3a', fontWeight: 500, fontFamily: '"Lora", serif' }}>{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watermark — canto oposto ao texto */}
        <span style={{
          position: 'absolute', bottom: 22,
          [textOnLeft ? 'right' : 'left']: padX,
          fontSize: 7.5, color: 'rgba(212,165,116,0.7)',
          letterSpacing: '0.25em', textTransform: 'uppercase',
          fontFamily: '"Playfair Display", serif',
          textShadow: hasPhoto ? '0 1px 4px rgba(0,0,0,0.5)' : undefined,
        }}>
          @kelly.tondo
        </span>

        {/* Safe zone bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, background: 'rgba(0,0,0,0.1)' }} />

        {generatingImg.has(i) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70" style={{ borderRadius: 16 }}>
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    )
  }

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
        <div className="flex items-center gap-2">
          {publishingStories && (
            <span className="text-[10px] text-gray-400 mr-1">{publishProgress}</span>
          )}
          <button onClick={handlePublishStories} disabled={publishingStories || !instagram} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all" title={!instagram ? 'Conecte seu Instagram em Configuracoes' : 'Publicar stories no Instagram'}>
            <Instagram size={15} /> {publishingStories ? 'Publicando...' : 'Publicar Stories'}
          </button>
          <button onClick={handleDlAll} disabled={dlAllLoading} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            <FileArchive size={15} /> Download ZIP
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">Estilo</p>
            <div className="flex gap-1">
              <button onClick={() => setTemplate('padrao')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', template === 'padrao' ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>Padrão</button>
              <button onClick={() => setTemplate('elegante')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', template === 'elegante' ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>Elegante</button>
            </div>
          </div>
          {template === 'padrao' && (
            <>
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
            </>
          )}
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
      <div className="flex-1 min-h-0 scroll-area px-6 py-6">
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
                {template === 'elegante' ? renderEleganteCard(slide, i) : (
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
                )}

                {/* Type badge + edit toggle (outside card - not exported) */}
                <div className="flex items-center justify-between" style={{ width: DISP_W }}>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    {slide.type === 'question' ? 'Caixinha' : slide.type === 'poll' ? 'Enquete' : `Story ${i + 1}`}
                  </span>
                  <button
                    onClick={() => setEditingSlide(editingSlide === i ? null : i)}
                    className={`p-1 rounded-md text-[9px] font-semibold transition-all ${editingSlide === i ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' : 'text-gray-400 hover:text-violet-500'}`}
                    title="Editar texto"
                  >
                    <Pencil size={10} />
                  </button>
                </div>

                {/* Inline text editing */}
                {editingSlide === i && (
                  <div className="space-y-1.5" style={{ width: DISP_W }}>
                    <input
                      type="text"
                      value={slide.headline}
                      onChange={e => { const next = [...slides]; next[i] = { ...next[i], headline: e.target.value }; saveSlides(next) }}
                      placeholder="Texto principal..."
                      className="w-full px-2 py-1.5 text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-violet-400"
                    />
                    <textarea
                      value={slide.body}
                      onChange={e => { const next = [...slides]; next[i] = { ...next[i], body: e.target.value }; saveSlides(next) }}
                      placeholder="Texto secundário (opcional)..."
                      rows={2}
                      className="w-full px-2 py-1.5 text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-violet-400 resize-none"
                    />
                  </div>
                )}

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
