/**
 * Browser-based video renderer.
 * Uses HTML/CSS animations → Canvas → MediaRecorder → WebM.
 * Optional mp4-muxer for WebM→MP4 conversion if available.
 */

export interface VideoConfig {
  width: number
  height: number
  fps: number
  durationMs: number
}

export interface QuoteVideoConfig extends VideoConfig {
  text: string
  fontFamily: string
  fontSize: number
  textColor: string
  background: string // CSS gradient (fallback)
  backgroundImage?: string // data URL for static image (IA or uploaded)
  backgroundVideoUrl?: string // blob URL for video background
  animationType: 'word-by-word' | 'line-by-line' | 'fade-in'
  expertPhoto?: string // base64 circle photo
  brand?: string
}

export interface ReelsConexaoPhrase {
  order: number
  phrase: string
  keywords: string[]
  arc: string
}

export interface ReelsConexaoConfig extends VideoConfig {
  phrases: ReelsConexaoPhrase[]
  backgroundVideoUrl: string
  handle?: string          // @username
  fontFamily: string
  fontSize: number
  textColor: string
  highlightColor: string   // keyword color (amber/yellow)
  showTranslation?: boolean
  translations?: string[]  // optional translation per phrase
}

export interface CarouselReelConfig extends VideoConfig {
  slides: { headline: string; subtitle: string; background: string; backgroundImage?: string }[]
  fontFamily: string
  textColor: string
  transitionType: 'fade' | 'slide-left' | 'slide-up'
  secondsPerSlide: number
  fontScale?: number
}

/** Preload an image from data URL or blob URL */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem de fundo'))
    img.src = src
  })
}

/** Preload a video from blob URL */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = src
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.oncanplaythrough = () => resolve(video)
    video.onerror = () => reject(new Error('Falha ao carregar video de fundo'))
    video.load()
  })
}

/** Draw image/video covering the canvas (object-fit: cover) */
function drawMediaCover(ctx: CanvasRenderingContext2D, media: HTMLImageElement | HTMLVideoElement, w: number, h: number) {
  const mw = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth || media.width
  const mh = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight || media.height
  if (mw === 0 || mh === 0) return
  const ratio = Math.max(w / mw, h / mh)
  const nw = mw * ratio
  const nh = mh * ratio
  ctx.drawImage(media, (w - nw) / 2, (h - nh) / 2, nw, nh)
}

/**
 * Render a quote video in the browser
 * Returns a Blob (WebM or MP4)
 */
