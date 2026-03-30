import type { StylePackConfig, StylePackId } from '../../types/stylePacks'
import type { ColorPalette } from '../../types'

// ══════════════════════════════════════════════════
// AUTOR.IA — 3 Style Packs
// ══════════════════════════════════════════════════

export const STYLE_PACKS: Record<Exclude<StylePackId, 'livre'>, StylePackConfig> = {

  // ── 1. PRESENCA DOURADA ──
  // Foto fundo + dourado + alternancia dark/light cream
  'presenca-dourada': {
    id: 'presenca-dourada',
    name: 'Presenca Dourada',
    description: 'Foto do especialista como fundo + dourado + alternancia dark/light',
    titleFont: '"Inter", sans-serif',
    bodyFont: '"Inter", sans-serif',
    palette: {
      dark: '#1a1008',
      light: '#faf5ee',
      accent: '#d4a574',
      accentSoft: 'rgba(212,165,116,0.15)',
      textDark: '#1a0f05',
      textLight: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
    },
    sequence6: [
      { variant: 'gold-cover', role: 'cover' },
      { variant: 'gold-dark', role: 'content' },
      { variant: 'gold-light', role: 'content' },
      { variant: 'gold-dark', role: 'content' },
      { variant: 'gold-light', role: 'checklist' },
      { variant: 'gold-cta', role: 'cta' },
    ],
    sequence8: [
      { variant: 'gold-cover', role: 'cover' },
      { variant: 'gold-dark', role: 'content' },
      { variant: 'gold-light', role: 'content' },
      { variant: 'gold-dark', role: 'content' },
      { variant: 'gold-light', role: 'content' },
      { variant: 'gold-dark', role: 'content' },
      { variant: 'gold-light', role: 'checklist' },
      { variant: 'gold-cta', role: 'cta' },
    ],
    usesPhotosInContent: false,
    hasAvatar: true,
    hasSwipeButton: true,
    hasSlideCounter: true,
    hasWatermark: false,
  },

  // ── 2. DIARIO ARTESANAL ──
  // Texturas de papel + colagem + polaroid + manuscrito
  'diario-artesanal': {
    id: 'diario-artesanal',
    name: 'Diario Artesanal',
    description: 'Texturas de papel + colagem + polaroid + manuscrito — calor humano',
    titleFont: '"Cormorant Garamond", serif',
    bodyFont: '"Inter", sans-serif',
    handwritingFont: '"Caveat", cursive',
    palette: {
      dark: '#e8d5b7',    // kraft
      light: '#faf6f0',   // ruled paper
      accent: '#d97706',
      accentSoft: 'rgba(217,119,6,0.2)',
      textDark: '#3b1f06',
      textLight: '#78350f',
      textMuted: '#92400e',
    },
    sequence6: [
      { variant: 'craft-cover', role: 'cover' },
      { variant: 'craft-kraft', role: 'content' },
      { variant: 'craft-paper', role: 'content' },
      { variant: 'craft-kraft', role: 'content' },
      { variant: 'craft-paper', role: 'checklist' },
      { variant: 'craft-cta', role: 'cta' },
    ],
    sequence8: [
      { variant: 'craft-cover', role: 'cover' },
      { variant: 'craft-kraft', role: 'content' },
      { variant: 'craft-paper', role: 'content' },
      { variant: 'craft-kraft', role: 'content' },
      { variant: 'craft-paper', role: 'content' },
      { variant: 'craft-kraft', role: 'content' },
      { variant: 'craft-paper', role: 'checklist' },
      { variant: 'craft-cta', role: 'cta' },
    ],
    usesPhotosInContent: false,
    hasAvatar: false,
    hasSwipeButton: false,
    hasSlideCounter: false,
    hasWatermark: true,
  },

  // ── 3. IMPACTO EDITORIAL ──
  // Bold condensada + fotos intercaladas + preto/vermelho/branco
  'impacto-editorial': {
    id: 'impacto-editorial',
    name: 'Impacto Editorial',
    description: 'Tipografia bold + fotos intercaladas + alternancia preto/vermelho/branco',
    titleFont: '"Bebas Neue", sans-serif',
    bodyFont: '"Inter", sans-serif',
    palette: {
      dark: '#111111',
      light: '#fafafa',
      accent: '#ef4444',
      accentSoft: 'rgba(239,68,68,0.15)',
      textDark: '#111111',
      textLight: '#ffffff',
      textMuted: 'rgba(255,255,255,0.45)',
    },
    sequence6: [
      { variant: 'edit-cover', role: 'cover' },
      { variant: 'edit-photo', role: 'content' },
      { variant: 'edit-accent', role: 'content' },
      { variant: 'edit-photo', role: 'content' },
      { variant: 'edit-white', role: 'content' },
      { variant: 'edit-cta', role: 'cta' },
    ],
    sequence8: [
      { variant: 'edit-cover', role: 'cover' },
      { variant: 'edit-photo', role: 'content' },
      { variant: 'edit-accent', role: 'content' },
      { variant: 'edit-photo', role: 'content' },
      { variant: 'edit-white', role: 'content' },
      { variant: 'edit-photo', role: 'content' },
      { variant: 'edit-black', role: 'content' },
      { variant: 'edit-cta', role: 'cta' },
    ],
    usesPhotosInContent: true,
    hasAvatar: false,
    hasSwipeButton: false,
    hasSlideCounter: false,
    hasWatermark: true,
  },
}

export function getStylePack(id: StylePackId): StylePackConfig | null {
  if (id === 'livre') return null
  return STYLE_PACKS[id] || null
}

/**
 * Retorna o pack com as cores da pessoa aplicadas.
 * Mapeia: primary→accent, background→dark, accent→light, text→textLight
 */
export function getStylePackWithUserPalette(id: StylePackId, userPalette?: ColorPalette | null): StylePackConfig | null {
  if (id === 'livre') return null
  const pack = STYLE_PACKS[id]
  if (!pack || !userPalette) return pack || null

  const userAccent = userPalette.primary || pack.palette.accent

  // Presença Dourada: full palette override — dark-themed, adapta a qualquer paleta
  if (id === 'presenca-dourada') {
    return {
      ...pack,
      palette: {
        dark: userPalette.background || userPalette.secondary || pack.palette.dark,
        light: userPalette.accent || pack.palette.light,
        accent: userAccent,
        accentSoft: userAccent + '20',
        textDark: userPalette.secondary || userPalette.background || pack.palette.textDark,
        textLight: userPalette.text || pack.palette.textLight,
        textMuted: (userPalette.text || pack.palette.textMuted) + '99',
      },
    }
  }

  // Diário Artesanal + Impacto Editorial: preserva identidade do pack
  // Só muda o accent (cor destaque) com a cor principal do usuário
  return {
    ...pack,
    palette: {
      ...pack.palette,
      accent: userAccent,
      accentSoft: userAccent + '20',
    },
  }
}

export function getSlideSequence(pack: StylePackConfig, slideCount: number) {
  if (slideCount <= 6) return pack.sequence6
  return pack.sequence8
}

export function getAllStylePacks(): StylePackConfig[] {
  return Object.values(STYLE_PACKS)
}
