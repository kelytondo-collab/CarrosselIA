import { forwardRef } from 'react'
import type { SlideData } from '../../types'
import type { SlideVariant, StylePackConfig } from '../../types/stylePacks'

interface Props {
  slide: SlideData
  index: number
  total: number
  pack: StylePackConfig
  variant: SlideVariant
  role: 'cover' | 'content' | 'checklist' | 'cta'
  brand?: string
  expertPhoto?: string
  width: number
  height: number
  fontScale?: number
}

function parseItems(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

const StyledSlideCard = forwardRef<HTMLDivElement, Props>(function StyledSlideCard(
  { slide, index, total, pack, variant, role, brand, expertPhoto, width, height, fontScale = 1.0 },
  ref
) {
  const PAD = Math.round(width * 0.08)
  const pal = pack.palette
  const sz = (px: number) => Math.round(px * fontScale)
  const isChecklist = role === 'checklist'

  // ══════════════════════════════════════════
  // PRESENÇA DOURADA
  // ══════════════════════════════════════════
  if (variant.startsWith('gold-')) {
    const isDark = variant === 'gold-dark' || variant === 'gold-cover' || variant === 'gold-cta'
    const isCover = variant === 'gold-cover'
    const isCta = variant === 'gold-cta'

    // ONLY cover/CTA use photos — content slides are ALWAYS solid color
    // Priority: slide-specific image (topic) wins over expert photo (cadastered)
    const coverPhoto = slide.imageUrl || expertPhoto
    const bg = (isCover || isCta)
      ? coverPhoto
        ? `linear-gradient(to bottom, rgba(26,16,8,0.25) 0%, rgba(26,16,8,0.82) 55%, rgba(26,16,8,0.96) 100%), url(${coverPhoto}) center/cover no-repeat`
        : `linear-gradient(145deg, ${pal.dark} 0%, #2a1a0a 100%)`
      : isDark ? pal.dark : pal.light

    const textMain = isDark ? pal.textLight : pal.textDark
    const textSub = isDark ? pal.textMuted : `${pal.textDark}88`
    const titleSz = (isCover || isCta) ? sz(width < 400 ? 26 : 33) : sz(width < 400 ? 20 : 26)
    const subSz = sz(width < 400 ? 11 : 13.5)
    const numSz = sz(width < 400 ? 56 : 76)

    return (
      <div ref={ref} style={{
        width, height, background: bg,
        padding: PAD, display: 'flex', flexDirection: 'column',
        justifyContent: isCover ? 'flex-end' : 'space-between',
        boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        fontFamily: pack.bodyFont,
      }}>
        {/* Top gold line */}
        {isCover && (
          <div style={{ position: 'absolute', top: 0, left: PAD, right: PAD, height: 3, background: pal.accent }} />
        )}

        {/* Top branding */}
        {isCover && (
          <div style={{
            position: 'absolute', top: PAD * 0.8, left: PAD, right: PAD,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: sz(9), color: pal.accent, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
              {brand || 'AUTOR.IA'}
            </span>
            <span style={{ fontSize: sz(9), color: `${pal.textLight}50`, letterSpacing: '0.1em' }}>
              01/{String(total).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Faded slide number */}
        {!isCover && !isCta && (
          <div style={{
            position: 'absolute', top: PAD * 0.4, right: PAD * 0.7,
            fontSize: numSz, fontWeight: 900, color: pal.accent, opacity: 0.1,
            lineHeight: 1, fontFamily: pack.titleFont,
          }}>
            {String(index + 1).padStart(2, '0')}
          </div>
        )}

        {/* Gold accent line left */}
        {!isCover && !isCta && (
          <div style={{
            position: 'absolute', left: PAD * 0.45, top: PAD * 1.4, bottom: PAD * 1.4,
            width: 3, background: pal.accent, borderRadius: 2, opacity: 0.55,
          }} />
        )}

        {/* No-photo indicator */}
        {(isCover || isCta) && !coverPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              padding: '8px 16px', background: 'rgba(212,165,116,0.15)',
              borderRadius: 8, border: `1px dashed ${pal.accent}55`,
            }}>
              <span style={{ fontSize: sz(10), color: pal.accent, opacity: 0.6, fontFamily: pack.bodyFont }}>
                Adicione sua foto no perfil ou gere com IA
              </span>
            </div>
          </div>
        )}

        {isCover && <div />}

        {/* Main content */}
        <div style={{
          paddingLeft: (!isCover && !isCta) ? PAD * 0.55 : 0,
          flex: isCover ? undefined : 1,
          display: 'flex', flexDirection: 'column',
          justifyContent: isCover ? undefined : 'center',
        }}>
          <h2 style={{
            fontSize: titleSz, fontWeight: 700, color: textMain,
            lineHeight: 1.15, margin: 0, fontFamily: pack.titleFont,
            letterSpacing: '-0.01em',
          }}>
            {slide.headline}
          </h2>

          <div style={{ height: isCover ? 10 : 14 }} />

          {isChecklist ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {parseItems(slide.subtitle).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: pal.accent, fontSize: sz(14), lineHeight: 1.4, flexShrink: 0, fontWeight: 700 }}>&#10003;</span>
                  <span style={{ fontSize: subSz, color: textSub, lineHeight: 1.5, fontFamily: pack.bodyFont }}>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{
              fontSize: subSz, color: textSub,
              lineHeight: 1.6, margin: 0, fontFamily: pack.bodyFont,
            }}>
              {slide.subtitle}
            </p>
          )}

          {isCta && (
            <div style={{
              marginTop: 20, padding: '11px 26px',
              background: pal.accent, borderRadius: 8,
              textAlign: 'center', alignSelf: 'flex-start',
            }}>
              <span style={{
                color: pal.dark, fontSize: sz(12), fontWeight: 700,
                fontFamily: pack.bodyFont, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {slide.ctaType || 'QUERO COMEÇAR'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8,
        }}>
          {pack.hasAvatar && (isCover || isCta) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                border: `2px solid ${pal.accent}`,
                background: expertPhoto ? `url(${expertPhoto}) center/cover` : `${pal.accent}33`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: sz(10), color: pal.textLight, fontWeight: 600, opacity: 0.8 }}>
                {brand || '@seu_perfil'}
              </span>
            </div>
          )}

          {pack.hasSlideCounter && !isCover && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{
                  width: i === index ? 14 : 5, height: 4, borderRadius: 2,
                  background: i === index ? pal.accent : `${pal.accent}35`,
                }} />
              ))}
            </div>
          )}

          {pack.hasSwipeButton && !isCta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: sz(8), color: pal.accent, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>DESLIZE</span>
              <span style={{ fontSize: sz(13), color: pal.accent }}>&#8594;</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // DIÁRIO ARTESANAL
  // ══════════════════════════════════════════
  if (variant.startsWith('craft-')) {
    const isCover = variant === 'craft-cover'
    const isCta = variant === 'craft-cta'
    const isKraft = variant === 'craft-kraft' || isCover || isCta
    const isPaper = variant === 'craft-paper'

    const bgColor = isKraft ? pal.dark : pal.light
    const titleSz = isCover ? sz(width < 400 ? 24 : 32) : sz(width < 400 ? 19 : 25)
    const subSz = sz(width < 400 ? 11 : 13)
    const handFont = pack.handwritingFont || '"Caveat", cursive'

    return (
      <div ref={ref} style={{
        width, height, background: bgColor,
        padding: PAD, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        fontFamily: pack.bodyFont,
      }}>
        {/* Ruled paper lines */}
        {isPaper && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', left: PAD * 0.5, right: PAD * 0.5,
                top: PAD * 2 + i * Math.round(height * 0.052),
                height: 1, background: '#c9b896', opacity: 0.25,
              }} />
            ))}
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: PAD * 1.6, width: 1, background: '#d4a0a0', opacity: 0.35,
            }} />
          </div>
        )}

        {/* Tape top-left */}
        {(isCover || isKraft) && (
          <div style={{
            position: 'absolute', top: -5, left: PAD * 1.3,
            width: 42, height: 16, background: 'rgba(217,119,6,0.18)',
            transform: 'rotate(-3deg)', borderRadius: 2,
          }} />
        )}

        {/* Tape top-right */}
        {(isCover || isPaper) && (
          <div style={{
            position: 'absolute', top: -3, right: PAD * 1.1,
            width: 36, height: 14, background: 'rgba(217,119,6,0.14)',
            transform: 'rotate(4deg)', borderRadius: 2,
          }} />
        )}

        {/* Push pin */}
        {isKraft && !isCover && !isCta && (
          <div style={{
            position: 'absolute', top: PAD * 0.6, right: PAD,
            width: 9, height: 9, borderRadius: '50%',
            background: pal.accent, boxShadow: '0 2px 3px rgba(0,0,0,0.25)',
          }} />
        )}

        {/* Top indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {isCover ? (
            <span style={{
              fontSize: sz(11), color: pal.textMuted, fontFamily: handFont,
              transform: 'rotate(-2deg)', display: 'inline-block',
            }}>
              para você &#8595;
            </span>
          ) : (
            <span style={{ fontSize: sz(10), color: pal.textMuted, fontFamily: handFont }}>
              {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Main content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          paddingLeft: isPaper ? PAD * 0.7 : 0,
        }}>
          <h2 style={{
            fontSize: titleSz, fontWeight: 700, color: pal.textDark,
            lineHeight: 1.2, margin: 0, fontFamily: pack.titleFont,
          }}>
            {slide.headline}
          </h2>

          <div style={{
            width: '38%', height: 2, background: pal.accent,
            marginTop: 10, marginBottom: 14, opacity: 0.45,
            borderRadius: 1, transform: 'rotate(-0.5deg)',
          }} />

          {isChecklist ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {parseItems(slide.subtitle).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <span style={{ color: pal.accent, fontSize: sz(15), lineHeight: 1.2, fontFamily: handFont, flexShrink: 0 }}>&#10003;</span>
                  <span style={{ fontSize: subSz, color: pal.textLight, lineHeight: 1.55, fontFamily: pack.bodyFont }}>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{
              fontSize: subSz, color: pal.textLight, lineHeight: 1.65, margin: 0,
              fontFamily: isCover ? handFont : pack.bodyFont,
              ...(isCover ? { transform: 'rotate(-0.5deg)' } : {}),
            }}>
              {slide.subtitle}
            </p>
          )}

          {isCta && (
            <div style={{
              marginTop: 18, padding: '10px 22px',
              background: pal.accent, borderRadius: 3,
              textAlign: 'center', alignSelf: 'flex-start',
              transform: 'rotate(-1deg)',
              boxShadow: '2px 3px 6px rgba(0,0,0,0.15)',
            }}>
              <span style={{
                color: '#ffffff', fontSize: sz(13), fontWeight: 700,
                fontFamily: handFont, letterSpacing: '0.02em',
              }}>
                {slide.ctaType || 'Quero começar →'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {pack.hasWatermark && (
            <span style={{
              fontSize: sz(7), color: pal.textMuted, opacity: 0.35,
              letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: pack.bodyFont,
            }}>
              {brand || 'AUTOR.IA'}
            </span>
          )}
          {!isCta && (
            <span style={{
              fontSize: sz(10), color: pal.accent,
              fontFamily: handFont, transform: 'rotate(2deg)', display: 'inline-block',
            }}>
              {isCover ? 'deslize →' : index < total - 1 ? '→' : ''}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // IMPACTO EDITORIAL
  // ══════════════════════════════════════════
  if (variant.startsWith('edit-')) {
    const isCover = variant === 'edit-cover'
    const isCta = variant === 'edit-cta'
    const isPhoto = variant === 'edit-photo'
    const isAccent = variant === 'edit-accent'
    const isWhite = variant === 'edit-white'
    const hasPhotoOverlay = isCover || isPhoto

    // Priority: slide-specific image (topic) wins over expert photo (cadastered)
    const photoSrc = isPhoto ? (slide.imageUrl || expertPhoto) : (isCover ? (slide.imageUrl || expertPhoto) : undefined)
    const bg = hasPhotoOverlay && photoSrc
      ? `linear-gradient(to bottom, rgba(17,17,17,0.15) 0%, rgba(17,17,17,0.8) 50%, rgba(17,17,17,0.96) 100%), url(${photoSrc}) center/cover no-repeat`
      : isAccent ? pal.accent
      : isWhite ? pal.light
      : pal.dark

    const isDarkBg = !isWhite
    const textMain = isDarkBg ? pal.textLight : pal.textDark
    const textSub = isDarkBg ? `${pal.textLight}bb` : `${pal.textDark}88`
    const barColor = isAccent ? pal.textLight : pal.accent

    const titleSz = isCover ? sz(width < 400 ? 34 : 46) : sz(width < 400 ? 24 : 32)
    const subSz = sz(width < 400 ? 11 : 13.5)

    return (
      <div ref={ref} style={{
        width, height, background: bg,
        padding: PAD, display: 'flex', flexDirection: 'column',
        justifyContent: hasPhotoOverlay ? 'flex-end' : 'space-between',
        boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        fontFamily: pack.bodyFont,
      }}>
        {/* Red sidebar bar */}
        {!isAccent && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 5, background: barColor,
          }} />
        )}

        {/* Cover branding */}
        {isCover && (
          <div style={{
            position: 'absolute', top: PAD, left: PAD, right: PAD,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{
              fontSize: sz(11), color: barColor, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pack.titleFont,
            }}>
              {brand || 'AUTOR.IA'}
            </span>
          </div>
        )}

        {hasPhotoOverlay && <div />}

        {/* Content */}
        <div style={{
          flex: hasPhotoOverlay ? undefined : 1,
          display: 'flex', flexDirection: 'column',
          justifyContent: hasPhotoOverlay ? undefined : 'center',
          paddingLeft: 4,
        }}>
          <h2 style={{
            fontSize: titleSz, fontWeight: 400,
            color: textMain, lineHeight: isCover ? 0.95 : 1.05,
            margin: 0, fontFamily: pack.titleFont,
            textTransform: 'uppercase', letterSpacing: '0.02em',
          }}>
            {slide.headline}
          </h2>

          {!isCover && (
            <>
              <div style={{
                width: 36, height: 3, background: barColor,
                marginTop: 12, marginBottom: 12,
              }} />

              {isChecklist ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {parseItems(slide.subtitle).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{
                        color: barColor, fontSize: sz(12), lineHeight: 1.4,
                        flexShrink: 0, fontWeight: 700, fontFamily: pack.titleFont,
                      }}>&#9654;</span>
                      <span style={{ fontSize: subSz, color: textSub, lineHeight: 1.55, fontFamily: pack.bodyFont }}>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{
                  fontSize: subSz, color: textSub,
                  lineHeight: 1.65, margin: 0, fontFamily: pack.bodyFont,
                }}>
                  {slide.subtitle}
                </p>
              )}
            </>
          )}

          {isCta && (
            <div style={{
              marginTop: 22, padding: '13px 30px',
              background: pal.accent, textAlign: 'center', alignSelf: 'flex-start',
            }}>
              <span style={{
                color: pal.textLight, fontSize: sz(13), fontWeight: 400,
                fontFamily: pack.titleFont, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                {slide.ctaType || 'COMECE AGORA'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6,
        }}>
          {pack.hasWatermark && (
            <span style={{
              fontSize: sz(7), color: `${textMain}25`,
              letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pack.titleFont,
            }}>
              {brand || 'AUTOR.IA'}
            </span>
          )}
          <span style={{
            fontSize: sz(8), color: `${textMain}40`, fontFamily: pack.bodyFont,
          }}>
            {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  // ELEGANTE — champagne + vinho + dourado, serif Playfair
  // ══════════════════════════════════════════
  if (variant.startsWith('elegante-')) {
    const isCover = variant === 'elegante-cover-photo'
    const isList = variant === 'elegante-content-list'
    const isCta = variant === 'elegante-cta'
    const isText = variant === 'elegante-content-text'

    const photo = slide.imageUrl || expertPhoto
    // Sempre foto + overlay warm escuro (foto vem do pipeline existente)
    const bg = photo
      ? `linear-gradient(to bottom, rgba(26,14,8,0.35) 0%, rgba(26,14,8,0.72) 60%, rgba(26,14,8,0.92) 100%), url(${photo}) center/cover no-repeat`
      : `linear-gradient(145deg, ${pal.dark} 0%, #2b1810 100%)`

    const titleSz = isCover ? sz(width < 400 ? 30 : 40) : sz(width < 400 ? 22 : 28)
    const subSz = sz(width < 400 ? 12 : 14)

    // Split headline into main + highlight (último segmento após "?" ou "...")
    // Convenção simples: a última frase é o destaque
    const headline = slide.headline || ''
    const splitMatch = headline.match(/^(.*?[.!?…]+\s+)(.+)$/)
    const headMain = splitMatch ? splitMatch[1].trim() : headline
    const headHighlight = splitMatch ? splitMatch[2].trim() : ''

    // Heart SVG ornament em gold (accentSoft pêssego)
    const HeartOrnament = ({ size = 22 }: { size?: number }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block' }}>
        <path d="M12 20.5 C 6 16, 3 13, 3 9 C 3 6, 5 4, 8 4 C 10 4, 11.5 5.5, 12 7 C 12.5 5.5, 14 4, 16 4 C 19 4, 21 6, 21 9 C 21 13, 18 16, 12 20.5 Z"
          stroke="#d4a574" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )

    // Divider ornamental: linha - heart - linha
    const Divider = () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 14, width: '60%' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #d4a574, transparent)' }} />
        <HeartOrnament size={14} />
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #d4a574, transparent)' }} />
      </div>
    )

    return (
      <div ref={ref} style={{
        width, height, background: bg,
        padding: PAD, display: 'flex', flexDirection: 'column',
        justifyContent: isCover ? 'flex-end' : 'space-between',
        boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        fontFamily: pack.bodyFont,
      }}>
        {/* Top heart ornament (todas as variants menos CTA) */}
        {!isCta && (
          <div style={{ position: 'absolute', top: PAD * 0.7, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <HeartOrnament size={isCover ? 26 : 20} />
          </div>
        )}

        {/* ─── COVER ─── */}
        {isCover && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h1 style={{
              fontSize: titleSz, fontWeight: 400, color: pal.textLight,
              lineHeight: 1.1, margin: 0, fontFamily: pack.titleFont,
            }}>
              {headMain}
              {headHighlight && (
                <>
                  <br />
                  <span style={{
                    background: `linear-gradient(180deg, transparent 50%, ${pal.accentSoft}cc 50%, ${pal.accentSoft}cc 90%, transparent 90%)`,
                    color: pal.accent, padding: '0 12px', display: 'inline-block', marginTop: 6,
                    fontStyle: 'italic',
                  }}>
                    {headHighlight}
                  </span>
                </>
              )}
            </h1>
            <Divider />
            {slide.subtitle && (
              <p style={{
                fontSize: subSz, color: pal.textMuted, lineHeight: 1.7,
                margin: 0, fontFamily: pack.bodyFont, maxWidth: '85%',
              }}>
                {slide.subtitle}
              </p>
            )}
            {pack.hasSwipeButton && (
              <div style={{ marginTop: 24, color: '#d4a574', fontSize: sz(20), fontWeight: 300 }}>→</div>
            )}
          </div>
        )}

        {/* ─── CONTENT TEXT ─── */}
        {isText && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingTop: PAD * 0.4 }}>
            <h2 style={{
              fontSize: titleSz, fontWeight: 400, color: pal.textLight,
              lineHeight: 1.2, margin: 0, fontFamily: pack.titleFont,
            }}>
              {headMain}
              {headHighlight && (
                <>
                  <br />
                  <span style={{
                    background: `linear-gradient(180deg, transparent 55%, ${pal.accentSoft}cc 55%, ${pal.accentSoft}cc 90%, transparent 90%)`,
                    color: pal.accent, padding: '0 10px', display: 'inline-block', marginTop: 4,
                    fontStyle: 'italic',
                  }}>
                    {headHighlight}
                  </span>
                </>
              )}
            </h2>
            <Divider />
            {slide.subtitle && (
              <p style={{
                fontSize: subSz, color: pal.textLight, lineHeight: 1.8,
                margin: 0, fontFamily: pack.bodyFont, maxWidth: '88%',
                whiteSpace: 'pre-line',
              }}>
                {slide.subtitle}
              </p>
            )}
          </div>
        )}

        {/* ─── CONTENT LIST (checklist) ─── */}
        {isList && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: PAD * 0.6 }}>
            <h2 style={{
              fontSize: titleSz, fontWeight: 400, color: pal.textLight,
              lineHeight: 1.15, margin: 0, fontFamily: pack.titleFont, textAlign: 'center',
            }}>
              {headMain}
              {headHighlight && (
                <>
                  <br />
                  <span style={{
                    fontFamily: pack.handwritingFont || pack.titleFont,
                    color: pal.accent, fontSize: sz(width < 400 ? 32 : 42), fontStyle: 'italic',
                  }}>
                    {headHighlight}
                  </span>
                </>
              )}
            </h2>
            <div style={{ height: 18 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: PAD * 0.3, paddingRight: PAD * 0.3 }}>
              {parseItems(slide.subtitle).slice(0, 4).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Círculo dourado com heart pequeno */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${pal.accentSoft}, #d4a574)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20.5 C 6 16, 3 13, 3 9 C 3 6, 5 4, 8 4 C 10 4, 11.5 5.5, 12 7 C 12.5 5.5, 14 4, 16 4 C 19 4, 21 6, 21 9 C 21 13, 18 16, 12 20.5 Z"
                        fill={pal.accent} />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: subSz, color: pal.textLight, lineHeight: 1.4,
                    fontFamily: pack.bodyFont,
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CTA ─── */}
        {isCta && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <HeartOrnament size={28} />
            <div style={{ height: 12 }} />
            <h2 style={{
              fontSize: titleSz, fontWeight: 400, color: pal.textLight,
              lineHeight: 1.2, margin: 0, fontFamily: pack.titleFont,
            }}>
              {headMain}
              {headHighlight && (
                <>
                  <br />
                  <span style={{
                    color: pal.accent, fontStyle: 'italic',
                  }}>
                    {headHighlight}
                  </span>
                </>
              )}
            </h2>
            <Divider />
            {slide.subtitle && (
              <p style={{
                fontSize: subSz, color: pal.textMuted, lineHeight: 1.7,
                margin: 0, fontFamily: pack.bodyFont, maxWidth: '85%',
              }}>
                {slide.subtitle}
              </p>
            )}
            <div style={{ flex: 1 }} />
            {/* Footer brushstroke vinho com lock + CTA */}
            <div style={{
              position: 'absolute', bottom: PAD * 0.6, left: PAD * 0.3, right: PAD * 0.3,
              background: `linear-gradient(95deg, transparent 0%, ${pal.accent} 8%, ${pal.accent} 92%, transparent 100%)`,
              padding: '14px 20px', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="#d4a574" strokeWidth="1.5" fill="none" />
                <path d="M8 11 V 8 C 8 5.8, 9.8 4, 12 4 S 16 5.8, 16 8 V 11" stroke="#d4a574" strokeWidth="1.5" fill="none" />
              </svg>
              <span style={{
                color: pal.textLight, fontSize: sz(13), fontFamily: pack.titleFont,
                fontStyle: 'italic', fontWeight: 600,
              }}>
                {slide.ctaType || 'Me chama no Direct'}
              </span>
            </div>
          </div>
        )}

        {/* Brand watermark bottom-left (não no CTA) */}
        {pack.hasWatermark && !isCta && (
          <span style={{
            position: 'absolute', bottom: PAD * 0.5, left: PAD,
            fontSize: sz(8), color: 'rgba(212,165,116,0.55)',
            letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: pack.titleFont,
          }}>
            {brand || '@kelly.tondo'}
          </span>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════
  // FALLBACK
  // ══════════════════════════════════════════
  return (
    <div ref={ref} style={{
      width, height, background: '#111',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#666', fontSize: 12 }}>Estilo não reconhecido</span>
    </div>
  )
})

export default StyledSlideCard