export async function renderQuoteVideo(config: QuoteVideoConfig): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = config.width
  canvas.height = config.height
  const ctx = canvas.getContext('2d')!

  // Preload background assets
  let bgImage: HTMLImageElement | null = null
  let bgVideo: HTMLVideoElement | null = null

  if (config.backgroundVideoUrl) {
    bgVideo = await loadVideo(config.backgroundVideoUrl)
    bgVideo.currentTime = 0
    await bgVideo.play()
  } else if (config.backgroundImage) {
    bgImage = await loadImage(config.backgroundImage)
  }

  const stream = canvas.captureStream(config.fps)
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const totalFrames = Math.ceil((config.durationMs / 1000) * config.fps)

  // Parse text into words or lines
  const units = config.animationType === 'line-by-line'
    ? config.text.split('\n').filter(Boolean)
    : config.text.split(/\s+/).filter(Boolean)

  return new Promise((resolve) => {
    recorder.onstop = () => {
      if (bgVideo) { bgVideo.pause(); bgVideo.src = '' }
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    recorder.start()

    let frame = 0
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval)
        recorder.stop()
        return
      }

      const progress = frame / totalFrames

      // Draw background
      if (bgVideo) {
        drawMediaCover(ctx, bgVideo, config.width, config.height)
        // Dark overlay for text readability
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, config.width, config.height)
      } else if (bgImage) {
        drawMediaCover(ctx, bgImage, config.width, config.height)
        // Dark overlay for text readability
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, config.width, config.height)
      } else {
        drawGradientBackground(ctx, config.width, config.height, config.background)
      }

      // Calculate visible units based on progress
      const visibleCount = config.animationType === 'fade-in'
        ? units.length // all visible, opacity animates
        : Math.ceil(progress * units.length * 1.2) // reveal over time

      const centerY = config.height / 2
      const lineHeight = config.fontSize * 1.4

      ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (config.animationType === 'word-by-word') {
        // Build visible text word by word
        const visibleWords = units.slice(0, Math.min(visibleCount, units.length))
        const lines = wrapText(ctx, visibleWords.join(' '), config.width * 0.8)
        const startY = centerY - (lines.length * lineHeight) / 2

        lines.forEach((line, i) => {
          const alpha = i === lines.length - 1 && visibleCount <= units.length ? 0.6 + progress * 0.4 : 1
          ctx.fillStyle = hexToRgba(config.textColor, alpha)
          ctx.fillText(line, config.width / 2, startY + i * lineHeight)
        })
      } else if (config.animationType === 'line-by-line') {
        const visibleLines = units.slice(0, Math.min(visibleCount, units.length))
        const startY = centerY - (visibleLines.length * lineHeight) / 2

        visibleLines.forEach((line, i) => {
          const alpha = i === visibleLines.length - 1 ? Math.min(1, (progress * units.length - i) * 2) : 1
          ctx.fillStyle = hexToRgba(config.textColor, Math.max(0, alpha))
          ctx.fillText(line, config.width / 2, startY + i * lineHeight)
        })
      } else {
        // fade-in: all text, opacity animates
        const opacity = Math.min(1, progress * 2)
        const lines = wrapText(ctx, config.text, config.width * 0.8)
        const startY = centerY - (lines.length * lineHeight) / 2

        ctx.fillStyle = hexToRgba(config.textColor, opacity)
        lines.forEach((line, i) => {
          ctx.fillText(line, config.width / 2, startY + i * lineHeight)
        })
      }

      // Expert photo circle
      if (config.expertPhoto) {
        // Draw at bottom center
        const photoSize = 80
        const photoY = config.height - 120
        ctx.save()
        ctx.beginPath()
        ctx.arc(config.width / 2, photoY, photoSize / 2, 0, Math.PI * 2)
        ctx.clip()
        // Would need to preload image — simplified version draws placeholder circle
        ctx.fillStyle = hexToRgba(config.textColor, 0.2)
        ctx.fill()
        ctx.restore()
      }

      // Brand
      if (config.brand) {
        ctx.font = `600 ${config.fontSize * 0.3}px ${config.fontFamily}`
        ctx.fillStyle = hexToRgba(config.textColor, 0.5)
        ctx.textAlign = 'center'
        ctx.fillText(config.brand, config.width / 2, config.height - 40)
      }

      frame++
    }, 1000 / config.fps)
  })
}

/**
 * Render a carousel reel (auto-scrolling slides)
 */
