/**
 * hookCtaRenderer.ts
 * Renders hook card (3s) and CTA card (8s) as canvas-based video blobs.
 * Dark background + gold text with fade-in animation.
 */

const HOOK_DURATION_MS = 3000
const CTA_DURATION_MS = 8000
const FPS = 30
const WIDTH = 1080
const HEIGHT = 1920
const BG_COLOR = '#0d0d1a'

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

/**
 * Render a hook card (3s): dark bg + gold text fade-in.
 */
export async function renderHookCard(hookText: string, handle?: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(FPS)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9' : 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const totalFrames = Math.ceil((HOOK_DURATION_MS / 1000) * FPS)

  return new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.start()

    let frame = 0
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval)
        recorder.stop()
        return
      }
      const progress = frame / totalFrames

      // Background
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Subtle radial glow behind text
      const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, WIDTH * 0.6)
      glow.addColorStop(0, 'rgba(212,165,116,0.06)')
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Fade-in alpha (0→1 over first 40% of duration)
      const alpha = Math.min(1, progress / 0.4)

      // Hook text
      const fontSize = 68
      ctx.font = `900 ${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(212,165,116,${alpha})`

      const lines = wrapText(ctx, hookText, WIDTH * 0.8)
      const lineH = fontSize * 1.3
      const startY = HEIGHT / 2 - ((lines.length - 1) * lineH) / 2

      lines.forEach((line, i) => {
        ctx.fillText(line, WIDTH / 2, startY + i * lineH)
      })

      // Handle
      if (handle) {
        ctx.font = `500 28px Inter, sans-serif`
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`
        ctx.fillText(handle, WIDTH / 2, HEIGHT - 120)
      }

      frame++
    }, 1000 / FPS)
  })
}

/**
 * Render a CTA card (8s): @handle + glow animation.
 */
export async function renderCtaCard(handle: string, ctaText?: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(FPS)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9' : 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const totalFrames = Math.ceil((CTA_DURATION_MS / 1000) * FPS)

  return new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.start()

    let frame = 0
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval)
        recorder.stop()
        return
      }
      const progress = frame / totalFrames

      // Background
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Animated glow (pulsing)
      const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4)
      const glowRadius = WIDTH * (0.3 + pulse * 0.15)
      const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, glowRadius)
      glow.addColorStop(0, `rgba(212,165,116,${0.08 + pulse * 0.04})`)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      // Fade-in
      const alpha = Math.min(1, progress / 0.2)

      // CTA text (if provided)
      if (ctaText) {
        const ctaFontSize = 48
        ctx.font = `700 ${ctaFontSize}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`

        const lines = wrapText(ctx, ctaText, WIDTH * 0.8)
        const lineH = ctaFontSize * 1.3
        const startY = HEIGHT / 2 - 60 - ((lines.length - 1) * lineH) / 2

        lines.forEach((line, i) => {
          ctx.fillText(line, WIDTH / 2, startY + i * lineH)
        })
      }

      // Handle (large, gold, centered)
      ctx.font = `900 56px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(212,165,116,${alpha})`
      ctx.fillText(handle, WIDTH / 2, ctaText ? HEIGHT / 2 + 80 : HEIGHT / 2)

      // Decorative line under handle
      const lineWidth = ctx.measureText(handle).width * 0.6
      ctx.strokeStyle = `rgba(212,165,116,${alpha * 0.3})`
      ctx.lineWidth = 2
      ctx.beginPath()
      const lineY = ctaText ? HEIGHT / 2 + 110 : HEIGHT / 2 + 40
      ctx.moveTo(WIDTH / 2 - lineWidth / 2, lineY)
      ctx.lineTo(WIDTH / 2 + lineWidth / 2, lineY)
      ctx.stroke()

      frame++
    }, 1000 / FPS)
  })
}

export { HOOK_DURATION_MS, CTA_DURATION_MS }
