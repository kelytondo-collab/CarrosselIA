import { useState, useEffect } from 'react'
import { Play, Download, Loader2, ArrowLeft } from 'lucide-react'
import { renderCarouselReel } from '../../services/videoRenderer'
import type { CarouselReelConfig } from '../../services/videoRenderer'
import { GRADIENT_PRESETS } from '../shared/GradientPicker'
import { useApp } from '../../contexts/AppContext'
import { restoreCarouselImages } from '../../services/imageCache'
import type { SlideData } from '../../types'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

type TransitionType = 'fade' | 'slide-left' | 'slide-up'

export default function CarouselReelEditor() {
  const { currentCarousel, currentProject, setView } = useApp()

  const [transitionType, setTransitionType] = useState<TransitionType>('fade')
  const [secondsPerSlide, setSecondsPerSlide] = useState(3)
  const [gradientId, setGradientId] = useState(GRADIENT_PRESETS[0].id)
  const [rendering, setRendering] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [useSlideImages, setUseSlideImages] = useState(true)
  const [slides, setSlides] = useState<SlideData[]>(currentCarousel?.slides || [])
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [fontScale, setFontScale] = useState(1.0)

  const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId) || GRADIENT_PRESETS[0]
  const hasImages = slides.some(s => s.imageUrl)

  // Restore images from IndexedDB on mount
  useEffect(() => {
    if (currentProject?.id && currentCarousel?.slides.length) {
      restoreCarouselImages(currentProject.id, currentCarousel.slides).then(restored => {
        setSlides(restored as SlideData[])
        setImagesLoaded(true)
      })
    } else {
      setImagesLoaded(true)
    }
  }, [currentProject?.id, currentCarousel?.slides])

  if (!currentCarousel || !currentCarousel.slides.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Crie um carrossel primeiro para converter em Reel</p>
          <button onClick={() => setView('editor')} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">
            Criar carrossel
          </button>
        </div>
      </div>
    )
  }

  const handleRender = async () => {
    setRendering(true)
    const toastId = toast.loading('Renderizando Reel...')

    try {
      const config: CarouselReelConfig = {
        width: 1080,
        height: 1920,
        fps: 30,
        durationMs: slides.length * secondsPerSlide * 1000,
        slides: slides.map(s => ({
          headline: s.headline,
          subtitle: s.subtitle,
          background: gradient.css,
          backgroundImage: useSlideImages && s.imageUrl ? s.imageUrl : undefined,
        })),
        fontFamily: 'Inter, sans-serif',
        textColor: '#ffffff',
        transitionType,
        secondsPerSlide,
        fontScale,
      }

      const blob = await renderCarouselReel(config)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      toast.success('Reel pronto!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally {
      setRendering(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `reel-${currentProject?.name || 'carrossel'}-${Date.now()}.webm`
    a.click()
    toast.success('Reel baixado!')
  }

  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'
  const totalDuration = slides.length * secondsPerSlide

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('preview')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Carrossel → Reel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {slides.length} slides · {totalDuration}s total · 1080x1920
            {hasImages && useSlideImages ? ' · com imagens' : ' · gradiente'}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Slides preview */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Slides do carrossel {!imagesLoaded && '(carregando imagens...)'}</label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {slides.map((s, i) => (
              <div key={i} className="flex gap-2 items-start p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt="" className="w-10 h-12 rounded object-cover shrink-0 border border-green-400 dark:border-green-600" />
                ) : (
                  <div className="w-10 h-12 rounded shrink-0 border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{s.headline}</p>
                  <p className="text-[10px] text-gray-500 truncate">{s.subtitle}</p>
                </div>
                {s.imageUrl && (
                  <span className="text-[9px] text-green-600 dark:text-green-400 font-medium shrink-0">IMG</span>
                )}
              </div>
            ))}
          </div>
          {hasImages && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setUseSlideImages(!useSlideImages)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-all',
                  useSlideImages ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow',
                  useSlideImages ? 'left-5' : 'left-0.5'
                )} />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {useSlideImages ? 'Usando imagens dos slides como fundo' : 'Usando gradiente (sem imagens)'}
              </span>
            </div>
          )}
          {!hasImages && imagesLoaded && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Nenhum slide tem imagem. Gere imagens no carrossel primeiro, ou use gradiente.
            </p>
          )}
        </div>

        {/* Transition */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Transicao</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {([
              { id: 'fade' as const, label: 'Fade' },
              { id: 'slide-left' as const, label: 'Deslizar' },
              { id: 'slide-up' as const, label: 'Subir' },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => setTransitionType(t.id)}
                className={cn(
                  'py-2 rounded-xl text-xs font-medium border transition-all',
                  transitionType === t.id
                    ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Tamanho da Fonte</label>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400 font-mono w-6">A</span>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.1"
              value={fontScale}
              onChange={e => setFontScale(parseFloat(e.target.value))}
              className="flex-1 h-2 accent-violet-600"
            />
            <span className="text-lg text-gray-400 font-mono w-6">A</span>
            <span className="text-xs text-gray-500 font-mono w-12 text-right">{Math.round(fontScale * 100)}%</span>
          </div>
        </div>

        {/* Timing */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Segundos por slide</label>
          <div className="flex gap-2 mt-1">
            {[2, 3, 4, 5, 7, 10].map(s => (
              <button
                key={s}
                onClick={() => setSecondsPerSlide(s)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                  secondsPerSlide === s
                    ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500'
                )}
              >
                {s}s
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Total: {totalDuration}s</p>
        </div>

        {/* Gradient — only show when not using images or as fallback */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Gradiente {hasImages && useSlideImages ? '(para slides sem imagem)' : ''}</label>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {GRADIENT_PRESETS.map(g => (
              <button
                key={g.id}
                onClick={() => setGradientId(g.id)}
                title={g.label}
                style={{ background: g.css }}
                className={cn(
                  'w-8 h-8 rounded-lg transition-all border',
                  gradientId === g.id ? 'ring-2 ring-offset-1 ring-violet-500 scale-110 border-violet-400' : 'border-gray-300 dark:border-gray-600'
                )}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Preview</label>
            <div className="flex justify-center">
              <video
                src={previewUrl}
                controls
                autoPlay
                loop
                muted
                style={{ width: 216, height: 384, borderRadius: 12 }}
                className="shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRender}
            disabled={rendering}
            className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3"
          >
            {rendering ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            {rendering ? 'Renderizando...' : 'Gerar Reel'}
          </button>

          {previewUrl && (
            <button
              onClick={handleDownload}
              className="py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Baixar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
