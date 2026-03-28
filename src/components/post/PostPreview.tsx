import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Download, Wand2, Copy, Check, Palette, Type, Image, RefreshCw, Pencil } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import type { ColorPalette, LayoutType, PostData, Caption } from '../../types'
import { exportSlideAsImage } from '../../services/exportService'
import { generateSlideImage } from '../../services/geminiService'
import { getDefaultProfile, updateProjectPost } from '../../services/storageService'
import CaptionEditor from '../caption/CaptionEditor'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const LAYOUTS: { id: LayoutType; label: string }[] = [
  { id: 'minimal', label: 'Centralizado' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'photo-left', label: 'Foto Esquerda' },
  { id: 'photo-right', label: 'Foto Direita' },
  { id: 'quote', label: 'Citação' },
  { id: 'cta', label: 'CTA' },
]

function buildPalettes(): { id: string; label: string; p: ColorPalette }[] {
  const profile = getDefaultProfile()
  const bk = profile?.brandKit
  const base: { id: string; label: string; p: ColorPalette }[] = []
  if (bk) {
    base.push({ id: 'brand', label: profile?.name || 'Sua Marca', p: bk.colors })
  } else if (profile?.color_palette) {
    const cp = profile.color_palette
    base.push({
      id: 'brand',
      label: profile.name || 'Sua Marca',
      p: {
        primary: cp.primary,
        secondary: cp.secondary || '#0f172a',
        accent: cp.accent || '#f8fafc',
        background: cp.background || cp.secondary || '#0f172a',
        text: cp.text || '#ffffff',
      },
    })
  }
  return [
    ...base,
    { id: 'black', label: 'Preto', p: { primary: '#ffffff', secondary: '#000000', accent: '#ffffff', background: '#000000', text: '#ffffff' } },
    { id: 'white', label: 'Branco', p: { primary: '#000000', secondary: '#ffffff', accent: '#000000', background: '#ffffff', text: '#000000' } },
    { id: 'violet', label: 'Violeta', p: { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc', background: '#0f0a1a', text: '#ffffff' } },
    { id: 'gold', label: 'Ouro', p: { primary: '#d97706', secondary: '#050505', accent: '#fafafa', background: '#050505', text: '#d97706' } },
    { id: 'rose', label: 'Rosa', p: { primary: '#ec4899', secondary: '#1f001a', accent: '#fff', background: '#1f001a', text: '#ffffff' } },
    { id: 'cyan', label: 'Ciano', p: { primary: '#06b6d4', secondary: '#0c1a2e', accent: '#f0f9ff', background: '#0c1a2e', text: '#f0f9ff' } },
    { id: 'emerald', label: 'Verde', p: { primary: '#10b981', secondary: '#052e16', accent: '#f0fdf4', background: '#052e16', text: '#f0fdf4' } },
  ]
}

const FONT_OPTIONS: { id: string; label: string; title: string; sub: string }[] = [
  { id: 'inter', label: 'Inter', title: 'Inter, sans-serif', sub: 'Inter, sans-serif' },
  { id: 'playfair', label: 'Elegante', title: '"Playfair Display", serif', sub: 'Inter, sans-serif' },
  { id: 'georgia', label: 'Clássica', title: 'Georgia, serif', sub: 'Georgia, serif' },
  { id: 'helvetica', label: 'Bold', title: '"Helvetica Neue", Arial, sans-serif', sub: 'Arial, sans-serif' },
]

function buildFonts() {
  const profile = getDefaultProfile()
  const bk = profile?.brandKit
  const base: { id: string; label: string; title: string; sub: string }[] = []
  if (bk) base.push({ id: 'brand', label: 'Sua Marca', title: `"${bk.fonts.title.family}", ${bk.fonts.title.category}`, sub: `"${bk.fonts.body.family}", ${bk.fonts.body.category}` })
  return [...base, ...FONT_OPTIONS]
}

function getProfileFont() {
  const profile = getDefaultProfile()
  if (profile?.preferred_font) {
    return FONT_OPTIONS.find(f => f.id === profile.preferred_font) || FONT_OPTIONS[0]
  }
  if (profile?.brandKit) return buildFonts()[0]
  return FONT_OPTIONS[0]
}

const SIZE = 360

export default function PostPreview() {
  const { currentProject, setView, apiKey, expertPhotoBase64, refreshProjects } = useApp()
  const postData = currentProject?.current_post_data
  const profile = getDefaultProfile()
  const logo = profile?.brandKit?.logo

  const PALETTES = buildPalettes()
  const FONTS = buildFonts()

  // If clone provided palette, inject it as first option
  const clonePal = postData?.clonePalette
  const allPalettes = clonePal
    ? [{ id: 'clone', label: 'Clone', p: clonePal }, ...PALETTES]
    : PALETTES

  // Initial font: clone > profile > first option
  const getInitialFont = () => {
    if (postData?.cloneFont) {
      const cf = postData.cloneFont
      if (cf === 'serif' || cf === 'script') {
        const elegante = FONTS.find(f => f.id === 'playfair')
        if (elegante) return elegante
      }
    }
    return getProfileFont()
  }

  // Initial palette: clone > brand (from profile) > first option
  const getInitialPalette = () => {
    if (clonePal) return allPalettes[0] // clone palette
    const brand = allPalettes.find(p => p.id === 'brand')
    return brand || allPalettes[0]
  }

  const [palette, setPalette] = useState(getInitialPalette())
  const [font, setFont] = useState(getInitialFont())
  const [post, setPost] = useState<PostData | null>(postData || null)
  const [layout, setLayout] = useState<LayoutType>(postData?.layout || 'minimal')
  const [generatingImg, setGeneratingImg] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editingText, setEditingText] = useState(false)
  const [copied, setCopied] = useState('')
  const [fontScale, setFontScale] = useState(1.0)

  const cardRef = useRef<HTMLDivElement>(null)

  if (!post) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum post carregado</p>
          <button onClick={() => setView('post-editor' as View)} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Criar post</button>
        </div>
      </div>
    )
  }

  const savePost = (updated: PostData) => {
    setPost(updated)
    if (currentProject) {
      updateProjectPost(currentProject.id, updated)
      refreshProjects()
    }
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => savePost({ ...post, imageUrl: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  // Track latest post in ref to avoid stale closure
  const postRef = useRef(post)
  postRef.current = post

  const genImage = async (useExpertPhoto: boolean) => {
    if (!apiKey) { toast.error('Configure chave Gemini'); return }
    if (useExpertPhoto && !expertPhotoBase64) {
      toast.error('Configure sua foto no Perfil primeiro (menu lateral > Perfis)')
      return
    }
    setGeneratingImg(true)
    const label = useExpertPhoto ? 'foto expert' : 'fundo'
    const toastId = toast.loading(`Gerando ${label}...`)
    try {
      const current = postRef.current!
      const prompt = useExpertPhoto
        ? (current.visualPrompt || `Fotografia profissional de especialista em ${profile?.niche || 'negócios'}`)
        : `Fundo abstrato/metafórico para post sobre: "${current.headline}". IMPORTANTE: Fundo abstrato, texturas, gradientes ou metáfora visual. SEM rostos humanos, SEM texto, SEM logos.`
      const url = await generateSlideImage(prompt, '1:1', useExpertPhoto ? expertPhotoBase64 : undefined)
      savePost({ ...current, imageUrl: url })
      toast.success(`${useExpertPhoto ? 'Foto expert' : 'Fundo'} gerado!`, { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally { setGeneratingImg(false) }
  }

  const download = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const blob = await exportSlideAsImage(cardRef.current, 3)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `post-${Date.now()}.png`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Erro ao exportar') } finally { setDownloading(false) }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key)
    setTimeout(() => setCopied(''), 2000); toast.success('Copiado!')
  }

  const bgColor = palette.p.background || palette.p.secondary
  const txtColor = palette.p.text || palette.p.accent

  const renderCard = () => {
    const pad = Math.round(SIZE * 0.08)
    const hLen = post.headline.length
    const totalLen = hLen + post.subtitle.length

    // Auto-scale headline
    const scaleH = (base: number) => (hLen > 80 ? base * 0.55 : hLen > 60 ? base * 0.65 : hLen > 40 ? base * 0.8 : base) * fontScale
    // Auto-scale subtitle
    const scaleS = (base: number) => (totalLen > 300 ? base * 0.7 : totalLen > 200 ? base * 0.8 : totalLen > 120 ? base * 0.9 : base) * fontScale

    const color = post.imageUrl ? palette.p.primary : txtColor
    const subColor = post.imageUrl ? `${palette.p.primary}dd` : `${txtColor}cc`
    const brandEl = (
      <span style={{ fontSize: 8, color: subColor, opacity: 0.5, letterSpacing: 2, textTransform: 'uppercase' as const, fontFamily: 'monospace' }}>
        {profile?.name || 'sua marca'}
      </span>
    )
    const logoEl = logo && <img src={logo} alt="" style={{ height: 20, maxWidth: 60, objectFit: 'contain' as const, opacity: 0.7 }} />

    // ── PHOTO LEFT / PHOTO RIGHT ──
    if (layout === 'photo-left' || layout === 'photo-right') {
      const imgSide = post.imageUrl
        ? <div style={{ width: '45%', height: '100%', background: `url(${post.imageUrl}) center/cover no-repeat`, flexShrink: 0 }} />
        : <div style={{ width: '45%', height: '100%', background: palette.p.primary, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 48, opacity: 0.3, color: palette.p.accent }}>✦</span>
          </div>
      const textSide = (
        <div style={{ flex: 1, padding: pad, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: bgColor }}>
          <h2 style={{ fontSize: scaleH(20), fontWeight: 900, color: txtColor, lineHeight: 1.15, margin: 0, fontFamily: font.title, letterSpacing: '-0.02em' }}>{post.headline}</h2>
          {post.subtitle && <><div style={{ height: 8 }} /><p style={{ fontSize: scaleS(11), color: `${txtColor}cc`, lineHeight: 1.5, margin: 0, fontFamily: font.sub }}>{post.subtitle}</p></>}
          <div style={{ marginTop: 'auto', paddingTop: 12 }}>{brandEl}</div>
        </div>
      )
      return (
        <div ref={cardRef} style={{ width: SIZE, height: SIZE, display: 'flex', flexDirection: layout === 'photo-left' ? 'row' : 'row-reverse', overflow: 'hidden', position: 'relative', fontFamily: font.sub, boxSizing: 'border-box' }}>
          {imgSide}{textSide}
        </div>
      )
    }

    // ── EDITORIAL ──
    if (layout === 'editorial') {
      const bg = post.imageUrl
        ? `linear-gradient(to bottom, ${bgColor}10 0%, ${bgColor}60 40%, ${bgColor}ee 100%), url(${post.imageUrl}) center/cover no-repeat`
        : bgColor
      return (
        <div ref={cardRef} style={{ width: SIZE, height: SIZE, background: bg, padding: pad * 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative', fontFamily: font.sub, boxSizing: 'border-box' }}>
          <div style={{ width: 4, height: 50, background: palette.p.primary, borderRadius: 2, marginBottom: 16 }} />
          <h2 style={{ fontSize: scaleH(24), fontWeight: 900, color, lineHeight: 1.15, margin: 0, fontFamily: font.title, letterSpacing: '-0.02em', textTransform: 'uppercase' as const }}>{post.headline}</h2>
          {post.subtitle && <><div style={{ height: 10 }} /><p style={{ fontSize: scaleS(12), color: subColor, lineHeight: 1.6, margin: 0, fontFamily: font.sub }}>{post.subtitle}</p></>}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{brandEl}{logoEl}</div>
        </div>
      )
    }

    // ── QUOTE ──
    if (layout === 'quote') {
      const bg = post.imageUrl
        ? `linear-gradient(to bottom, ${bgColor}20 0%, ${bgColor}80 50%, ${bgColor}ee 100%), url(${post.imageUrl}) center/cover no-repeat`
        : bgColor
      return (
        <div ref={cardRef} style={{ width: SIZE, height: SIZE, background: bg, padding: pad * 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative', fontFamily: font.sub, boxSizing: 'border-box', textAlign: 'center' }}>
          <div style={{ fontSize: 64, color: palette.p.primary, lineHeight: 0.8, marginBottom: 12, fontFamily: 'Georgia, serif', opacity: 0.6 }}>"</div>
          <h2 style={{ fontSize: scaleH(22), fontWeight: 700, color, lineHeight: 1.3, margin: 0, fontFamily: font.title, fontStyle: 'italic' }}>{post.headline}</h2>
          {post.subtitle && <><div style={{ height: 12 }} /><p style={{ fontSize: scaleS(11), color: subColor, lineHeight: 1.6, margin: 0, fontFamily: font.sub }}>{post.subtitle}</p></>}
          <div style={{ marginTop: 24, width: 40, height: 2, background: palette.p.primary, borderRadius: 1 }} />
          <div style={{ marginTop: 12 }}>{brandEl}</div>
        </div>
      )
    }

    // ── CTA ──
    if (layout === 'cta') {
      const bg = post.imageUrl
        ? `linear-gradient(to bottom, ${bgColor}10 0%, ${bgColor}50 40%, ${bgColor}ee 100%), url(${post.imageUrl}) center/cover no-repeat`
        : `linear-gradient(145deg, ${bgColor} 0%, ${palette.p.secondary} 100%)`
      return (
        <div ref={cardRef} style={{ width: SIZE, height: SIZE, background: bg, padding: pad * 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative', fontFamily: font.sub, boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: scaleH(28), fontWeight: 900, color, lineHeight: 1.1, margin: 0, fontFamily: font.title, letterSpacing: '-0.02em' }}>{post.headline}</h2>
          {post.subtitle && <><div style={{ height: 8 }} /><p style={{ fontSize: scaleS(12), color: subColor, lineHeight: 1.5, margin: 0, fontFamily: font.sub }}>{post.subtitle}</p></>}
          <div style={{ marginTop: 20, padding: '12px 24px', background: palette.p.primary, borderRadius: 12, textAlign: 'center', alignSelf: 'stretch' }}>
            <span style={{ color: palette.p.accent, fontSize: 14 * fontScale, fontWeight: 800, fontFamily: font.sub, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Saiba mais →</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{brandEl}{logoEl}</div>
        </div>
      )
    }

    // ── MINIMAL (default) ──
    const bg = post.imageUrl
      ? `linear-gradient(to bottom, ${bgColor}10 0%, ${bgColor}40 35%, ${bgColor}dd 100%), url(${post.imageUrl}) center/cover no-repeat`
      : `linear-gradient(145deg, ${bgColor} 0%, ${palette.p.secondary} 100%)`
    return (
      <div ref={cardRef} style={{ width: SIZE, height: SIZE, background: bg, padding: pad, display: 'flex', flexDirection: 'column', justifyContent: post.imageUrl ? 'flex-end' : 'space-between', boxSizing: 'border-box', overflow: 'hidden', position: 'relative', fontFamily: font.sub }}>
        <div />
        <div>
          <h2 style={{ fontSize: scaleH(26), fontWeight: 900, color, lineHeight: 1.15, margin: 0, fontFamily: font.title, letterSpacing: '-0.02em' }}>{post.headline}</h2>
          {post.subtitle && <><div style={{ height: 8 }} /><p style={{ fontSize: scaleS(13), color: subColor, lineHeight: 1.5, margin: 0, fontFamily: font.sub }}>{post.subtitle}</p></>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{brandEl}{logoEl}</div>
      </div>
    )
  }

  const fullCaption = `${post.caption.hook}\n\n${post.caption.body}\n\n${post.caption.cta}\n\n${post.caption.hashtags}`

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">{currentProject?.name || 'Post'}</h1>
            <p className="text-xs text-gray-400">1080×1080</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('post-editor' as View)} className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 hover:border-violet-400 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold transition-all">
            <Pencil size={14} /> Voltar ao Editor
          </button>
          <button onClick={download} disabled={downloading} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            <Download size={15} /> Download PNG
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Card + Controls */}
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette size={11} /> Cor</p>
                <div className="flex gap-2">
                  {allPalettes.map(p => (
                    <button key={p.id} onClick={() => setPalette(p)} title={p.label} className={cn('w-7 h-7 rounded-full transition-all border', palette.id === p.id ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-105', p.p.background === '#ffffff' ? 'border-gray-300' : 'border-transparent')} style={{ background: `linear-gradient(135deg, ${p.p.background || p.p.secondary} 50%, ${p.p.primary} 50%)` }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Type size={11} /> Fonte</p>
                <div className="flex gap-1">
                  {FONTS.map(f => (
                    <button key={f.id} onClick={() => setFont(f)} className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all', font.id === f.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Type size={11} /> Tamanho</p>
                <div className="flex items-center gap-2">
                  <input type="range" min="0.7" max="1.8" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-20 h-1.5 accent-violet-600" />
                  <span className="text-xs text-gray-500 font-mono w-8">{Math.round(fontScale * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Card */}
            <div style={{ width: SIZE, borderRadius: 12, overflow: 'hidden' }} className="shadow-lg">
              {renderCard()}
            </div>

            {/* Download + Regenerate buttons */}
            <div className="flex gap-2" style={{ width: SIZE }}>
              <button onClick={download} disabled={downloading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg">
                <Download size={16} /> {downloading ? 'Exportando...' : 'Download PNG'}
              </button>
              <button onClick={() => genImage(true)} disabled={generatingImg} className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg" title="Gerar nova foto mantendo texto e cores">
                <RefreshCw size={16} className={generatingImg ? 'animate-spin' : ''} /> Regenerar
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-1" style={{ width: SIZE }}>
              <button onClick={() => savePost({ ...post, imageUrl: undefined })} className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all', !post.imageUrl ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>🎨 Cor</button>
              <label className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border text-center cursor-pointer transition-all', post.imageUrl ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                <Image size={12} className="inline mr-1" />Foto
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <button onClick={() => genImage(true)} disabled={generatingImg} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-40" title="Gerar foto com sua imagem">
                <Wand2 size={10} className="inline mr-0.5" />Foto Expert
              </button>
              <button onClick={() => genImage(false)} disabled={generatingImg} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-40" title="Gerar fundo abstrato sem rosto">
                <Wand2 size={10} className="inline mr-0.5" />Fundo IA
              </button>
            </div>

            {/* Layouts */}
            <div className="flex flex-wrap gap-1" style={{ width: SIZE }}>
              {LAYOUTS.map(l => (
                <button key={l.id} onClick={() => { setLayout(l.id); savePost({ ...post, layout: l.id }) }} className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border transition-all', layout === l.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700' : 'border-gray-200 dark:border-gray-700 text-gray-400')}>{l.label}</button>
              ))}
            </div>

            {/* Edit text */}
            <button onClick={() => setEditingText(!editingText)} className="text-xs text-violet-600 hover:underline">✎ Editar texto</button>
            {editingText && (
              <div className="space-y-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-violet-300" style={{ width: SIZE }}>
                <input value={post.headline} onChange={e => savePost({ ...post, headline: e.target.value })} className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white" placeholder="Título" />
                <textarea value={post.subtitle} onChange={e => savePost({ ...post, subtitle: e.target.value })} rows={3} className="w-full px-2.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white resize-none" placeholder="Subtítulo" />
              </div>
            )}
          </div>

          {/* Right: Caption */}
          <div className="flex-1 max-w-md">
            <CaptionEditor
              caption={post.caption}
              onChange={(updated: Caption) => {
                savePost({ ...post, caption: updated })
              }}
              projectName={currentProject?.name || 'post'}
              niche={profile?.niche || ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
