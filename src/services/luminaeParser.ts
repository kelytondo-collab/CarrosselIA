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
      // Se tem visualText, usa como headline (texto da imagem) e content como legenda
      const hasVisualText = !!data.visualText
      return {
        slides: [{
          headline: hasVisualText ? data.visualText : (data.titulo || data.headline || data.title),
          subtitle: hasVisualText ? '' : (data.corpo || data.body || data.subtitle || data.subtitulo || ''),
        }],
        caption: {
          hook: data.visualText || data.hook || data.gancho || data.titulo || '',
          body: hasVisualText ? (data.content || data.corpo || data.body || '') : (data.corpo || data.body || ''),
          cta: data.cta || data.chamada || '',
          hashtags: Array.isArray(data.hashtags) ? data.hashtags.map((h: string) => `#${h.replace('#', '')}`).join(' ') : (data.hashtags || ''),
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

// Try parsing text with markers (--- SLIDE 1 ---, ## Slide 1, [Slide 1] Title, etc.)
function tryParseMarkers(text: string): LuminaeImportData | null {
  // Pattern: "[Slide 1] Title..." or "SLIDE 1\n" or "--- SLIDE 1 ---" or "## Slide 1"
  // Captures: group 1 = slide number, group 2 = optional inline title after marker
  const slidePattern = /(?:^|\n)(?:---\s*)?(?:#+\s*)?(?:\[?\s*)?(?:SLIDE|Slide|slide)\s*(\d+)\s*(?:\]?\s*)?(?:---)?[ \t]*(.*?)(?:\n|$)/gi
  const matches = [...text.matchAll(slidePattern)]

  if (matches.length < 2) return null

  const slides: LuminaeSlide[] = []

  for (let i = 0; i < matches.length; i++) {
    const matchEnd = (matches[i].index || 0) + matches[i][0].length
    const nextStart = i < matches.length - 1 ? matches[i + 1].index || text.length : text.length
    const inlineTitle = (matches[i][2] || '').trim()
    const contentAfter = text.slice(matchEnd, nextStart).trim()

    // If there's an inline title (e.g. "[Slide 1] My Title"), use it as headline
    // and the content below as subtitle
    let headline: string
    let subtitle: string

    if (inlineTitle) {
      headline = inlineTitle
      subtitle = contentAfter
    } else {
      // No inline title — first line of content is headline, rest is subtitle
      const lines = contentAfter.split('\n').map(l => l.trim()).filter(Boolean)
      headline = lines[0] || `Slide ${i + 1}`
      subtitle = lines.slice(1).join('\n')
    }

    slides.push({ headline, subtitle })
  }

  // Remove slides that are actually metadata (Keywords, hashtags at the end)
  // Check if last slide(s) contain only keywords/hashtags
  const lastSlideIdx = slides.length - 1
  let keywordsText = ''
  let hashtagsText = ''

  if (lastSlideIdx >= 0) {
    const lastContent = (slides[lastSlideIdx].headline + ' ' + slides[lastSlideIdx].subtitle).trim()
    // Check if last "slide" is actually keywords/hashtags section
    if (/^(Keywords|Palavras-chave)\s*:/i.test(lastContent) || /^#\w/.test(lastContent)) {
      const removed = slides.pop()!
      const fullText = (removed.headline + '\n' + removed.subtitle).trim()
      const keyMatch = fullText.match(/(?:Keywords|Palavras-chave)\s*:\s*(.+)/i)
      if (keyMatch) keywordsText = keyMatch[1].trim()
      const hashMatch = fullText.match(/(#\w[\w\S]*(?:\s+#\w[\w\S]*)*)/g)
      if (hashMatch) hashtagsText = hashMatch.join(' ')
    }
  }

  // Also check for trailing Keywords/hashtags after the last slide in the raw text
  const trailingMeta = text.match(/\n\s*(?:Keywords|Palavras-chave)\s*:\s*(.+?)(?:\n|$)/i)
  if (trailingMeta && !keywordsText) keywordsText = trailingMeta[1].trim()
  const trailingHash = text.match(/\n\s*(#\w[\w\S]*(?:\s+#\w[\w\S]*)*)\s*$/m)
  if (trailingHash && !hashtagsText) hashtagsText = trailingHash[1].trim()

  // Look for caption section
  const captionMatch = text.match(/(?:LEGENDA|CAPTION|Caption|legenda)\s*:?\s*\n([\s\S]+?)$/i)
  const captionText = captionMatch ? captionMatch[1].trim() : ''

  const caption = parseCaptionFromText(captionText || '')
  if (hashtagsText && !caption.hashtags) caption.hashtags = hashtagsText

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