export async function renderCarouselReel(config: CarouselReelConfig): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = config.width
  canvas.height = config.height
  const ctx = canvas.getContext('2d')!

  // Pre-load all slide background images
  const slideImages: (HTMLImageElement | null)[] = await Promise.all(
    config.slides.map(s => s.backgroundImage ? loadImage(s.backgroundImage).catch(() => null) : Promise.resolve(null))
  )

  const stream = canvas.captureStream(config.fps)
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const totalDurationMs = config.slides.length * config.secondsPerSlide * 1000
  const totalFrames = Math.ceil((totalDurationMs / 1000) * config.fps)
  const framesPerSlide = Math.ceil(config.secondsPerSlide * config.fps)
  const transitionFrames = Math.ceil(config.fps * 0.5) // 0.5s transition

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    recorder.start()

    let frame = 0
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval)
        recorder.stop()
        return
      }

      const slideIndex = Math.floor(frame / framesPerSlide)
      const frameInSlide = frame % framesPerSlide
      const curIdx = Math.min(slideIndex, config.slides.length - 1)
      const nxtIdx = Math.min(slideIndex + 1, config.slides.length - 1)
      const currentSlide = config.slides[curIdx]
      const nextSlide = config.slides[nxtIdx]
      const curImg = slideImages[curIdx]
      const nxtImg = slideImages[nxtIdx]

      // Check if in transition zone
      const isTransitioning = frameInSlide >= framesPerSlide - transitionFrames && slideIndex < config.slides.length - 1
      const transitionProgress = isTransitioning
        ? (frameInSlide - (framesPerSlide - transitionFrames)) / transitionFrames
        : 0

      if (isTransitioning && config.transitionType === 'fade') {
        drawSlide(ctx, currentSlide, config, 1 - transitionProgress, curImg)
        drawSlide(ctx, nextSlide, config, transitionProgress, nxtImg)
      } else if (isTransitioning && config.transitionType === 'slide-left') {
        const offset = transitionProgress * config.width
        ctx.save()
        ctx.translate(-offset, 0)
        drawSlide(ctx, currentSlide, config, 1, curImg)
        ctx.translate(config.width, 0)
        drawSlide(ctx, nextSlide, config, 1, nxtImg)
        ctx.restore()
      } else {
        drawSlide(ctx, currentSlide, config, 1, curImg)
      }

      frame++
    }, 1000 / config.fps)
  })
}

/**
 * Render a Reels Conexão video:
 * B-roll video background + animated phrase captions at the bottom + keywords highlighted
 * Audio from the original video is preserved via AudioContext mixing.
 */
