// Types for Luminae content import

export interface LuminaeSlide {
  headline: string
  subtitle: string
  emotion?: string
  visualPrompt?: string
}

export interface LuminaeCaption {
  hook: string
  body: string
  cta: string
  hashtags?: string
  altText?: string
}

export interface LuminaeImportData {
  slides: LuminaeSlide[]
  caption: LuminaeCaption
  strategy?: {
    persona?: string
    painPoint?: string
    desire?: string
    narrativePath?: string
    consciousnessLevel?: string
    niche?: string
    hook?: string
  }
  gatilho?: string
  nivelConsciencia?: string
  tipo?: string // carrossel, post, stories
  format?: 'json' | 'marcadores' | 'texto-livre'
}

export type InputMode = 'luminae' | 'colar' | 'criar'
