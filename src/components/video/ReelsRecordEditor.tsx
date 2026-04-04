import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, Upload, X, ArrowLeft, Video, Image, Sparkles, ClipboardPaste, Check, Play, Pause, Copy } from 'lucide-react'
import { generateCoverImage } from '../../services/videoRenderer'
import type { CoverStyle } from '../../services/videoRenderer'
import { getDefaultProfile } from '../../services/storageService'
import { parseVideoScript, toTeleprompterPhrases } from '../../services/scriptParser'
import type { ScriptPhrase } from '../../services/scriptParser'
import { buildCaptionFromScript, buildCaption } from '../../services/captionBuilder'
import { renderHookCard, renderCtaCard } from '../../services/hookCtaRenderer'
import { composeReelVideo } from '../../services/videoComposer'
import type { PhraseTimestamp } from './TeleprompterRecorder'
import TeleprompterRecorder from './TeleprompterRecorder'
import BeautyRecorder from './BeautyRecorder'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

type Step = 'setup' | 'record' | 'compose' | 'preview'
type RecordMode = 'teleprompter' | 'beauty'

const COVER_STYLES: { id: CoverStyle; label: string; desc: string }[] = [
  { id: 'bold-hook', label: 'Bold Hook', desc: 'Texto grande' },
  { id: 'minimal', label: 'Minimal', desc: 'Texto embaixo' },
  { id: 'gradient', label: 'Gradiente', desc: 'Sem foto' },
  { id: 'editorial', label: 'Editorial', desc: 'Linha lateral' },
]

