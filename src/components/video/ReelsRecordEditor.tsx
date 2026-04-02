import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, Upload, X, ArrowLeft, Video, Image, Sparkles } from 'lucide-react'
import { generateCoverImage, renderReelsWithOverlay } from '../../services/videoRenderer'
import type { CoverStyle, ReelsOverlayConfig } from '../../services/videoRenderer'
import { getDefaultProfile } from '../../services/storageService'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'
import BeautyRecorder from './BeautyRecorder'
import toast from 'react-hot-toast'

const COVER_STYLES: { id: CoverStyle; label: string; desc: string }[] = [
  { id: 'bold-hook', label: 'Bold Hook', desc: 'Texto grande centralizado' },
  { id: 'minimal', label: 'Minimal', desc: 'Texto embaixo' },
  { id: 'gradient', label: 'Gradiente', desc: 'Sem foto, cor de fundo' },
  { id: 'editorial', label: 'Editorial', desc: 'Linha lateral + texto' },
]

export default function ReelsRecordEditor() {
  const { setView } = useApp()
  const profile = getDefaultProfile()

  const [hookText, setHookText] = useState('')
  const [overlayText, setOverlayText] = useState('')
  const [handle, setHandle] = useState(profile?.name ? `@${profile.name.toLowerCase().replace(/\s+/g, '')}` : '')

  // Video state
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [showRecorder, setShowRecorder] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Cover state
  const [coverStyle, setCoverStyle] = useState<CoverStyle>('bold-hook')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [generatingCover, setGeneratingCover] = useState(false)

  // Render overlay state
  const [rendering, setRendering] = useState(false)
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null)

  // Auto-import from Luminae
  useEffect(() => {
    const raw = localStorage.getItem('luminae_reels_record_import')
    if (!raw) return
    localStorage.removeItem('luminae_reels_record_import')
    try {
      const data = JSON.parse(raw)
      if (data.hook) setHookText(String(data.hook))
      if (data.caption) setOverlayText(String(data.caption))
      toast.success('Hook importado do Luminae!')
    } catch { /* ignore */ }
  }, [])

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Selecione um arquivo de video'); return }
    if (file.size > 200 * 1024 * 1024) { toast.error('Video muito grande (max 200MB)'); return }
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(file)
    setVideoBlobUrl(URL.createObjectURL(file))
    // Reset downstream
    if (coverUrl) { URL.revokeObjectURL(coverUrl); setCoverUrl(null) }
    if (renderedUrl) { URL.revokeObjectURL(renderedUrl); setRenderedUrl(null) }
  }

  const handleRemoveVideo = () => {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(null)
    setVideoBlobUrl(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (coverUrl) { URL.revokeObjectURL(coverUrl); setCoverUrl(null) }
    if (renderedUrl) { URL.revokeObjectURL(renderedUrl); setRenderedUrl(null) }
  }

  const handleRecordingComplete = (_blob: Blob, blobUrl: string) => {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(null)
    setVideoBlobUrl(blobUrl)
    setShowRecorder(false)
    if (coverUrl) { URL.revokeObjectURL(coverUrl); setCoverUrl(null) }
    if (renderedUrl) { URL.revokeObjectURL(renderedUrl); setRenderedUrl(null) }
    toast.success('Video gravado com filtro de beleza!')
  }

  // Generate cover
  const handleGenerateCover = async () => {
    if (!videoBlobUrl) { toast.error('Grave ou importe um video primeiro'); return }
    if (!hookText.trim()) { toast.error('Escreva o hook para a capa'); return }
    setGeneratingCover(true)
    try {
      if (coverUrl) URL.revokeObjectURL(coverUrl)
      const blob = await generateCoverImage({
        videoUrl: videoBlobUrl,
        hookText: hookText.trim(),
        handle: handle.trim() || undefined,
        fontFamily: 'Inter, sans-serif',
        style: coverStyle,
        accentColor: '#a855f7',
      })
      setCoverUrl(URL.createObjectURL(blob))
      toast.success('Capa gerada!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar capa')
    } finally {
      setGeneratingCover(false)
    }
  }

  // Render video with overlay
  const handleRenderOverlay = async () => {
    if (!videoBlobUrl) { toast.error('Grave ou importe um video primeiro'); return }
    if (!overlayText.trim()) { toast.error('Escreva o texto para sobrepor no video'); return }
    setRendering(true)
    const toastId = toast.loading('Renderizando video com texto...')
    try {
      // Get video duration
      const tempVideo = document.createElement('video')
      tempVideo.src = videoBlobUrl
      tempVideo.muted = true
      await new Promise<void>((resolve) => {
        tempVideo.onloadedmetadata = () => resolve()
        tempVideo.load()
      })
      const durationMs = (tempVideo.duration || 30) * 1000
      tempVideo.src = ''

      if (renderedUrl) URL.revokeObjectURL(renderedUrl)
      const config: ReelsOverlayConfig = {
        width: 1080,
        height: 1920,
        fps: 30,
        durationMs,
        videoUrl: videoBlobUrl,
        overlayText: overlayText.trim(),
        handle: handle.trim() || undefined,
        fontFamily: 'Inter, sans-serif',
        fontSize: 48,
        textColor: '#ffffff',
      }
      const blob = await renderReelsWithOverlay(config)
      setRenderedUrl(URL.createObjectURL(blob))
      toast.success('Video renderizado!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renderizar', { id: toastId })
    } finally {
      setRendering(false)
    }
  }

  const handleDownloadVideo = () => {
    const url = renderedUrl || videoBlobUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `reels-${Date.now()}.webm`
    a.click()
    toast.success('Video baixado!')
  }

  const handleDownloadCover = () => {
    if (!coverUrl) return
    const a = document.createElement('a')
    a.href = coverUrl
    a.download = `capa-reels-${Date.now()}.png`
    a.click()
    toast.success('Capa baixada!')
  }

  const inputCls = 'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  return (
    <>
      {/* Beauty recorder fullscreen */}
      {showRecorder && (
        <BeautyRecorder
          onRecordingComplete={handleRecordingComplete}
          onClose={() => setShowRecorder(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setView('dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reels</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Grave com filtro de beleza + capa automatica com hook
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* 1. Hook Text */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Hook (texto da capa) *</label>
            <textarea
              value={hookText}
              onChange={e => setHookText(e.target.value)}
              placeholder="A frase que vai aparecer na capa do Reel. Ex: 'Voce nao precisa de mais conhecimento'"
              className={`${inputCls} min-h-[80px] resize-none`}
              rows={3}
            />
            <div className="mt-3">
              <label className={labelCls}>@ Handle</label>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@seunome"
                className={inputCls}
              />
            </div>
          </div>

          {/* 2. Video (record or upload) */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Video *</label>
            {videoBlobUrl ? (
              <div className="relative">
                <video
                  src={videoBlobUrl}
                  className="w-full rounded-xl border border-violet-300 dark:border-violet-700"
                  style={{ maxHeight: 280, objectFit: 'cover' }}
                  muted
                  autoPlay
                  loop
                  playsInline
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-[10px] text-white font-bold">
                  {videoFile?.name || 'Gravado com filtro'}
                </div>
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRecorder(true)}
                  className="py-8 border-2 border-dashed border-rose-300 dark:border-rose-700 rounded-xl text-rose-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all flex flex-col items-center gap-2"
                >
                  <Video size={28} />
                  <span className="text-sm font-bold">Gravar com Filtro</span>
                  <span className="text-[10px] text-gray-400">Camera + filtro de beleza</span>
                </button>
                <label className="py-8 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl text-violet-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all flex flex-col items-center gap-2 cursor-pointer">
                  <Upload size={28} />
                  <span className="text-sm font-bold">Importar Video</span>
                  <span className="text-[10px] text-gray-400">MP4, WebM, MOV</span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3. Text Overlay (optional) */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Texto no Video (opcional)</label>
            <p className="text-xs text-gray-400 mb-2">Texto que aparece sobre o video (parte inferior). Deixe vazio para video limpo.</p>
            <textarea
              value={overlayText}
              onChange={e => setOverlayText(e.target.value)}
              placeholder="Ex: Organizacao e o que transforma conhecimento em negocio"
              className={`${inputCls} min-h-[60px] resize-none`}
              rows={2}
            />
            {overlayText.trim() && videoBlobUrl && (
              <button
                onClick={handleRenderOverlay}
                disabled={rendering}
                className="mt-3 w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {rendering ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {rendering ? 'Renderizando...' : 'Aplicar Texto no Video'}
              </button>
            )}
          </div>

          {/* Rendered video preview */}
          {renderedUrl && (
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Preview (com texto)</label>
              <div className="flex justify-center">
                <video
                  src={renderedUrl}
                  controls
                  autoPlay
                  loop
                  style={{ width: 216, height: 384, borderRadius: 12 }}
                  className="shadow-lg"
                />
              </div>
            </div>
          )}

          {/* 4. Cover Generation */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Capa do Reel</label>
            <p className="text-xs text-gray-400 mb-3">Escolha o estilo e gere a capa com o hook</p>

            {/* Style selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {COVER_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setCoverStyle(s.id)}
                  className={cn(
                    'py-3 px-2 rounded-xl border text-center transition-all',
                    coverStyle === s.id
                      ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <span className="text-xs font-bold block">{s.label}</span>
                  <span className="text-[9px] opacity-60 block mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateCover}
              disabled={generatingCover || !videoBlobUrl || !hookText.trim()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {generatingCover ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
              {generatingCover ? 'Gerando...' : 'Gerar Capa'}
            </button>

            {/* Cover preview */}
            {coverUrl && (
              <div className="mt-4 flex justify-center">
                <div className="relative">
                  <img
                    src={coverUrl}
                    alt="Capa do Reel"
                    className="rounded-xl shadow-lg"
                    style={{ width: 216, height: 384, objectFit: 'cover' }}
                  />
                  <button
                    onClick={handleDownloadCover}
                    className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    title="Baixar capa"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Download Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDownloadVideo}
              disabled={!videoBlobUrl}
              className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <Download size={20} />
              Baixar Video
            </button>

            {coverUrl && (
              <button
                onClick={handleDownloadCover}
                className="py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Image size={20} />
                Baixar Capa
              </button>
            )}
          </div>

          {/* How to use */}
          <div className="bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/30 rounded-2xl border border-violet-200 dark:border-violet-800/30 p-5">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-2">
              Como criar um Reel
            </p>
            <ol className="space-y-1.5 text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
              <li><span className="font-bold text-violet-800 dark:text-violet-200">1.</span> Escreva o hook (frase impactante para a capa)</li>
              <li><span className="font-bold text-violet-800 dark:text-violet-200">2.</span> Grave com filtro de beleza ou importe video pronto</li>
              <li><span className="font-bold text-violet-800 dark:text-violet-200">3.</span> (Opcional) Adicione texto sobre o video</li>
              <li><span className="font-bold text-violet-800 dark:text-violet-200">4.</span> Gere a capa com estilo — 4 opcoes visuais</li>
              <li><span className="font-bold text-violet-800 dark:text-violet-200">5.</span> Baixe video + capa e poste no Instagram!</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}
