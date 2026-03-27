import type { LuminaeImportData, LuminaeSlide, LuminaeCaption } from '../types/luminae'

/**
 * Luminae Parser — Detects format and extracts content WITHOUT rewriting.
 * Supports: JSON structured, text with markers, free text
 */

// Try parsing as JSON (from Luminae export)
function tryParseJSON(text: string): LuminaeImportData | null {
  try {
    const cleaned = text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const data = JSON.parse(cleaned)

    // Luminae JSON format: { slides: [...], caption: {...} }
    if (data.slides && Array.isArray(data.slides)) {
      const slides: LuminaeSlide[] = data.slides.map((s: any, i: number) => ({
        headline: s.headline || s.titulo || s.title || `Slide ${i + 1}`,
        subtitle: s.subtitle || s.subtitulo || s.body || s.texto || '',
        emotion: s.emotion || s.emocao || '',
        visualPrompt: s.visualPrompt || s.visual || '',
      }))

      const rawCaption = data.caption || data.legenda || {}
      const caption: LuminaeCaption = {
        hook: rawCaption.hook || rawCaption.gancho || '',
        body: rawCaption.body || rawCaption.corpo || '',
        cta: rawCaption.cta || rawCaption.chamada || '',
        hashtags: rawCaption.hashtags || '',
        altText: rawCaption.altText || rawCaption.alt || '',
      }

      return {
        slides,
        caption,
        strategy: data.strategy || data.estrategia || undefined,
        gatilho: data.gatilho || data.trigger || undefined,
        nivelConsciencia: data.nivelConsciencia || data.consciousnessLevel || undefined,
        tipo: data.tipo || data.type || 'carrossel',
        format: 'json',
      }
    }

    // Alternative: { titulo, corpo, cta } (single post from Luminae)
    if (data.titulo || data.headline || data.title) {
      return {
        slides: [{
          headline: data.titulo || data.headline || data.title,
          subtitle: data.corpo || data.body || data.subtitle || data.subtitulo || '',
        }],
        caption: {
          hook: data.hook || data.gancho || data.titulo || '',
          body: data.corpo || data.body || '',
          cta: data.cta || data.chamada || '',
          hashtags: data.hashtags || '',
        },
        tipo: 'post',
        format: 'json',
      }
    }

    return null
  } catch {
    return null
  }
}

// Try parsing text with markers (--- SLIDE 1 ---, ## Slide 1, etc.)
function tryParseMarkers(text: string): LuminaeImportData | null {
  // Pattern: "SLIDE 1" or "--- SLIDE 1 ---" or "## Slide 1" or "[Slide 1]"
  const slidePattern = /(?:^|\n)(?:---\s*)?(?:#+\s*)?(?:\[?\s*)?(?:SLIDE|Slide|slide)\s*(\d+)\s*(?:\]?\s*)?(?:---)?(?:\s*\n)/gi
  const matches = [...text.matchAll(slidePattern)]

  if (matches.length < 2) return null

  const slides: LuminaeSlide[] = []

  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index || 0) + matches[i][0].length
    const end = i < matches.length - 1 ? matches[i + 1].index || text.length : text.length
    const content = text.slice(start, end).trim()

    // Split into headline (first line) and subtitle (rest)
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    const headline = lines[0] || `Slide ${i + 1}`
    const subtitle = lines.slice(1).join('\n')

    slides.push({ headline, subtitle })
  }

  // Look for caption section
  const captionMatch = text.match(/(?:LEGENDA|CAPTION|Caption|legenda)\s*:?\s*\n([\s\S]+?)$/i)
  const captionText = captionMatch ? captionMatch[1].trim() : ''

  const caption = parseCaptionFromText(captionText)

  return {
    slides,
    caption,
    format: 'marcadores',
  }
}

// Parse caption from free text
function parseCaptionFromText(text: string): LuminaeCaption {
  if (!text) return { hook: '', body: '', cta: '', hashtags: '' }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // First line = hook
  const hook = lines[0] || ''

  // Extract hashtags (last line if starts with #)
  let hashtags = ''
  let bodyLines = lines.slice(1)
  if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].startsWith('#')) {
    hashtags = bodyLines.pop() || ''
  }

  // Look for CTA patterns
  let cta = ''
  const ctaPatterns = [/comenta?\s/i, /clica?\s/i, /link\s/i, /salva\s/i, /compartilh/i, /envi[ea]/i, /chama\s/i]
  for (let i = bodyLines.length - 1; i >= 0; i--) {
    if (ctaPatterns.some(p => p.test(bodyLines[i]))) {
      cta = bodyLines.splice(i).join('\n')
      break
    }
  }

  return {
    hook,
    body: bodyLines.join('\n'),
    cta,
    hashtags,
  }
}

// Split free text into slides by paragraphs
function splitTextIntoSlides(text: string, targetCount: number = 8): LuminaeSlide[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  if (paragraphs.length === 0) return []

  // If we have enough paragraphs, use them directly
  if (paragraphs.length >= targetCount) {
    return paragraphs.slice(0, targetCount).map((p, i) => {
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean)
      return {
        headline: lines[0] || `Slide ${i + 1}`,
        subtitle: lines.slice(1).join('\n'),
      }
    })
  }

  // Otherwise distribute content evenly
  const slides: LuminaeSlide[] = []
  const linesPerSlide = Math.ceil(paragraphs.length / targetCount)

  for (let i = 0; i < paragraphs.length; i += linesPerSlide) {
    const chunk = paragraphs.slice(i, i + linesPerSlide)
    const allLines = chunk.join('\n').split('\n').map(l => l.trim()).filter(Boolean)
    slides.push({
      headline: allLines[0] || `Slide ${slides.length + 1}`,
      subtitle: allLines.slice(1).join('\n'),
    })
  }

  return slides
}

/**
 * Main parser: detects format and extracts content
 */
export function parseLuminaeContent(text: string): LuminaeImportData | null {
  if (!text || !text.trim()) return null

  // 1. Try JSON
  const jsonResult = tryParseJSON(text)
  if (jsonResult) return jsonResult

  // 2. Try markers
  const markerResult = tryParseMarkers(text)
  if (markerResult) return markerResult

  // 3. Free text — just return raw for Gemini FORMAT mode
  return null
}

/**
 * Detect what format the pasted content is in
 */
export function detectContentFormat(text: string): 'json' | 'marcadores' | 'texto-livre' {
  if (!text || !text.trim()) return 'texto-livre'

  // JSON detection
  const trimmed = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return 'json' } catch { /* not json */ }
  }

  // Marker detection
  if (/(?:SLIDE|Slide|slide)\s*\d/i.test(text)) return 'marcadores'

  return 'texto-livre'
}

export { splitTextIntoSlides }
