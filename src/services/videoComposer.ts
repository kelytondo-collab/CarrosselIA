/**
 * videoComposer.ts
 * Composes: hook card (3s) + recorded video with subtitle overlay + CTA card (8s)
 * into a single video. All client-side using Canvas + MediaRecorder.
 *
 * Subtitle rendering reuses the same logic as renderReelsConexao in videoRenderer.ts.
 */

import type { PhraseTimestamp } from '../components/video/TeleprompterRecorder'
import type { ScriptPhrase } from './scriptParser'
import { ARC_HIGHLIGHT_COLORS } from './videoRenderer'

const WIDTH = 1080
const HEIGHT = 1920
const FPS = 30

export interface ComposeConfig {
  /** Recorded video blob URL */
  videoUrl: string
  /** Subtitle phrases (from script or teleprompter) */
  phrases?: ScriptPhrase[]
  /** Timestamps from teleprompter recording */
  timestamps?: PhraseTimestamp[]
  /** Hook card blob (3s) — optional, pass null to skip */
  hookBlob?: Blob | null
  /** CTA card blob (8s) — optional, pass null to skip */
  ctaBlob?: Blob | null
  /** @handle for bottom watermark */
  handle?: string
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function loadVideoElement(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = src
    video.muted = true
    video.playsInline = true
    video.oncanplaythrough = () => resolve(video)
    video.onerror = () => reject(new Error('Failed to load video'))
    video.load()
  })
}

function blobToUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Compose the full reel: hook (optional) → video with subtitles → CTA (optional)
 * Returns a WebM blob.
 */
