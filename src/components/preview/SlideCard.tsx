import { forwardRef } from 'react'
import type { SlideData, ColorPalette } from '../../types'
import type { SlideTemplate, TemplateConfig } from '../shared/LayoutTemplates'
import { getTemplateById } from '../shared/LayoutTemplates'

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
  template?: SlideTemplate
  customGradient?: string // CSS gradient override
  fontScale?: number // 0.7–1.5, default 1.0
}

const SlideCard = forwardRef<HTMLDivElement, Props>(function SlideCard(
  { slide, palette, brand, width, height, titleFont = 'Inter, sans-serif', subtitleFont = 'Inter, sans-serif', template, customGradient, index, fontScale = 1.0 },
  ref
) {
  const tmpl: TemplateConfig = template ? getTemplateById(template) : getTemplateById('default')

  // Title size based on template + text length + user scale
  const titleLen = slide.headline.length
  const baseTitleSize = tmpl.titleSize === 'xl' ? (width < 400 ? 28 : 38)
    : tmpl.titleSize === 'lg' ? (width < 400 ? 24 : 32)
    : tmpl.titleSize === 'sm' ? (width < 400 ? 16 : 20)
    : (width < 400 ? 20 : 26) // md
  const titleSize = (titleLen > 50 ? baseTitleSize * 0.75 : titleLen > 30 ? baseTitleSize * 0.88 : baseTitleSize) * fontScale
  const subSize = (width < 400 ? 13 : 15) * fontScale

  const bgColor = palette.background || palette.secondary
  const txtColor = palette.text || palette.accent

  // Background: gradient-first (no image = gradient)
  // When image present, overlay tints toward palette background color
  const background = slide.imageUrl
    ? `linear-gradient(to bottom, ${bgColor}30 0%, ${bgColor}70 35%, ${bgColor}ee 100%), url(${slide.imageUrl}) center/cover no-repeat`
    : customGradient || `linear-gradient(145deg, ${bgColor} 0%, ${palette.secondary} 100%)`

  const textColor = slide.imageUrl ? palette.primary : txtColor
  const subColor = slide.imageUrl ? `${palette.primary}dd` : `${txtColor}cc`
  const accentColor = palette.primary
  const PAD = Math.round(width * 0.09)

  // Vertical alignment
  const justifyContent = tmpl.verticalPosition === 'top' ? 'flex-start'
    : tmpl.verticalPosition === 'bottom' ? 'flex-end'
    : slide.style?.textPosition === 'top' ? 'flex-start'
    : slide.style?.textPosition === 'bottom' ? 'flex-end'
    : 'center'

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
        justifyContent: slide.imageUrl ? 'flex-end' : 'space-between',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Accent bar (editorial templates) */}
      {tmpl.showAccentBar && (
        <div style={{
          position: 'absolute',
          left: PAD * 0.4,
          top: PAD,
          bottom: PAD,
          width: 4,
          background: accentColor,
          borderRadius: 2,
        }} />
      )}

      <div />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        paddingBlock: PAD * 0.6,
        paddingLeft: tmpl.showAccentBar ? PAD * 0.5 : 0,
      }}>
        {/* Quote marks */}
        {tmpl.showQuoteMarks && (
          <div style={{
            fontSize: width < 400 ? 36 : 48,
            color: accentColor,
            lineHeight: 0.8,
            marginBottom: 8,
            fontFamily: 'Georgia, serif',
            opacity: 0.8,
          }}>"</div>
        )}

        {/* Number prefix */}
        {tmpl.showNumberPrefix && (
          <div style={{
            fontSize: width < 400 ? 36 : 48,
            fontWeight: 900,
            color: accentColor,
            lineHeight: 1,
            marginBottom: 8,
            opacity: 0.3,
            fontFamily: titleFont,
          }}>
            {String(index + 1).padStart(2, '0')}
          </div>
        )}

        {/* Headline */}
        <h2 style={{
          fontSize: titleSize,
          fontWeight: tmpl.titleWeight,
          color: textColor,
          lineHeight: 1.15,
          margin: 0,
          fontFamily: titleFont,
          letterSpacing: '-0.02em',
          textAlign: tmpl.titleAlign,
        }}>
          {slide.headline}
        </h2>

        <div style={{ height: 16 }} />

        {/* Highlight box around subtitle */}
        {tmpl.showHighlightBox ? (
          <div style={{
            background: `${accentColor}22`,
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <p style={{
              fontSize: subSize,
              color: subColor,
              lineHeight: 1.65,
              margin: 0,
              fontFamily: subtitleFont,
              textAlign: tmpl.subtitleAlign,
            }}>
              {slide.subtitle}
            </p>
          </div>
        ) : (
          <p style={{
            fontSize: subSize,
            color: subColor,
            lineHeight: 1.65,
            margin: 0,
            fontFamily: subtitleFont,
            textAlign: tmpl.subtitleAlign,
          }}>
            {slide.subtitle}
          </p>
        )}

        {/* CTA Button */}
        {tmpl.showCtaButton && (
          <div style={{
            marginTop: 20,
            padding: '12px 24px',
            background: accentColor,
            borderRadius: 12,
            textAlign: 'center',
            alignSelf: 'center',
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: width < 400 ? 12 : 14,
              fontWeight: 700,
              fontFamily: subtitleFont,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {slide.ctaType || 'Saiba mais'}
            </span>
          </div>
        )}

        {/* CTA Arrow */}
        {tmpl.showArrow && (
          <div style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: width < 400 ? 12 : 14, fontWeight: 700, color: accentColor, fontFamily: subtitleFont }}>
              Deslize
            </span>
            <span style={{ fontSize: 24, color: accentColor }}>→</span>
          </div>
        )}

        {/* @ Handle */}
        {tmpl.showAtHandle && (
          <div style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: `${accentColor}33`,
              border: `2px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, color: accentColor }}>@</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: textColor, fontFamily: subtitleFont, opacity: brand ? 1 : 0.5 }}>
              {brand || '@seu_perfil'}
            </span>
          </div>
        )}
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
