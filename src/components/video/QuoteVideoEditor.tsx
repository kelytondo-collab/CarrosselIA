import { useState, useRef } from 'react'
import { Download, Play, Loader2, Upload, X, Sparkles, ArrowLeft } from 'lucide-react'
import { renderQuoteVideo } from '../../services/videoRenderer'
import type { QuoteVideoConfig } from '../../services/videoRenderer'
import { GRADIENT_PRESETS } from '../shared/GradientPicker'
import { getDefaultProfile } from '../../services/storageService'
import { generateSlideImage } from '../../services/geminiService'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

type AnimType = 'word-by-word' | 'line-by-line' | 'fade-in'
type VideoFormat = 'reel' | 'feed'
type BgMode = 'gradient' | 'ia' | 'video'

export default function QuoteVideoEditor() {
  const { setView } = useApp()
  const profile = getDefaultProfile()

  const [text, setText] = useState('')
  const [brand, setBrand] = useState(profile?.name || '')
  const [animType, setAnimType] = useState<AnimType>('word-by-word')
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('reel')
  const [gradientId, setGradientId] = useState(GRADIENT_PRESETS[0].id)
  const [duration, setDuration] = useState(15)
  const [rendering, setRendering] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fontScale, setFontScale] = useState(1.0)

  // Background modes
  const [bgMode, setBgMode] = useState<BgMode>('gradient')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiImage, setAiImage] = useState<string | null>(null)
  const [generatingBg, setGeneratingBg] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null)

  const videoInputRef = useRef<HTMLInputElement>(null)

  const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId) || GRADIENT_PRESETS[0]

  const handleGenerateAiBg = async () => {
    const prompt = aiPrompt.trim() || text.trim()
    if (!prompt) { toast.error('Escreva o texto ou um prompt para o fundo'); return }

    setGeneratingBg(true)
    const toastId = toast.loading('Gerando fundo com IA...')

    try {
      const format = videoFormat === 'reel' ? '9:16' : '4:5'
      const bgPrompt = aiPrompt.trim()
        ? aiPrompt.trim()
        : `Fundo abstrato cinematografico e atmosferico para citacao sobre: "${text.slice(0, 100)}". Sem texto, sem letras, sem palavras. Apenas fundo visual com iluminacao dramatica, cores ricas e textura sofisticada.`

      const imageUrl = await generateSlideImage(bgPrompt, format)
      setAiImage(imageUrl)
      toast.success('Fundo gerado!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar fundo', { id: toastId })
    } finally {
      setGeneratingBg(false)
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Selecione um arquivo de video'); return }
    if (file.size > 100 * 1024 * 1024) { toast.error('Video muito grande (max 100MB)'); return }

    // Revoke previous blob URL
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)

    setVideoFile(file)
    setVideoBlobUrl(URL.createObjectURL(file))
  }

  const handleRemoveVideo = () => {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(null)
    setVideoBlobUrl(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleRender = async () => {
    if (!text.trim()) { toast.error('Escreva o texto da citacao'); return }

    if (bgMode === 'ia' && !aiImage) { toast.error('Gere o fundo com IA primeiro'); return }
    if (bgMode === 'video' && !videoBlobUrl) { toast.error('Importe um video de fundo'); return }

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
        fontSize: Math.round((videoFormat === 'reel' ? 42 : 36) * fontScale),
        textColor: '#ffffff',
        background: gradient.css,
        animationType: animType,
        brand,
      }

      // Add background based on mode
      if (bgMode === 'ia' && aiImage) {
        config.backgroundImage = aiImage
      } else if (bgMode === 'video' && videoBlobUrl) {
        config.backgroundVideoUrl = videoBlobUrl
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
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Citacao</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Frase animada sobre gradiente, imagem IA ou video — perfeito para Reels</p>
          </div>
        </div>
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

        {/* Font Size */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Tamanho da Fonte</label>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400 font-mono w-6">A</span>
            <input
              type="range"
              min="0.6"
              max="2.0"
              step="0.1"
              value={fontScale}
              onChange={e => setFontScale(parseFloat(e.target.value))}
              className="flex-1 h-2 accent-violet-600"
            />
            <span className="text-lg text-gray-400 font-mono w-6">A</span>
            <span className="text-xs text-gray-500 font-mono w-12 text-right">{Math.round(fontScale * 100)}%</span>
          </div>
        </div>

        {/* Background — 3 modes */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Fundo</label>

          {/* Mode tabs */}
          <div className="flex gap-1 mb-3">
            {([
              { id: 'gradient' as const, label: 'Gradiente', safe: true },
              { id: 'ia' as const, label: 'Imagem IA', safe: false },
              { id: 'video' as const, label: 'Importar Video', safe: true },
            ]).map(m => (
              <button
                key={m.id}
                onClick={() => setBgMode(m.id)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all',
                  bgMode === m.id
                    ? m.safe
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-300'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-700 dark:text-amber-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Gradient picker */}
          {bgMode === 'gradient' && (
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
          )}

          {/* AI image generator */}
          {bgMode === 'ia' && (
            <div className="space-y-3">
              <input
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Descreva o fundo (ex: floresta mistica com luz dourada) — ou deixe vazio para gerar automatico"
                className={inputCls}
              />
              <button
                onClick={handleGenerateAiBg}
                disabled={generatingBg}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {generatingBg ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generatingBg ? 'Gerando...' : 'Gerar Fundo com IA'}
              </button>
              {aiImage && (
                <div className="relative">
                  <img src={aiImage} alt="Fundo IA" className="w-full rounded-xl border border-amber-300 dark:border-amber-700" style={{ maxHeight: 200, objectFit: 'cover' }} />
                  <button onClick={() => setAiImage(null)} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"><X size={14} /></button>
                </div>
              )}
            </div>
          )}

          {/* Video import */}
          {bgMode === 'video' && (
            <div className="space-y-3">
              {videoBlobUrl ? (
                <div className="relative">
                  <video src={videoBlobUrl} className="w-full rounded-xl border border-green-300 dark:border-green-700" style={{ maxHeight: 200, objectFit: 'cover' }} muted autoPlay loop playsInline />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-[10px] text-white font-bold">{videoFile?.name}</div>
                  <button onClick={handleRemoveVideo} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"><X size={14} /></button>
                </div>
              ) : (
                <label className="w-full py-6 border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl text-green-500 hover:border-green-400 hover:text-green-600 transition-all flex flex-col items-center gap-2 cursor-pointer">
                  <Upload size={24} />
                  <span className="text-sm font-medium">Importar video de fundo</span>
                  <span className="text-[10px] text-gray-400">MP4, WebM, MOV (max 100MB)</span>
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                </label>
              )}
            </div>
          )}
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
