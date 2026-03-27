import { useState } from 'react'
import { Wand2, Download, Play, Loader2 } from 'lucide-react'
import { renderQuoteVideo } from '../../services/videoRenderer'
import type { QuoteVideoConfig } from '../../services/videoRenderer'
import { GRADIENT_PRESETS } from '../shared/GradientPicker'
import { getDefaultProfile } from '../../services/storageService'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

type AnimType = 'word-by-word' | 'line-by-line' | 'fade-in'
type VideoFormat = 'reel' | 'feed'

export default function QuoteVideoEditor() {
  const profile = getDefaultProfile()

  const [text, setText] = useState('')
  const [brand, setBrand] = useState(profile?.name || '')
  const [animType, setAnimType] = useState<AnimType>('word-by-word')
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('reel')
  const [gradientId, setGradientId] = useState(GRADIENT_PRESETS[0].id)
  const [duration, setDuration] = useState(15)
  const [rendering, setRendering] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId) || GRADIENT_PRESETS[0]

  const handleRender = async () => {
    if (!text.trim()) { toast.error('Escreva o texto da citacao'); return }

    setRendering(true)
    const toastId = toast.loading('Renderizando video...')

    try {
      const config: QuoteVideoConfig = {
        width: videoFormat === 'reel' ? 1080 : 1080,
        height: videoFormat === 'reel' ? 1920 : 1350,
        fps: 30,
        durationMs: duration * 1000,
        text,
        fontFamily: 'Inter, sans-serif',
        fontSize: videoFormat === 'reel' ? 42 : 36,
        textColor: '#ffffff',
        background: gradient.css,
        animationType: animType,
        brand,
      }

      const blob = await renderQuoteVideo(config)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      toast.success('Video pronto!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renderizar', { id: toastId })
    } finally {
      setRendering(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `citacao-${Date.now()}.webm`
    a.click()
    toast.success('Video baixado!')
  }

  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Video Citacao</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Frase animada sobre gradiente — perfeito para Reels</p>
      </div>

      <div className="space-y-5">
        {/* Text */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Texto da Citacao *</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escreva ou cole a frase que vai aparecer no video..."
            rows={4}
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </div>

        {/* Format */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Formato</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {([
              { id: 'reel' as const, label: 'Reel (9:16)', desc: '1080x1920' },
              { id: 'feed' as const, label: 'Feed (4:5)', desc: '1080x1350' },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => setVideoFormat(f.id)}
                className={cn(
                  'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                  videoFormat === f.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <span className="text-xs font-bold">{f.label}</span>
                <span className="text-[10px] text-gray-400">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Animation */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Animacao</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {([
              { id: 'word-by-word' as const, label: 'Palavra a Palavra' },
              { id: 'line-by-line' as const, label: 'Linha a Linha' },
              { id: 'fade-in' as const, label: 'Fade In' },
            ]).map(a => (
              <button
                key={a.id}
                onClick={() => setAnimType(a.id)}
                className={cn(
                  'py-2 rounded-xl text-xs font-medium border transition-all',
                  animType === a.id
                    ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500'
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gradient */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Fundo (Gradiente)</label>
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

        {/* Duration + Brand */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Duracao (segundos)</label>
              <div className="flex gap-2 mt-1">
                {[10, 15, 20, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                      duration === d
                        ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Marca</label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="@sua_marca"
                className={inputCls}
              />
            </div>
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
                style={{
                  width: videoFormat === 'reel' ? 216 : 270,
                  height: videoFormat === 'reel' ? 384 : 337,
                  borderRadius: 12,
                }}
                className="shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRender}
            disabled={rendering || !text.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3"
          >
            {rendering ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            {rendering ? 'Renderizando...' : 'Gerar Video'}
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
