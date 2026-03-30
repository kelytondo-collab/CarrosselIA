export type Platform = 'instagram' | 'linkedin' | 'pinterest' | 'threads'
export type Tone = 'profissional' | 'descontraído' | 'inspirador' | 'urgente' | 'educativo' | 'provocador' | 'afetuoso'
export type Format = '1:1' | '9:16' | '4:5'
export type SlideCount = 5 | 7 | 8 | 10

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

export interface BrandFont {
  family: string
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting'
}

export interface BrandKit {
  colors: ColorPalette
  fonts: { title: BrandFont; body: BrandFont }
  logo?: string           // base64 (max ~50KB)
  photos: string[]         // base64 face photos (max 3)
}

export interface SpecialistProfile {
  id: string
  name: string
  photo_base64?: string
  niche?: string
  targetAudience?: string
  tone?: Tone
  bio?: string
  color_palette: ColorPalette
  brandKit?: BrandKit
  default_platform: Platform
  default_slide_count: SlideCount
  is_default: boolean
  created_at: string
  voiceBlueprint?: string
  preferred_font?: 'inter' | 'playfair' | 'georgia' | 'helvetica'
  instagramHandle?: string
  stylePackId?: 'livre' | 'presenca-dourada' | 'diario-artesanal' | 'impacto-editorial'
}

export interface ProjectInputs {
  projectName: string
  theme: string
  product: string
  objective: string
  investment: string
  baseText: string
  contextInfo: string
  tone: Tone
  niche: string
  platform: Platform
  slideCount: SlideCount
  profileId?: string
  expertPhotoBase64?: string // Foto do expert para image-to-image
}

export interface SlideStyle {
  titleSize?: number
  subtitleSize?: number
  textPosition?: 'top' | 'middle' | 'bottom'
  textAlign?: 'left' | 'center' | 'right'
  overlayOpacity?: number
  backgroundColor?: string
}

export interface SlideData {
  id: number
  headline: string
  subtitle: string
  visualPrompt: string
  emotion: string
  ctaType?: string
  imageUrl?: string
  isGeneratingImage: boolean
  imageError?: string
  style?: SlideStyle
}

export interface Strategy {
  persona: string
  painPoint: string
  desire: string
  narrativePath: string
  consciousnessLevel: string
  niche: string
  hook?: string
}

export interface Caption {
  hook: string
  body: string
  cta: string
  hashtags: string
  altText?: string
}

export interface ManyChatFlow {
  keyword: string
  flow1: string
  flow2: string | { step: string; message: string }[]
  flow3: string | { step: string; message: string }[]
}

export interface CarouselData {
  strategy: Strategy
  slides: SlideData[]
  caption: Caption
  manychat: ManyChatFlow
  seoKeywords?: string[]
  format?: Format
  generatedAt?: string
}

export type LayoutType = 'minimal' | 'editorial' | 'photo-left' | 'photo-right' | 'quote' | 'cta'

// ── Post Estático ──

export interface PostData {
  headline: string
  subtitle: string
  caption: Caption
  visualPrompt: string
  imageUrl?: string
  layout: LayoutType
  seoKeywords?: string[]
  generatedAt?: string
  clonePalette?: ColorPalette
  cloneFont?: string
}

export interface PostInputs {
  theme: string
  objective: string
  tone: Tone
  niche: string
  baseText: string
  referenceImageBase64?: string  // Clone Master: screenshot de referência
}

// ── Stories ──

export type StoryType = 'content' | 'poll' | 'question'

export interface StorySlide {
  id: number
  type: StoryType
  headline: string
  body: string
  visualPrompt: string
  imageUrl?: string
  // Question box
  questionText?: string
  // Poll
  pollQuestion?: string
  pollOptions?: string[]
  layout: LayoutType
}

export interface StoriesData {
  slides: StorySlide[]
  caption: Caption
  generatedAt?: string
}

export interface StoriesInputs {
  theme: string
  objective: string
  baseText?: string
  tone: Tone
  niche: string
  storyCount: number
  types: StoryType[]
}

// ── Project (updated) ──

export type ProjectType = 'carousel' | 'post' | 'stories'

export interface Project {
  id: string
  name: string
  type: ProjectType
  theme?: string
  product?: string
  platform?: Platform
  inputs_json?: ProjectInputs
  current_carousel_data?: CarouselData
  current_post_data?: PostData
  current_stories_data?: StoriesData
  status: 'active' | 'archived'
  is_favorite: boolean
  tags?: string[]
  created_at: string
  updated_at: string
}
