import { useState, useRef, useEffect, useCallback } from 'react'
import { Video, Square, RotateCcw, Check, X, Mic, MicOff, SlidersHorizontal } from 'lucide-react'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface BeautyFilters {
  blur: number       // 0-2 px (skin smoothing)
  brightness: number // 0.9-1.2
  contrast: number   // 0.9-1.15
  saturate: number   // 0.8-1.4
  warmth: number     // 0-0.08 (overlay alpha)
}

const DEFAULT_FILTERS: BeautyFilters = {
  blur: 0.6,
  brightness: 1.05,
  contrast: 1.02,
  saturate: 1.1,
  warmth: 0.04,
}

interface BeautyRecorderProps {
  onRecordingComplete: (blob: Blob, blobUrl: string) => void
  onClose: () => void
}

export default function BeautyRecorder({ onRecordingComplete, onClose }: BeautyRecorderProps) {
  const srcVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  const [cameraReady, setCameraReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<BeautyFilters>(DEFAULT_FILTERS)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: audioEnabled,
      })
      streamRef.current = stream
      if (srcVideoRef.current) {
        srcVideoRef.current.srcObject = stream
      }
      setCameraReady(true)
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Nao foi possivel acessar a camera. Verifique as permissoes.')
    }
  }, [facingMode, audioEnabled])

  // Canvas rendering loop with beauty filter
  const renderLoop = useCallback(() => {
    const video = srcVideoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderLoop)
      return
    }

    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    // Apply CSS filters on the canvas context
    const filterStr = [
      filters.blur > 0 ? `blur(${filters.blur}px)` : '',
      `brightness(${filters.brightness})`,
      `contrast(${filters.contrast})`,
      `saturate(${filters.saturate})`,
    ].filter(Boolean).join(' ')

    ctx.filter = filterStr

    // Mirror if front camera
    ctx.save()
    if (facingMode === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }

    // Draw video covering canvas (object-fit: cover)
    const vw = video.videoWidth || w
    const vh = video.videoHeight || h
    const ratio = Math.max(w / vw, h / vh)
    const nw = vw * ratio
    const nh = vh * ratio
    ctx.drawImage(video, (w - nw) / 2, (h - nh) / 2, nw, nh)
    ctx.restore()

    // Reset filter for overlay
    ctx.filter = 'none'

    // Warmth overlay (subtle warm tone)
    if (filters.warmth > 0) {
      ctx.fillStyle = `rgba(255,180,100,${filters.warmth})`
      ctx.fillRect(0, 0, w, h)
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)
  }, [filters, facingMode])

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [startCamera])

  // Start render loop when camera is ready
  useEffect(() => {
    if (cameraReady) {
      animFrameRef.current = requestAnimationFrame(renderLoop)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [cameraReady, renderLoop])

  const flipCamera = () => {
    if (isRecording) return
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const toggleAudio = () => {
    if (isRecording) return
    setAudioEnabled(prev => !prev)
  }

  // Start recording with 3-2-1 countdown
  const handleStartRecording = () => {
    if (!streamRef.current || !canvasRef.current) return
    setCountdown(3)
    let count = 3
    const iv = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        clearInterval(iv)
        setCountdown(null)
        beginRecording()
      }
    }, 1000)
  }

  const beginRecording = () => {
    if (!streamRef.current || !canvasRef.current) return
    chunksRef.current = []

    // Capture the filtered canvas stream + original audio
    const canvasStream = canvasRef.current.captureStream(30)
    const audioTracks = streamRef.current.getAudioTracks()
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ])

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm'

    const mr = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000 })
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob)
      setRecordedUrl(url)
    }
    mr.start(100)
    mediaRecorderRef.current = mr
    setIsRecording(true)
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    cancelAnimationFrame(animFrameRef.current)
    setCameraReady(false)
  }

  const cleanupAll = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
    cancelAnimationFrame(animFrameRef.current)
    setIsRecording(false)
    setCameraReady(false)
  }

  const handleClose = () => {
    cleanupAll()
    onClose()
  }

  const handleAccept = () => {
    if (recordedBlob && recordedUrl) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      onRecordingComplete(recordedBlob, recordedUrl)
    }
  }

  const handleRetry = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setElapsed(0)
    startCamera()
  }

  const updateFilter = (key: keyof BeautyFilters, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const FILTER_SLIDERS: { key: keyof BeautyFilters; label: string; min: number; max: number; step: number }[] = [
    { key: 'blur', label: 'Suavizar Pele', min: 0, max: 2, step: 0.1 },
    { key: 'brightness', label: 'Brilho', min: 0.9, max: 1.2, step: 0.01 },
    { key: 'contrast', label: 'Contraste', min: 0.9, max: 1.15, step: 0.01 },
    { key: 'saturate', label: 'Saturacao', min: 0.8, max: 1.4, step: 0.05 },
    { key: 'warmth', label: 'Aquecimento', min: 0, max: 0.08, step: 0.005 },
  ]

  // Review mode
  if (recordedUrl) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
        <div className="absolute top-4 right-4 z-10">
          <button onClick={handleClose} className="p-3 rounded-full bg-white/20 text-white backdrop-blur-sm">
            <X size={22} />
          </button>
        </div>

        <div className="pt-4 pb-2 text-center">
          <p className="text-white font-bold text-lg">Video gravado!</p>
          <p className="text-white/50 text-xs">Revise e escolha abaixo</p>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 min-h-0">
          <video
            src={recordedUrl}
            className="max-h-full max-w-full rounded-2xl"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
            controls
            autoPlay
            playsInline
          />
        </div>

        <div className="flex gap-4 p-6 justify-center flex-shrink-0">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gray-700 text-white font-semibold text-base active:scale-95 transition-all"
          >
            <RotateCcw size={20} />
            Gravar de novo
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-green-600 text-white font-bold text-base active:scale-95 transition-all"
          >
            <Check size={20} />
            Usar video
          </button>
        </div>
      </div>
    )
  }

  // Recording/preview mode
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Hidden source video (raw camera feed) */}
      <video
        ref={srcVideoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
      />

      {/* Filtered canvas (what the user sees) */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="w-full h-full object-cover"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <button onClick={handleClose} className="p-3 rounded-full bg-black/60 text-white backdrop-blur-sm active:scale-90 transition-transform">
            <X size={24} />
          </button>
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/80 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-bold font-mono">{formatTime(elapsed)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleAudio}
              className={cn('p-2 rounded-full backdrop-blur-sm', audioEnabled ? 'bg-black/40 text-white' : 'bg-red-600/60 text-white')}
              disabled={isRecording}
            >
              {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button onClick={flipCamera} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-sm" disabled={isRecording}>
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={cn('p-2 rounded-full backdrop-blur-sm', showFilters ? 'bg-violet-600/80 text-white' : 'bg-black/40 text-white')}
              disabled={isRecording}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[120px] font-black text-white animate-pulse">{countdown}</span>
          </div>
        )}

        {/* Beauty filter panel */}
        {showFilters && !isRecording && (
          <div className="absolute bottom-32 left-4 right-4 bg-black/70 backdrop-blur-md rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-xs font-bold uppercase tracking-wider">Filtro de Beleza</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-[10px] text-violet-300 font-semibold hover:text-violet-200"
              >
                Resetar
              </button>
            </div>
            {FILTER_SLIDERS.map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-white/60 text-[10px] w-24 text-right">{s.label}</span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={filters[s.key]}
                  onChange={e => updateFilter(s.key, parseFloat(e.target.value))}
                  className="flex-1 h-1.5 accent-violet-500"
                />
                <span className="text-white/40 text-[10px] font-mono w-8">{filters[s.key].toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/80 backdrop-blur-sm px-6 py-5 flex items-center justify-center gap-8">
        {!isRecording && !cameraReady && (
          <p className="text-gray-400 text-sm">Carregando camera...</p>
        )}

        {cameraReady && !isRecording && (
          <button
            onClick={handleStartRecording}
            className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center hover:bg-red-700 transition-all hover:scale-105 active:scale-95"
          >
            <Video size={28} className="text-white" />
          </button>
        )}

        {isRecording && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStopRecording}
              className="w-24 h-24 rounded-full bg-red-600 border-4 border-white flex flex-col items-center justify-center hover:bg-red-700 transition-all animate-pulse shadow-lg shadow-red-600/50"
            >
              <Square size={28} className="text-white" fill="white" />
            </button>
            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Toque para parar</span>
          </div>
        )}
      </div>
    </div>
  )
}
