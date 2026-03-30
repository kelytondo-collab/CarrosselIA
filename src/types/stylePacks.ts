// ── AUTOR.IA Style Packs ──
// 3 estilos visuais que o especialista escolhe no perfil como padrao

export type StylePackId = 'livre' | 'presenca-dourada' | 'diario-artesanal' | 'impacto-editorial'

export type SlideVariant =
  // Presenca Dourada
  | 'gold-cover' | 'gold-dark' | 'gold-light' | 'gold-checklist' | 'gold-cta'
  // Diario Artesanal
  | 'craft-cover' | 'craft-kraft' | 'craft-paper' | 'craft-cta'
  // Impacto Editorial
  | 'edit-cover' | 'edit-black' | 'edit-accent' | 'edit-white' | 'edit-photo' | 'edit-cta'

export interface StyleSlideConfig {
  variant: SlideVariant
  role: 'cover' | 'content' | 'checklist' | 'cta'
}

export interface StylePackConfig {
  id: StylePackId
  name: string
  description: string
  // Fonts
  titleFont: string
  bodyFont: string
  handwritingFont?: string
  // Default palette (user can override primary/accent)
  palette: {
    dark: string       // dark slide bg
    light: string      // light slide bg
    accent: string     // accent color (gold, amber, red)
    accentSoft: string // accent at low opacity
    textDark: string   // text on light bg
    textLight: string  // text on dark bg
    textMuted: string  // secondary text
  }
  // Slide sequence for a 6-slide carousel
  sequence6: StyleSlideConfig[]
  // Slide sequence for an 8-slide carousel
  sequence8: StyleSlideConfig[]
  // Whether this style uses photos in content slides
  usesPhotosInContent: boolean
  // Decorative elements
  hasAvatar: boolean
  hasSwipeButton: boolean
  hasSlideCounter: boolean
  hasWatermark: boolean
}

export interface StylePackSelection {
  packId: StylePackId
  // User overrides
  accentColor?: string   // override the default accent
  expertPhoto?: string   // base64 photo for cover/CTA
}
