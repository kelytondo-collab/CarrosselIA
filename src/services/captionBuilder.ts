/**
 * captionBuilder.ts
 * Builds Instagram caption from script/recording data.
 * Hook + corpo + CTA + hashtags → texto final pronto pra colar.
 */

export interface CaptionInput {
  hook: string
  body?: string
  cta?: string
  handle?: string
  hashtags?: string[]
}

const DEFAULT_HASHTAGS = [
  '#mentoresdejornada',
  '#negociocomIA',
  '#especialista',
  '#transformacao',
]

/**
 * Build a ready-to-paste Instagram caption.
 */
export function buildCaption(input: CaptionInput): string {
  const parts: string[] = []

  // Hook line (bold/impactful)
  if (input.hook) {
    parts.push(input.hook.toUpperCase())
    parts.push('')
  }

  // Body
  if (input.body) {
    parts.push(input.body)
    parts.push('')
  }

  // CTA
  if (input.cta) {
    parts.push(`👉 ${input.cta}`)
    parts.push('')
  }

  // Handle
  if (input.handle) {
    parts.push(input.handle)
    parts.push('')
  }

  // Hashtags
  const tags = input.hashtags && input.hashtags.length > 0 ? input.hashtags : DEFAULT_HASHTAGS
  parts.push(tags.join(' '))

  return parts.join('\n').trim()
}

/**
 * Build caption from parsed script phrases.
 */
export function buildCaptionFromScript(
  hook: string,
  phrases: { phrase: string; section: string }[],
  handle?: string,
): string {
  // Body = middle phrases (not hook, not CTA)
  const bodyPhrases = phrases.filter((_, i) => {
    if (i === 0) return false // skip hook
    const sec = phrases[i].section.toLowerCase()
    if (sec.includes('cta') || sec.includes('convite') || sec.includes('fechamento')) return false
    return true
  })

  const body = bodyPhrases.map(p => p.phrase).join('\n')

  // CTA = last phrase if it's a CTA section
  const last = phrases[phrases.length - 1]
  const cta = last && /cta|convite|fechamento/i.test(last.section) ? last.phrase : ''

  return buildCaption({ hook, body, cta, handle })
}