export async function composeReelVideo(config: ComposeConfig): Promise<Blob> {
  // Load main recorded video
  const mainVideo = await loadVideoElement(config.videoUrl)
  mainVideo.currentTime = 0

  // Get actual video duration
  await new Promise<void>(resolve => {
    if (mainVideo.duration && isFinite(mainVideo.duration)) { resolve(); return }
    mainVideo.onloadedmetadata = () => resolve()
  })
  const mainDurationMs = (mainVideo.duration || 30) * 1000

  // Load hook/CTA card videos if provided
  let hookVideo: HTMLVideoElement | null = null
  let hookUrl: string | null = null
  let ctaVideo: HTMLVideoElement | null = null
  let ctaUrl: string | null = null

  if (config.hookBlob) {
    hookUrl = blobToUrl(config.hookBlob)
    hookVideo = await loadVideoElement(hookUrl)
    hookVideo.currentTime = 0
  }
  if (config.ctaBlob) {
    ctaUrl = blobToUrl(config.ctaBlob)
    ctaVideo = await loadVideoElement(ctaUrl)
    ctaVideo.currentTime = 0
  }

  // Durations
  const hookDurationMs = hookVideo ? (hookVideo.duration || 3) * 1000 : 0
  const ctaDurationMs = ctaVideo ? (ctaVideo.duration || 8) * 1000 : 0
  const totalDurationMs = hookDurationMs + mainDurationMs + ctaDurationMs
  const totalFrames = Math.ceil((totalDurationMs / 1000) * FPS)

  const hookFrames = Math.ceil((hookDurationMs / 1000) * FPS)
  const mainFrames = Math.ceil((mainDurationMs / 1000) * FPS)

  // Build phrase timing for subtitles
  const phrases = config.phrases || []
  const timestamps = config.timestamps || []
  const hasTimestamps = timestamps.length > 0
  const phraseCount = phrases.length

  type PhraseTiming = { startFrame: number; endFrame: number }
  const phraseTiming: PhraseTiming[] = []

  if (phraseCount > 0) {
    if (hasTimestamps) {
      for (let i = 0; i < phraseCount; i++) {
        const ts = timestamps.find(t => t.phraseIdx === i)
        const startMs = ts ? ts.startTimeMs : (i > 0 ? (phraseTiming[i - 1]?.endFrame || 0) / FPS * 1000 : 0)
        const nextTs = timestamps.find(t => t.phraseIdx === i + 1)
        const endMs = nextTs ? nextTs.startTimeMs : (i < phraseCount - 1 ? startMs + 3000 : mainDurationMs)

        phraseTiming.push({
          startFrame: hookFrames + Math.round((startMs / 1000) * FPS),
          endFrame: hookFrames + Math.round((endMs / 1000) * FPS),
        })
      }
    } else {
      // Even distribution across main video
      const framesPerPhrase = Math.floor(mainFrames / phraseCount)
      for (let i = 0; i < phraseCount; i++) {
        phraseTiming.push({
          startFrame: hookFrames + i * framesPerPhrase,
          endFrame: hookFrames + (i === phraseCount - 1 ? mainFrames : (i + 1) * framesPerPhrase),
        })
      }
    }
  }

  // Canvas + recording
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // Audio: capture from main video
  mainVideo.muted = false
  const audioCtx = new AudioContext()
  const audioSource = audioCtx.createMediaElementSource(mainVideo)
  const audioDest = audioCtx.createMediaStreamDestination()
  audioSource.connect(audioDest)
  audioSource.connect(audioCtx.destination)

  const canvasStream = canvas.captureStream(FPS)
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ])

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm'

  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  // Phase tracking
  type Phase = 'hook' | 'main' | 'cta'

  return new Promise(resolve => {
    recorder.onstop = () => {
      mainVideo.pause()
      mainVideo.src = ''
      if (hookVideo) { hookVideo.pause(); hookVideo.src = '' }
      if (ctaVideo) { ctaVideo.pause(); ctaVideo.src = '' }
      audioCtx.close()
      if (hookUrl) URL.revokeObjectURL(hookUrl)
      if (ctaUrl) URL.revokeObjectURL(ctaUrl)
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }

    recorder.start()

    let frame = 0
    let currentPhase: Phase = hookVideo ? 'hook' : 'main'
    let phaseStarted = false

    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval)
        recorder.stop()
        return
      }

      // Determine phase
      if (frame < hookFrames && hookVideo) {
        currentPhase = 'hook'
      } else if (frame < hookFrames + mainFrames) {
        currentPhase = 'main'
      } else {
        currentPhase = 'cta'
      }

      if (currentPhase === 'hook' && hookVideo) {
        // Start hook video playback
        if (!phaseStarted) {
          hookVideo.play()
          phaseStarted = true
        }
        // Draw hook card frame
        drawMediaCover(ctx, hookVideo, WIDTH, HEIGHT)

      } else if (currentPhase === 'main') {
        // Start main video playback
        if (!phaseStarted || (frame === hookFrames && hookVideo)) {
          mainVideo.play()
          phaseStarted = true
        }
        // Draw main video
        drawMediaCover(ctx, mainVideo, WIDTH, HEIGHT)

        // Draw subtitle overlay if phrases exist
        if (phraseCount > 0) {
          drawSubtitleOverlay(ctx, frame, phrases, phraseTiming, config.handle)
        }

      } else if (currentPhase === 'cta' && ctaVideo) {
        // Start CTA video playback
        if (frame === hookFrames + mainFrames) {
          mainVideo.pause()
          ctaVideo.play()
        }
        drawMediaCover(ctx, ctaVideo, WIDTH, HEIGHT)
      }

      frame++
    }, 1000 / FPS)
  })
}

/** Draw video/image covering canvas (object-fit: cover) */
function drawMediaCover(ctx: CanvasRenderingContext2D, media: HTMLVideoElement, w: number, h: number) {
  const mw = media.videoWidth
  const mh = media.videoHeight
  if (mw === 0 || mh === 0) {
    ctx.fillStyle = '#0d0d1a'
    ctx.fillRect(0, 0, w, h)
    return
  }
  const ratio = Math.max(w / mw, h / mh)
  const nw = mw * ratio
  const nh = mh * ratio
  ctx.drawImage(media, (w - nw) / 2, (h - nh) / 2, nw, nh)
}

