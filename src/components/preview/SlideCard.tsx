import { forwardRef } from 'react'
import type { SlideData, ColorPalette } from '../../types'

interface Props {
  slide: SlideData
  index: number
  total: number
  palette: ColorPalette
  brand?: string
  width: number
  height: number
  titleFont?: string
  subtitleFont?: string
}

const SlideCard = forwardRef<HTMLDivElement, Props>(function SlideCard(
  { slide, index, total, palette, brand, width, height, titleFont = 'Inter, sans-serif', subtitleFont = 'Inter, sans-serif' },
  ref
) {
  const isFirst = index === 0
  const isLast = index === total - 1
  const titleLen = slide.headline.length
  const titleSize = titleLen > 50 ? (width < 400 ? 18 : 22) : titleLen > 30 ? (width < 400 ? 22 : 28) : (width < 400 ? 26 : 34)
  const subSize = width < 400 ? 13 : 15

  const background = slide.imageUrl
    ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.6)), url(${slide.imageUrl}) center/cover no-repeat`
    : `linear-gradient(145deg, ${palette.secondary} 0%, ${palette.secondary}cc 100%)`

  const textColor = slide.imageUrl ? '#ffffff' : palette.accent
  const subColor = slide.imageUrl ? 'rgba(255,255,255,0.8)' : `${palette.accent}cc`
  const accentColor = slide.imageUrl ? palette.primary : palette.primary

  const PAD = Math.round(width * 0.09)

  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        background,
        padding: PAD,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Top accent bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 32, height: 3, background: accentColor, borderRadius: 2 }} />
        <div style={{ width: 10, height: 3, background: accentColor, opacity: 0.4, borderRadius: 2 }} />
        {isFirst && (
          <div style={{ marginLeft: 'auto', fontSize: 9, color: subColor, opacity: 0.7, fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {brand || ''}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBlock: PAD * 0.6 }}>
        {isFirst && (
          <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 12, opacity: 0.9, fontFamily: subtitleFont }}>
            ✦ CARROSSEL
          </div>
        )}
        <h2 style={{
          fontSize: titleSize,
          fontWeight: 900,
          color: textColor,
          lineHeight: 1.15,
          margin: 0,
          fontFamily: titleFont,
          letterSpacing: '-0.02em',
        }}>
          {slide.headline}
        </h2>
        <div style={{ height: 16 }} />
        <p style={{
          fontSize: subSize,
          color: subColor,
          lineHeight: 1.65,
          margin: 0,
          fontFamily: subtitleFont,
        }}>
          {slide.subtitle}
        </p>
        {isLast && slide.ctaType && (
          <div style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: accentColor,
            color: palette.secondary,
            borderRadius: 50,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 800,
            alignSelf: 'flex-start',
            fontFamily: titleFont,
          }}>
            {slide.ctaType} →
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: subColor, opacity: 0.6, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          {brand || 'sua marca'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 9, color: subColor, opacity: 0.5 }}>{index + 1}/{total}</span>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: accentColor }} />
        </div>
      </div>
    </div>
  )
})

export default SlideCard
