// 12 text-over-gradient templates for carousel slides
// These define text layout, not background — background is always gradient or photo

export type SlideTemplate =
  | 'cover-bold'
  | 'cover-editorial'
  | 'text-centered'
  | 'text-left-accent'
  | 'text-number'
  | 'text-quote'
  | 'text-highlight'
  | 'text-list'
  | 'cta-bold'
  | 'cta-arrow'
  | 'cta-social'
  | 'default'

export interface TemplateConfig {
  id: SlideTemplate
  label: string
  category: 'capa' | 'conteudo' | 'cta'
  // Style overrides applied to SlideCard
  titleAlign: 'left' | 'center' | 'right'
  titleWeight: number
  titleSize: 'sm' | 'md' | 'lg' | 'xl'
  subtitleAlign: 'left' | 'center' | 'right'
  verticalPosition: 'top' | 'center' | 'bottom'
  showAccentBar: boolean
  showQuoteMarks: boolean
  showNumberPrefix: boolean
  showHighlightBox: boolean
  showCtaButton: boolean
  showArrow: boolean
  showAtHandle: boolean
}

export const TEMPLATES: TemplateConfig[] = [
  // ── CAPA ──
  {
    id: 'cover-bold',
    label: 'Capa Bold',
    category: 'capa',
    titleAlign: 'center',
    titleWeight: 900,
    titleSize: 'xl',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'cover-editorial',
    label: 'Capa Editorial',
    category: 'capa',
    titleAlign: 'left',
    titleWeight: 900,
    titleSize: 'lg',
    subtitleAlign: 'left',
    verticalPosition: 'bottom',
    showAccentBar: true,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },

  // ── CONTEUDO ──
  {
    id: 'text-centered',
    label: 'Centralizado',
    category: 'conteudo',
    titleAlign: 'center',
    titleWeight: 800,
    titleSize: 'md',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'text-left-accent',
    label: 'Barra Lateral',
    category: 'conteudo',
    titleAlign: 'left',
    titleWeight: 800,
    titleSize: 'md',
    subtitleAlign: 'left',
    verticalPosition: 'center',
    showAccentBar: true,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'text-number',
    label: 'Numerado',
    category: 'conteudo',
    titleAlign: 'left',
    titleWeight: 800,
    titleSize: 'md',
    subtitleAlign: 'left',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: true,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'text-quote',
    label: 'Citacao',
    category: 'conteudo',
    titleAlign: 'center',
    titleWeight: 600,
    titleSize: 'md',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: true,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'text-highlight',
    label: 'Destaque',
    category: 'conteudo',
    titleAlign: 'center',
    titleWeight: 900,
    titleSize: 'md',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: true,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'text-list',
    label: 'Lista',
    category: 'conteudo',
    titleAlign: 'left',
    titleWeight: 800,
    titleSize: 'sm',
    subtitleAlign: 'left',
    verticalPosition: 'top',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: false,
  },

  // ── CTA ──
  {
    id: 'cta-bold',
    label: 'CTA Botao',
    category: 'cta',
    titleAlign: 'center',
    titleWeight: 900,
    titleSize: 'lg',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: true,
    showArrow: false,
    showAtHandle: false,
  },
  {
    id: 'cta-arrow',
    label: 'CTA Seta',
    category: 'cta',
    titleAlign: 'center',
    titleWeight: 900,
    titleSize: 'lg',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: true,
    showAtHandle: false,
  },
  {
    id: 'cta-social',
    label: 'CTA @perfil',
    category: 'cta',
    titleAlign: 'center',
    titleWeight: 900,
    titleSize: 'md',
    subtitleAlign: 'center',
    verticalPosition: 'center',
    showAccentBar: false,
    showQuoteMarks: false,
    showNumberPrefix: false,
    showHighlightBox: false,
    showCtaButton: false,
    showArrow: false,
    showAtHandle: true,
  },
]

export const DEFAULT_TEMPLATE: TemplateConfig = {
  id: 'default',
  label: 'Padrao',
  category: 'conteudo',
  titleAlign: 'left',
  titleWeight: 900,
  titleSize: 'md',
  subtitleAlign: 'left',
  verticalPosition: 'center',
  showAccentBar: false,
  showQuoteMarks: false,
  showNumberPrefix: false,
  showHighlightBox: false,
  showCtaButton: false,
  showArrow: false,
  showAtHandle: false,
}

export function getTemplateById(id: SlideTemplate): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) || DEFAULT_TEMPLATE
}

export function getTemplatesByCategory(category: 'capa' | 'conteudo' | 'cta'): TemplateConfig[] {
  return TEMPLATES.filter(t => t.category === category)
}