export async function renderReelsConexao(config: ReelsConexaoConfig): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = config.width
  canvas.height = config.height
  const ctx = canvas.getContext('2d')!

  // Load background video
  const bgVideo = await loadVideo(config.backgroundVideoUrl)
  bgVideo.muted = false // we want audio
  bgVideo.currentTime = 0

  // Setup audio capture from the video
  const audioCtx = new AudioContext()
  const source = audioCtx.createMediaElementSource(bgVideo)
  const audioDest = audioCtx.createMediaStreamDestination()
  source.connect(audioDest)
  source.connect(audioCtx.destination) // also play locally (optional)

  // Combine canvas video stream + audio stream
  const canvasStream = canvas.captureStream(config.fps)
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ])

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 5_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const totalFrames = Math.ceil((config.durationMs / 1000) * config.fps)
  const phraseCount = config.phrases.length
  const framesPerPhrase = Math.floor(totalFrames / phraseCount)

  await bgVideo.play()

  return new Promise((resolve) => {
    recorder.onstop = () => {
      bgVideo.pause()
      bgVideo.src = ''
      audioCtx.close()
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    recorder.start()

    let frame = 0
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval)
        recorder.stop()
        return
      }

      // Draw background video
      drawMediaCover(ctx, bgVideo, config.width, config.height)

      // Dark gradient at bottom for text readability
      const gradH = config.height * 0.35
      const grad = ctx.createLinearGradient(0, config.height - gradH, 0, config.height)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(0.4, 'rgba(0,0,0,0.4)')
      grad.addColorStop(1, 'rgba(0,0,0,0.8)')
      ctx.fillStyle = grad
      ctx.fillRect(0, config.height - gradH, config.width, gradH)

      // Determine which phrase to show
      const phraseIdx = Math.min(Math.floor(frame / framesPerPhrase), phraseCount - 1)
      const phrase = config.phrases[phraseIdx]
      const frameInPhrase = frame - phraseIdx * framesPerPhrase
      const phraseProgress = frameInPhrase / framesPerPhrase

      // Text position: bottom area
      const textY = config.height - config.height * 0.14
      const handleY = textY - config.fontSize * 1.8

      // Draw @ handle
      if (config.handle) {
        ctx.font = `500 ${config.fontSize * 0.45}px ${config.fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText(config.handle, config.width / 2, handleY)
      }

      // Draw phrase with keyword highlights
      const words = phrase.phrase.split(/\s+/)
      ctx.font = `900 ${config.fontSize}px ${config.fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Calculate total width for centering
      const wordWidths = words.map(w => ctx.measureText(w + ' ').width)
      const totalWidth = wordWidths.reduce((a, b) => a + b, 0)
      let startX = (config.width - totalWidth) / 2

      // Fade in effect
      const fadeAlpha = Math.min(1, phraseProgress * 4) // fade in over 25% of phrase time
      const fadeOut = phraseProgress > 0.85 ? Math.max(0, 1 - (phraseProgress - 0.85) / 0.15) : 1
      const alpha = fadeAlpha * fadeOut

      words.forEach((word, wi) => {
        const isKeyword = phrase.keywords.some(kw =>
          word.toLowerCase().replace(/[^a-záàâãéèêíïóôõúùç]/g, '') === kw.toLowerCase()
        )
        ctx.fillStyle = isKeyword
          ? hexToRgba(config.highlightColor, alpha)
          : hexToRgba(config.textColor, alpha)

        ctx.textAlign = 'left'
        ctx.fillText(word, startX, textY)
        startX += wordWidths[wi]
      })

      // Optional translation line below
      if (config.showTranslation && config.translations?.[phraseIdx]) {
        ctx.font = `700 ${config.fontSize * 0.5}px ${config.fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillStyle = hexToRgba(config.highlightColor, alpha * 0.8)
        ctx.fillText(
          config.translations[phraseIdx].toUpperCase(),
          config.width / 2,
          textY + config.fontSize * 1.1
        )
      }

      frame++
    }, 1000 / config.fps)
  })
}

// ── Helpers ──

function drawGradientBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cssGradient: string) {
  // Parse simple linear gradient — fallback to dark
  const colorMatch = cssGradient.match(/#[0-9a-fA-F]{6}/g)
  if (colorMatch && colorMatch.length >= 2) {
    const gradient = ctx.createLinearGradient(0, 0, w * 0.5, h)
    gradient.addColorStop(0, colorMatch[0])
    gradient.addColorStop(1, colorMatch[1])
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = '#0f0a1a'
  }
  ctx.fillRect(0, 0, w, h)
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  slide: { headline: string; subtitle: string; background: string; backgroundImage?: string },
  config: CarouselReelConfig,
  opacity: number,
  bgImg?: HTMLImageElement | null,
) {
  ctx.save()
  ctx.globalAlpha = opacity

  if (bgImg) {
    drawMediaCover(ctx, bgImg, config.width, config.height)
    // Dark overlay for text readability
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, config.width, config.height)
  } else {
    drawGradientBackground(ctx, config.width, config.height, slide.background)
  }

  const scale = config.fontScale || 1.0
  const pad = config.width * 0.1
  const centerY = config.height / 2
  const headlineSize = Math.min(48, config.width * 0.06) * scale
  const subtitleSize = headlineSize * 0.55

  // Headline
  ctx.font = `900 ${headlineSize}px ${config.fontFamily}`
  ctx.fillStyle = config.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const headLines = wrapText(ctx, slide.headline, config.width - pad * 2)
  const lineH = headlineSize * 1.2
  const startY = centerY - (headLines.length * lineH) / 2 - subtitleSize

  headLines.forEach((line, i) => {
    ctx.fillText(line, config.width / 2, startY + i * lineH)
  })

  // Subtitle
  ctx.font = `400 ${subtitleSize}px ${config.fontFamily}`
  ctx.fillStyle = hexToRgba(config.textColor, 0.8)
  const subLines = wrapText(ctx, slide.subtitle, config.width - pad * 2)
  const subStartY = startY + headLines.length * lineH + 16
  subLines.forEach((line, i) => {
    ctx.fillText(line, config.width / 2, subStartY + i * (subtitleSize * 1.5))
  })

  ctx.restore()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
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
