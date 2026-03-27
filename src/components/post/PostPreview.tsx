import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Download, Wand2, Copy, Check, Palette, Type, Image } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
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
  if (bk) base.push({ id: 'brand', label: profile?.name || 'Sua Marca', p: bk.colors })
  return [
    ...base,
    { id: 'violet', label: 'Violeta', p: { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc', background: '#0f0a1a', text: '#ffffff' } },
    { id: 'gold', label: 'Ouro', p: { primary: '#d97706', secondary: '#050505', accent: '#fafafa', background: '#050505', text: '#fafafa' } },
    { id: 'rose', label: 'Rosa', p: { primary: '#ec4899', secondary: '#1f001a', accent: '#fff', background: '#1f001a', text: '#ffffff' } },
    { id: 'white', label: 'Branco', p: { primary: '#1e293b', secondary: '#f8fafc', accent: '#1e293b', background: '#f8fafc', text: '#1e293b' } },
  ]
}

function buildFonts() {
  const profile = getDefaultProfile()
  const bk = profile?.brandKit
  const base: { id: string; label: string; title: string; sub: string }[] = []
  if (bk) base.push({ id: 'brand', label: 'Sua Marca', title: `"${bk.fonts.title.family}", ${bk.fonts.title.category}`, sub: `"${bk.fonts.body.family}", ${bk.fonts.body.category}` })
  return [...base, { id: 'inter', label: 'Inter', title: 'Inter, sans-serif', sub: 'Inter, sans-serif' }, { id: 'playfair', label: 'Elegante', title: '"Playfair Display", serif', sub: 'Inter, sans-serif' }]
}

const SIZE = 360

export default function PostPreview() {
  const { currentProject, setView, apiKey, expertPhotoBase64, refreshProjects } = useApp()
  const postData = currentProject?.current_post_data
  const profile = getDefaultProfile()
  const logo = profile?.brandKit?.logo

  const PALETTES = buildPalettes()
  const FONTS = buildFonts()

  const [palette, setPalette] = useState(PALETTES[0])
  const [font, setFont] = useState(FONTS[0])
  const [post, setPost] = useState<PostData | null>(postData || null)
  const [layout, setLayout] = useState<LayoutType>(postData?.layout || 'minimal')
  const [generatingImg, setGeneratingImg] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editingText, setEditingText] = useState(false)
  const [copied, setCopied] = useState('')

  const cardRef = useRef<HTMLDivElement>(null)

  if (!post) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum post carregado</p>
          <button onClick={() => setView('post-editor' as any)} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Criar post</button>
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

  const genImage = async () => {
    if (!apiKey) { toast.error('Configure chave Gemini'); return }
    setGeneratingImg(true)
    const toastId = toast.loading('Gerando imagem...')
    try {
      const url = await generateSlideImage(post.visualPrompt, '1:1', expertPhotoBase64)
      savePost({ ...post, imageUrl: url })
      toast.success('Imagem gerada!', { id: toastId })
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
    const bg = post.imageUrl
      ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.55)), url(${post.imageUrl}) center/cover no-repeat`
      : `linear-gradient(145deg, ${bgColor} 0%, ${palette.p.secondary} 100%)`
    const color = post.imageUrl ? '#ffffff' : txtColor
    const subColor = post.imageUrl ? 'rgba(255,255,255,0.8)' : `${txtColor}cc`
    const pad = Math.round(SIZE * 0.08)

    const isPhotoLayout = layout === 'photo-left' || layout === 'photo-right'
    const isQuote = layout === 'quote'
    const isCta = layout === 'cta'

    return (
      <div ref={cardRef} style={{ width: SIZE, height: SIZE, background: bg, padding: pad, display: 'flex', flexDirection: isPhotoLayout ? 'row' : 'column', justifyContent: isCta ? 'flex-end' : isQuote ? 'center' : 'space-between', alignItems: isPhotoLayout ? 'center' : undefined, boxSizing: 'border-box', overflow: 'hidden', position: 'relative', fontFamily: font.sub }}>
        {/* Accent bar for editorial */}
        {layout === 'editorial' && (
          <div style={{ width: 4, height: 40, background: palette.p.primary, borderRadius: 2, marginBottom: 12 }} />
        )}

        {/* Quote marks */}
        {isQuote && (
          <div style={{ fontSize: 48, color: palette.p.primary, lineHeight: 1, marginBottom: 8, fontFamily: 'Georgia, serif' }}>"</div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: isPhotoLayout ? 20 : 26, fontWeight: 900, color, lineHeight: 1.15, margin: 0, fontFamily: font.title, letterSpacing: '-0.02em' }}>
            {post.headline}
          </h2>
          <div style={{ height: 10 }} />
          <p style={{ fontSize: 13, color: subColor, lineHeight: 1.6, margin: 0, fontFamily: font.sub }}>
            {post.subtitle}
          </p>
        </div>

        {/* CTA button */}
        {isCta && (
          <div style={{ marginTop: 16, padding: '10px 20px', background: palette.p.primary, borderRadius: 8, textAlign: 'center' }}>
            <span style={{ color: palette.p.accent, fontSize: 13, fontWeight: 700, fontFamily: font.sub }}>Saiba mais</span>
          </div>
        )}

        {/* Logo */}
        {logo && (
          <div style={{ position: 'absolute', bottom: pad, right: pad }}>
            <img src={logo} alt="" style={{ height: 20, maxWidth: 60, objectFit: 'contain', opacity: 0.7 }} />
          </div>
        )}

        {/* Brand name */}
        <div style={{ position: 'absolute', bottom: pad, left: pad }}>
          <span style={{ fontSize: 8, color: subColor, opacity: 0.5, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
            {profile?.name || 'sua marca'}
          </span>
        </div>
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
        <button onClick={download} disabled={downloading} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          <Download size={15} /> Download PNG
        </button>
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
                  {PALETTES.map(p => (
                    <button key={p.id} onClick={() => setPalette(p)} title={p.label} style={{ background: p.p.primary }} className={cn('w-6 h-6 rounded-full transition-all', palette.id === p.id ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-105')} />
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
            </div>

            {/* Card */}
            <div style={{ width: SIZE, borderRadius: 12, overflow: 'hidden' }} className="shadow-lg">
              {renderCard()}
            </div>

            {/* Actions */}
            <div className="flex gap-1" style={{ width: SIZE }}>
              <button onClick={() => savePost({ ...post, imageUrl: undefined })} className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all', !post.imageUrl ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>🎨 Cor</button>
              <label className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border text-center cursor-pointer transition-all', post.imageUrl ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                <Image size={12} className="inline mr-1" />Foto
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <button onClick={genImage} disabled={generatingImg} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-40">
                <Wand2 size={12} className="inline mr-1" />IA
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