/** Draw subtitle overlay with arc colors and fade animation — same logic as renderReelsConexao */
function drawSubtitleOverlay(
  ctx: CanvasRenderingContext2D,
  frame: number,
  phrases: ScriptPhrase[],
  timing: { startFrame: number; endFrame: number }[],
  handle?: string,
) {
  // Find current phrase
  let phraseIdx = -1
  for (let i = timing.length - 1; i >= 0; i--) {
    if (frame >= timing[i].startFrame) { phraseIdx = i; break }
  }
  if (phraseIdx < 0 || phraseIdx >= phrases.length) return

  const phrase = phrases[phraseIdx]
  const { startFrame, endFrame } = timing[phraseIdx]
  const phraseDurationFrames = endFrame - startFrame
  const frameInPhrase = frame - startFrame
  const phraseProgress = phraseDurationFrames > 0 ? frameInPhrase / phraseDurationFrames : 0

  // Dark gradient at bottom
  const gradH = HEIGHT * 0.35
  const grad = ctx.createLinearGradient(0, HEIGHT - gradH, 0, HEIGHT)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.4, 'rgba(0,0,0,0.4)')
  grad.addColorStop(1, 'rgba(0,0,0,0.8)')
  ctx.fillStyle = grad
  ctx.fillRect(0, HEIGHT - gradH, WIDTH, gradH)

  // Arc color
  const highlightColor = ARC_HIGHLIGHT_COLORS[phrase.arc] || '#d4a574'

  const fontSize = 48
  const textY = HEIGHT - HEIGHT * 0.14
  const handleY = textY - fontSize * 1.8

  // Handle
  if (handle) {
    ctx.font = `500 ${fontSize * 0.45}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(handle, WIDTH / 2, handleY)
  }

  // Fade in/out
  const fadeAlpha = Math.min(1, phraseProgress * 5)
  const fadeOut = phraseProgress > 0.85 ? Math.max(0, 1 - (phraseProgress - 0.85) / 0.15) : 1
  const alpha = fadeAlpha * fadeOut

  // Draw phrase words with keyword highlighting
  const words = phrase.phrase.split(/\s+/)
  ctx.font = `900 ${fontSize}px Inter, sans-serif`
  ctx.textBaseline = 'middle'

  // Check if text fits in one line, if not wrap
  const maxWidth = WIDTH * 0.85
  const lines = wrapText(ctx, phrase.phrase, maxWidth)
  const lineH = fontSize * 1.3

  if (lines.length === 1) {
    // Single line — render word by word with keyword colors
    const wordWidths = words.map(w => ctx.measureText(w + ' ').width)
    const totalWidth = wordWidths.reduce((a, b) => a + b, 0)
    let startX = (WIDTH - totalWidth) / 2

    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
    const kwList = phrase.keywords.split(',').map(k => k.trim())

    words.forEach((word, wi) => {
      const wordNorm = normalize(word)
      const isKeyword = kwList.some(kw => {
        const kwNorm = normalize(kw)
        return kwNorm.length > 0 && (wordNorm === kwNorm || wordNorm.includes(kwNorm))
      })
      ctx.fillStyle = isKeyword
        ? hexToRgba(highlightColor, alpha)
        : hexToRgba('#ffffff', alpha)
      ctx.textAlign = 'left'
      ctx.fillText(word, startX, textY)
      startX += wordWidths[wi]
    })
  } else {
    // Multi-line — render line by line
    ctx.textAlign = 'center'
    const startY = textY - ((lines.length - 1) * lineH) / 2
    lines.forEach((line, i) => {
      ctx.fillStyle = hexToRgba('#ffffff', alpha)
      ctx.fillText(line, WIDTH / 2, startY + i * lineH)
    })
  }
}