export default function ReelsRecordEditor() {
  const { setView } = useApp()
  const profile = getDefaultProfile()

  // Wizard step
  const [step, setStep] = useState<Step>('setup')

  // Setup state
  const [scriptRaw, setScriptRaw] = useState('')
  const [phrases, setPhrases] = useState<ScriptPhrase[]>([])
  const [hookText, setHookText] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [handle, setHandle] = useState(profile?.name ? `@${profile.name.toLowerCase().replace(/\s+/g, '')}` : '')
  const [enableHook, setEnableHook] = useState(true)
  const [enableCta, setEnableCta] = useState(true)
  const [recordMode, setRecordMode] = useState<RecordMode>('teleprompter')

  // Record state
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [timestamps, setTimestamps] = useState<PhraseTimestamp[]>([])
  const [showRecorder, setShowRecorder] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Compose state
  const [composing, setComposing] = useState(false)
  const [composeProgress, setComposeProgress] = useState('')

  // Preview state
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const [captionText, setCaptionText] = useState('')
  const [coverStyle, setCoverStyle] = useState<CoverStyle>('bold-hook')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auto-import from Luminae (video_script or reels_record)
  useEffect(() => {
    // Check video_script import first
    const scriptData = localStorage.getItem('luminae_video_script_import')
    if (scriptData) {
      localStorage.removeItem('luminae_video_script_import')
      try {
        const data = JSON.parse(scriptData)
        if (data.script) {
          setScriptRaw(data.script)
          handleParseScript(data.script)
          toast.success('Roteiro importado do Luminae!')
          return
        }
      } catch { /* ignore */ }
    }
    // Fallback: reels_record import (hook only)
    const raw = localStorage.getItem('luminae_reels_record_import')
    if (raw) {
      localStorage.removeItem('luminae_reels_record_import')
      try {
        const data = JSON.parse(raw)
        if (data.hook) setHookText(String(data.hook))
        if (data.caption) setCaptionText(String(data.caption))
        toast.success('Hook importado do Luminae!')
      } catch { /* ignore */ }
    }
  }, [])

  // Parse script text into phrases
  const handleParseScript = (text: string) => {
    const parsed = parseVideoScript(text)
    setPhrases(parsed.phrases)
    if (parsed.hook) setHookText(parsed.hook)
    if (parsed.ctaText) setCtaText(parsed.ctaText)
    if (parsed.phrases.length > 0) {
      setRecordMode('teleprompter')
    }
  }

  const handlePasteScript = () => {
    if (!scriptRaw.trim()) {
      toast.error('Cole o roteiro primeiro')
      return
    }
    handleParseScript(scriptRaw)
    toast.success(`${phrases.length || 'Roteiro'} frases parseadas!`)
  }

  // Video handlers
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Selecione um arquivo de video'); return }
    if (file.size > 200 * 1024 * 1024) { toast.error('Video muito grande (max 200MB)'); return }
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(file)
    setVideoBlobUrl(URL.createObjectURL(file))
    setTimestamps([])
    // Go to compose step
    setStep('compose')
  }

  const handleRecordingComplete = (_blob: Blob, blobUrl: string, ts: PhraseTimestamp[]) => {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(null)
    setVideoBlobUrl(blobUrl)
    setTimestamps(ts)
    setShowRecorder(false)
    toast.success('Video gravado!')
    // Go to compose step
    setStep('compose')
  }

  const handleBeautyRecordingComplete = (_blob: Blob, blobUrl: string) => {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(null)
    setVideoBlobUrl(blobUrl)
    setTimestamps([])
    setShowRecorder(false)
    toast.success('Video gravado com filtro!')
    setStep('compose')
  }

  // Compose step — auto-run
  useEffect(() => {
    if (step !== 'compose' || !videoBlobUrl || composing) return
    runCompose()
  }, [step, videoBlobUrl])

  const runCompose = async () => {
    if (!videoBlobUrl) return
    setComposing(true)

    try {
      // 1. Render hook card if enabled
      let hookBlob: Blob | null = null
      if (enableHook && hookText.trim()) {
        setComposeProgress('Renderizando hook card...')
        hookBlob = await renderHookCard(hookText.trim(), handle.trim() || undefined)
      }

      // 2. Render CTA card if enabled
      let ctaBlob: Blob | null = null
      if (enableCta && handle.trim()) {
        setComposeProgress('Renderizando CTA card...')
        ctaBlob = await renderCtaCard(handle.trim(), ctaText.trim() || undefined)
      }

      // 3. Compose full video
      setComposeProgress('Montando video final...')
      const finalBlob = await composeReelVideo({
        videoUrl: videoBlobUrl,
        phrases: phrases.length > 0 ? phrases : undefined,
        timestamps: timestamps.length > 0 ? timestamps : undefined,
        hookBlob,
        ctaBlob,
        handle: handle.trim() || undefined,
      })

      if (finalVideoUrl) URL.revokeObjectURL(finalVideoUrl)
      setFinalVideoUrl(URL.createObjectURL(finalBlob))

      // 4. Build caption
      if (phrases.length > 0) {
        setCaptionText(buildCaptionFromScript(hookText, phrases, handle.trim() || undefined))
      } else if (!captionText && hookText) {
        setCaptionText(buildCaption({ hook: hookText, handle: handle.trim() || undefined }))
      }

      setStep('preview')
      toast.success('Reel pronto!')
    } catch (err) {
      console.error('Compose error:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao montar video')
      setStep('record')
    } finally {
      setComposing(false)
      setComposeProgress('')
    }
  }

  // Cover generation
  const handleGenerateCover = async () => {
    const videoSrc = finalVideoUrl || videoBlobUrl
    if (!videoSrc) { toast.error('Nenhum video disponivel'); return }
    if (!hookText.trim()) { toast.error('Escreva o hook para a capa'); return }
    setGeneratingCover(true)
    try {
      if (coverUrl) URL.revokeObjectURL(coverUrl)
      const blob = await generateCoverImage({
        videoUrl: videoSrc,
        hookText: hookText.trim(),
        handle: handle.trim() || undefined,
        fontFamily: 'Inter, sans-serif',
        style: coverStyle,
        accentColor: '#a855f7',
      })
      setCoverUrl(URL.createObjectURL(blob))
      toast.success('Capa gerada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar capa')
    } finally {
      setGeneratingCover(false)
    }
  }

  // Downloads
  const handleDownloadVideo = () => {
    const url = finalVideoUrl || videoBlobUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `reel-${Date.now()}.webm`
    a.click()
    toast.success('Video baixado!')
  }

  const handleDownloadCover = () => {
    if (!coverUrl) return
    const a = document.createElement('a')
    a.href = coverUrl
    a.download = `capa-reel-${Date.now()}.png`
    a.click()
  }

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Caption copiada!')
  }

  const inputCls = 'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  // Step indicator
  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'setup', label: 'Roteiro', num: 1 },
    { key: 'record', label: 'Gravar', num: 2 },
    { key: 'compose', label: 'Montar', num: 3 },
    { key: 'preview', label: 'Pronto', num: 4 },
  ]
  const stepIdx = steps.findIndex(s => s.key === step)

  return (
    <>
      {/* Fullscreen recorders */}
      {showRecorder && recordMode === 'teleprompter' && phrases.length > 0 && (
        <TeleprompterRecorder
          phrases={toTeleprompterPhrases(phrases)}
          onRecordingComplete={handleRecordingComplete}
          onClose={() => setShowRecorder(false)}
          recordingTip="Toque na tela para avancar a frase enquanto grava"
        />
      )}
      {showRecorder && recordMode === 'beauty' && (
        <BeautyRecorder
          onRecordingComplete={handleBeautyRecordingComplete}
          onClose={() => setShowRecorder(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => step === 'setup' ? setView('dashboard') : setStep(step === 'preview' ? 'setup' : 'setup')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gravar Reel</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Teleprompter + auto-edit</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all',
                  i <= stepIdx
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                )}>
                  {i < stepIdx ? <Check size={14} /> : s.num}
                </div>
                <span className={cn(
                  'text-[10px] font-semibold',
                  i <= stepIdx ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'
                )}>{s.label}</span>
                {i < steps.length - 1 && (
                  <div className={cn('flex-1 h-0.5 rounded-full mx-1', i < stepIdx ? 'bg-violet-400' : 'bg-gray-200 dark:bg-gray-700')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: SETUP */}
        {step === 'setup' && (
          <div className="space-y-5">
            {/* Script paste area */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Roteiro (cole do Luminae)</label>
              <textarea
                value={scriptRaw}
                onChange={e => setScriptRaw(e.target.value)}
                placeholder={`Cole o roteiro com timecodes:\n[0:00-0:03] Hook: Voce nao precisa de mais conhecimento\n[0:03-0:08] Validacao: O problema e que voce sabe demais\n[0:08-0:15] Desenvolvimento: Eu transformei em metodo\n[0:15-0:20] CTA: Link na bio`}
                className={`${inputCls} min-h-[120px] resize-none font-mono text-xs`}
                rows={6}
              />
              <button
                onClick={handlePasteScript}
                disabled={!scriptRaw.trim()}
                className="mt-3 w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <ClipboardPaste size={16} />
                Parsear Roteiro
              </button>

              {/* Parsed phrases preview */}
              {phrases.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">{phrases.length} frases parseadas</p>
                  {phrases.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        p.arc === 'fachada' ? 'bg-sky-400' :
                        p.arc === 'contraste' ? 'bg-amber-400' :
                        p.arc === 'verdade' ? 'bg-rose-400' : 'bg-green-400'
                      )} />
                      <span className="text-gray-500 dark:text-gray-400 font-mono w-16 shrink-0">{p.section}</span>
                      <span className="text-gray-900 dark:text-white truncate">{p.phrase}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hook & Handle */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Hook (texto da capa)</label>
              <textarea
                value={hookText}
                onChange={e => setHookText(e.target.value)}
                placeholder="A frase impactante que abre o Reel"
                className={`${inputCls} min-h-[60px] resize-none`}
                rows={2}
              />
              <div className="mt-3">
                <label className={labelCls}>@ Handle</label>
                <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@seunome" className={inputCls} />
              </div>
            </div>

            {/* Toggles */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <label className={labelCls}>Opcoes de Composicao</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enableHook} onChange={e => setEnableHook(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Hook card (3s fundo escuro + texto dourado)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enableCta} onChange={e => setEnableCta(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">CTA card (8s @handle + glow)</span>
              </label>
            </div>

            {/* Go to Record */}
            <button
              onClick={() => setStep('record')}
              className="w-full py-4 bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-700 hover:to-violet-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <Video size={20} />
              Proximo: Gravar Video
            </button>
          </div>
        )}

        {/* STEP 2: RECORD */}
        {step === 'record' && (
          <div className="space-y-5">
            {/* Record mode selector */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Modo de Gravacao</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRecordMode('teleprompter')}
                  className={cn(
                    'py-4 rounded-xl border-2 transition-all text-center',
                    recordMode === 'teleprompter'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300',
                    phrases.length === 0 && 'opacity-40 cursor-not-allowed'
                  )}
                  disabled={phrases.length === 0}
                >
                  <Sparkles size={24} className="mx-auto mb-1" />
                  <span className="text-sm font-bold block">Teleprompter</span>
                  <span className="text-[10px] opacity-60">{phrases.length} frases</span>
                </button>
                <button
                  onClick={() => setRecordMode('beauty')}
                  className={cn(
                    'py-4 rounded-xl border-2 transition-all text-center',
                    recordMode === 'beauty'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <Video size={24} className="mx-auto mb-1" />
                  <span className="text-sm font-bold block">Filtro Beleza</span>
                  <span className="text-[10px] opacity-60">Gravacao livre</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRecorder(true)}
                className="py-8 border-2 border-dashed border-rose-300 dark:border-rose-700 rounded-xl text-rose-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all flex flex-col items-center gap-2"
              >
                <Video size={28} />
                <span className="text-sm font-bold">Gravar</span>
                <span className="text-[10px] text-gray-400">{recordMode === 'teleprompter' ? 'Com teleprompter' : 'Com filtro'}</span>
              </button>
              <label className="py-8 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl text-violet-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all flex flex-col items-center gap-2 cursor-pointer">
                <Upload size={28} />
                <span className="text-sm font-bold">Importar</span>
                <span className="text-[10px] text-gray-400">MP4, WebM, MOV</span>
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              </label>
            </div>

            {/* Video preview if already recorded */}
            {videoBlobUrl && (
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <label className={labelCls}>Video gravado</label>
                <div className="relative">
                  <video src={videoBlobUrl} className="w-full rounded-xl border border-violet-300" style={{ maxHeight: 280, objectFit: 'cover' }} muted autoPlay loop playsInline />
                  <button
                    onClick={() => { if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl); setVideoBlobUrl(null); setVideoFile(null) }}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                  >
                    <X size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setStep('compose')}
                  className="mt-3 w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Montar Video Final
                </button>
              </div>
            )}

            {/* Back button */}
            <button onClick={() => setStep('setup')} className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Voltar para Roteiro
            </button>
          </div>
        )}

        {/* STEP 3: COMPOSE (auto) */}
        {step === 'compose' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Loader2 size={36} className="text-violet-600 animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Montando seu Reel...</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{composeProgress || 'Preparando...'}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {enableHook && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">Hook 3s</span>}
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">Video + Legendas</span>
              {enableCta && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">CTA 8s</span>}
            </div>
          </div>
        )}

        {/* STEP 4: PREVIEW */}
        {step === 'preview' && (
          <div className="space-y-5">
            {/* Final video */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Reel Final</label>
              <div className="flex justify-center">
                {finalVideoUrl ? (
                  <video src={finalVideoUrl} controls autoPlay loop style={{ width: 216, height: 384, borderRadius: 12 }} className="shadow-lg" />
                ) : videoBlobUrl ? (
                  <video src={videoBlobUrl} controls autoPlay loop style={{ width: 216, height: 384, borderRadius: 12 }} className="shadow-lg" />
                ) : (
                  <div className="w-[216px] h-[384px] bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Sem video</span>
                  </div>
                )}
              </div>
            </div>

            {/* Caption */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>Legenda Instagram</label>
                <button onClick={handleCopyCaption} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <textarea
                value={captionText}
                onChange={e => setCaptionText(e.target.value)}
                className={`${inputCls} min-h-[100px] resize-none text-xs`}
                rows={5}
              />
            </div>

            {/* Cover */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Capa do Reel</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {COVER_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setCoverStyle(s.id)}
                    className={cn(
                      'py-2.5 px-2 rounded-xl border text-center transition-all',
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
                disabled={generatingCover || !hookText.trim()}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {generatingCover ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
                {generatingCover ? 'Gerando...' : 'Gerar Capa'}
              </button>
              {coverUrl && (
                <div className="mt-4 flex justify-center">
                  <div className="relative">
                    <img src={coverUrl} alt="Capa" className="rounded-xl shadow-lg" style={{ width: 216, height: 384, objectFit: 'cover' }} />
                    <button onClick={handleDownloadCover} className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80" title="Baixar capa">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Download actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDownloadVideo}
                disabled={!finalVideoUrl && !videoBlobUrl}
                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <Download size={20} />
                Baixar Reel
              </button>
              {coverUrl && (
                <button
                  onClick={handleDownloadCover}
                  className="py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Image size={20} />
                  Capa
                </button>
              )}
            </div>

            {/* Redo */}
            <button onClick={() => { setStep('setup'); if (finalVideoUrl) { URL.revokeObjectURL(finalVideoUrl); setFinalVideoUrl(null) } }} className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Fazer outro Reel
            </button>
          </div>
        )}
      </div>
    </>
  )
}
