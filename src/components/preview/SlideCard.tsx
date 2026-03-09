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
  { slide, palette, brand, width, height, titleFont = 'Inter, sans-serif', subtitleFont = 'Inter, sans-serif' },
  ref
) {
  const titleLen = slide.headline.length
  const titleSize = titleLen > 50 ? (width < 400 ? 18 : 22) : titleLen > 30 ? (width < 400 ? 22 : 28) : (width < 400 ? 26 : 34)
  const subSize = width < 400 ? 13 : 15

  const background = slide.imageUrl
    ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.6)), url(${slide.imageUrl}) center/cover no-repeat`
    : `linear-gradient(145deg, ${palette.secondary} 0%, ${palette.secondary}cc 100%)`

  const textColor = slide.imageUrl ? '#ffffff' : palette.accent
  const subColor = slide.imageUrl ? 'rgba(255,255,255,0.8)' : `${palette.accent}cc`
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
      <div />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: slide.style?.textPosition === 'top' ? 'flex-start'
          : slide.style?.textPosition === 'bottom' ? 'flex-end'
          : 'center',
        paddingBlock: PAD * 0.6,
      }}>
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
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: subColor, opacity: 0.6, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          {brand || 'sua marca'}
        </span>
      </div>
    </div>
  )
})

export default SlideCard
