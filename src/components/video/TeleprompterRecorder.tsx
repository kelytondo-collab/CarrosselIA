import { useState, useRef, useEffect, useCallback } from 'react'
import { Video, Square, ChevronRight, RotateCcw, Check, X, Mic, MicOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface Phrase {
  phrase: string
  keywords: string
  arc: string
}

interface TeleprompterRecorderProps {
  phrases: Phrase[]
  onRecordingComplete: (blob: Blob, blobUrl: string) => void
  onClose: () => void
  recordingTip?: string
}

const ARC_COLORS: Record<string, string> = {
  fachada: '#38bdf8',   // sky-400
  contraste: '#fbbf24', // amber-400
  verdade: '#fb7185',   // rose-400
  convite: '#4ade80',   // green-400
}

export default function TeleprompterRecorder({ phrases, onRecordingComplete, onClose, recordingTip }: TeleprompterRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      // Stop previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: audioEnabled,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraReady(true)
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Nao foi possivel acessar a camera. Verifique as permissoes.')
    }
  }, [facingMode, audioEnabled])

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [startCamera])

  // Flip camera
  const flipCamera = () => {
    if (isRecording) return
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  // Toggle audio
  const toggleAudio = () => {
    if (isRecording) return
    setAudioEnabled(prev => !prev)
  }

  // Start recording with 3-2-1 countdown
  const handleStartRecording = () => {
    if (!streamRef.current) return
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
    if (!streamRef.current) return
    chunksRef.current = []

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm'

    const mr = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 4_000_000 })
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
    setCurrentPhraseIdx(0)
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
  }

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
  }

  // Navigate phrases
  const nextPhrase = () => {
    if (currentPhraseIdx < phrases.length - 1) {
      setCurrentPhraseIdx(prev => prev + 1)
    } else if (isRecording) {
      handleStopRecording()
    }
  }

  const prevPhrase = () => {
    if (currentPhraseIdx > 0) setCurrentPhraseIdx(prev => prev - 1)
  }

  // Accept recording
  const handleAccept = () => {
    if (recordedBlob && recordedUrl) {
      onRecordingComplete(recordedBlob, recordedUrl)
    }
  }

  // Retry
  const handleRetry = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setCurrentPhraseIdx(0)
    setElapsed(0)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const currentPhrase = phrases[currentPhraseIdx]
  const arcColor = ARC_COLORS[currentPhrase?.arc] || '#ffffff'

  // Review mode — show recorded video
  if (recordedUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Review video */}
        <div className="flex-1 relative">
          <video
            src={recordedUrl}
            className="w-full h-full object-cover"
            controls
            autoPlay
            playsInline
          />
        </div>
        {/* Actions */}
        <div className="flex gap-4 p-6 bg-black/80 justify-center">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-800 text-white font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={18} />
            Gravar de novo
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors"
          >
            <Check size={18} />
            Usar este video
          </button>
        </div>
      </div>
    )
  }

  // Recording mode
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera feed */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={onClose} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-sm">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/80 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-bold font-mono">{formatTime(elapsed)}</span>
              </div>
            )}
            <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-semibold">
              {currentPhraseIdx + 1} / {phrases.length}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleAudio} className={cn('p-2 rounded-full backdrop-blur-sm', audioEnabled ? 'bg-black/40 text-white' : 'bg-red-600/60 text-white')} disabled={isRecording}>
              {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button onClick={flipCamera} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-sm" disabled={isRecording}>
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[120px] font-black text-white animate-pulse">{countdown}</span>
          </div>
        )}

        {/* Teleprompter — current phrase */}
        <div className="absolute bottom-32 left-0 right-0 px-6">
          {/* Recording tip (before recording) */}
          {!isRecording && recordingTip && (
            <div className="mb-4 px-4 py-2 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30">
              <p className="text-amber-200 text-xs text-center">{recordingTip}</p>
            </div>
          )}

          {/* Phrase display */}
          <div
            className="text-center transition-all duration-500"
            onClick={nextPhrase}
            style={{ cursor: 'pointer' }}
          >
            {/* Previous phrase (faded) */}
            {currentPhraseIdx > 0 && (
              <p className="text-white/25 text-lg font-medium mb-2 transition-all">
                {phrases[currentPhraseIdx - 1].phrase}
              </p>
            )}

            {/* Current phrase */}
            <p
              className="text-3xl font-black leading-tight drop-shadow-lg transition-all"
              style={{ color: arcColor, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
            >
              {currentPhrase?.phrase}
            </p>

            {/* Next phrase (faded) */}
            {currentPhraseIdx < phrases.length - 1 && (
              <p className="text-white/25 text-lg font-medium mt-2 transition-all">
                {phrases[currentPhraseIdx + 1].phrase}
              </p>
            )}

            {/* Tap hint */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 mt-3 text-white/40 text-xs">
                <ChevronRight size={12} />
                <span>Toque para proxima frase</span>
              </div>
            )}
          </div>

          {/* Arc indicator dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {phrases.map((p, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  i === currentPhraseIdx ? 'scale-150' : i < currentPhraseIdx ? 'opacity-40' : 'opacity-60'
                )}
                style={{ backgroundColor: ARC_COLORS[p.arc] || '#fff' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-black/80 backdrop-blur-sm px-6 py-5 flex items-center justify-center gap-8">
        {!isRecording && !cameraReady && (
          <p className="text-gray-400 text-sm">Carregando camera...</p>
        )}

        {cameraReady && !isRecording && (
          <>
            <button
              onClick={prevPhrase}
              disabled={currentPhraseIdx === 0}
              className="p-3 rounded-full bg-gray-800 text-white disabled:opacity-20 transition-colors"
              style={{ transform: 'rotate(180deg)' }}
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={handleStartRecording}
              className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center hover:bg-red-700 transition-all hover:scale-105 active:scale-95"
            >
              <Video size={28} className="text-white" />
            </button>
            <button
              onClick={nextPhrase}
              disabled={currentPhraseIdx >= phrases.length - 1}
              className="p-3 rounded-full bg-gray-800 text-white disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {isRecording && (
          <button
            onClick={handleStopRecording}
            className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center hover:bg-red-700 transition-all animate-pulse"
          >
            <Square size={24} className="text-white" fill="white" />
          </button>
        )}
      </div>
    </div>
  )
}
