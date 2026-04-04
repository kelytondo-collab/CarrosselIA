/**
 * scriptParser.ts
 * Parses video_script (timecoded roteiro from Luminae) into phrase array
 * for the TeleprompterRecorder.
 *
 * Input format example:
 *   [0:00-0:03] Hook: Você não precisa de mais conhecimento
 *   [0:03-0:08] Validação: O problema é que você sabe demais e faz de menos
 *   [0:08-0:15] Desenvolvimento: Eu peguei o que sabia e transformei em método
 *   [0:15-0:20] CTA: Link na bio pra começar agora
 */

export interface ScriptPhrase {
  phrase: string
  keywords: string
  arc: string
  startMs: number
  endMs: number
  section: string // Hook, Validação, Desenvolvimento, CTA, etc.
}

export interface ParsedScript {
  hook: string          // first phrase (Hook section)
  phrases: ScriptPhrase[]
  ctaText: string       // last phrase if CTA section
  totalDurationMs: number
}

// Map section names → arc emotional colors
const SECTION_ARC_MAP: Record<string, string> = {
  hook: 'fachada',
  abertura: 'fachada',
  'validação': 'contraste',
  validacao: 'contraste',
  contraste: 'contraste',
  dor: 'contraste',
  problema: 'contraste',
  desenvolvimento: 'verdade',
  virada: 'verdade',
  'método': 'verdade',
  metodo: 'verdade',
  prova: 'verdade',
  cta: 'convite',
  convite: 'convite',
  fechamento: 'convite',
}

function parseTimecode(tc: string): number {
  // "0:03" → 3000ms, "1:30" → 90000ms
  const parts = tc.trim().split(':')
  if (parts.length === 2) {
    return (parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)) * 1000
  }
  if (parts.length === 3) {
    return (parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)) * 1000
  }
  return 0
}

function extractKeywords(text: string): string {
  // Extract 2-3 most impactful words (capitalized or longer words)
  const words = text.split(/\s+/).filter(w => w.length > 4)
  const important = words
    .filter(w => /^[A-ZÀ-Ú]/.test(w) || w.length > 6)
    .slice(0, 3)
  return important.length > 0 ? important.join(', ') : words.slice(0, 2).join(', ')
}

function getSectionArc(section: string): string {
  const key = section.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return SECTION_ARC_MAP[key] || 'verdade'
}

/**
 * Parse a video_script string with timecodes into structured phrases.
 */
export function parseVideoScript(script: string): ParsedScript {
  const lines = script.split('\n').map(l => l.trim()).filter(Boolean)
  const phrases: ScriptPhrase[] = []

  // Regex: [0:00-0:03] Section: Text content
  const timecodedLine = /^\[(\d+:\d{2}(?::\d{2})?)\s*-\s*(\d+:\d{2}(?::\d{2})?)\]\s*([^:]+?):\s*(.+)$/
  // Fallback: Section: Text (no timecodes)
  const sectionLine = /^([A-Za-zÀ-ú]+)\s*:\s*(.+)$/

  let hasTimecodes = false

  for (const line of lines) {
    const tcMatch = line.match(timecodedLine)
    if (tcMatch) {
      hasTimecodes = true
      const startMs = parseTimecode(tcMatch[1])
      const endMs = parseTimecode(tcMatch[2])
      const section = tcMatch[3].trim()
      const text = tcMatch[4].trim()
      phrases.push({
        phrase: text,
        keywords: extractKeywords(text),
        arc: getSectionArc(section),
        startMs,
        endMs,
        section,
      })
      continue
    }

    const secMatch = line.match(sectionLine)
    if (secMatch) {
      const section = secMatch[1].trim()
      const text = secMatch[2].trim()
      phrases.push({
        phrase: text,
        keywords: extractKeywords(text),
        arc: getSectionArc(section),
        startMs: 0,
        endMs: 0,
        section,
      })
      continue
    }

    // Plain text line — treat as development section
    if (line.length > 5) {
      phrases.push({
        phrase: line,
        keywords: extractKeywords(line),
        arc: 'verdade',
        startMs: 0,
        endMs: 0,
        section: 'Desenvolvimento',
      })
    }
  }

  // If no timecodes, distribute evenly (3s per phrase default)
  if (!hasTimecodes && phrases.length > 0) {
    const perPhrase = 3000
    phrases.forEach((p, i) => {
      p.startMs = i * perPhrase
      p.endMs = (i + 1) * perPhrase
    })
  }

  const hook = phrases.length > 0 ? phrases[0].phrase : ''
  const lastPhrase = phrases[phrases.length - 1]
  const ctaText = lastPhrase?.section.toLowerCase().includes('cta') ? lastPhrase.phrase : ''
  const totalDurationMs = phrases.length > 0 ? phrases[phrases.length - 1].endMs : 0

  return { hook, phrases, ctaText, totalDurationMs }
}

/**
 * Convert ScriptPhrases to TeleprompterRecorder format.
 */
export function toTeleprompterPhrases(phrases: ScriptPhrase[]): { phrase: string; keywords: string; arc: string }[] {
  return phrases.map(p => ({
    phrase: p.phrase,
    keywords: p.keywords,
    arc: p.arc,
  }))
}
