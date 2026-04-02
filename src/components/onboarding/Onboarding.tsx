import { useState, useRef } from 'react'
import { Camera, X, Loader2, Check, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import type { SpecialistProfile, Tone, Platform, SlideCount, BrandKit, BrandFont, ColorPalette } from '../../types'
import type { StylePackId } from '../../types/stylePacks'
import { saveProfile } from '../../services/storageService'
import { generateVoiceBlueprint } from '../../services/geminiService'
import { STYLE_PACKS } from '../shared/StylePacks'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

// ── Presets ──

const PRESET_PALETTES: { id: string; label: string; colors: ColorPalette }[] = [
  { id: 'elegante', label: 'Elegante Roxo', colors: { primary: '#7c3aed', secondary: '#0f172a', accent: '#f8fafc', background: '#0f0a1a', text: '#ffffff' } },
  { id: 'gold', label: 'Ouro & Preto', colors: { primary: '#d4a017', secondary: '#1a1a1a', accent: '#fffbeb', background: '#050505', text: '#fafafa' } },
  { id: 'rose', label: 'Rosa Dourado', colors: { primary: '#e11d77', secondary: '#2d0a1e', accent: '#fdf2f8', background: '#1a0a12', text: '#ffffff' } },
  { id: 'clean', label: 'Clean Moderno', colors: { primary: '#1e293b', secondary: '#f8fafc', accent: '#3b82f6', background: '#ffffff', text: '#1e293b' } },
  { id: 'terra', label: 'Terra & Verde', colors: { primary: '#78350f', secondary: '#064e3b', accent: '#fef3c7', background: '#0a1f14', text: '#f5f5f4' } },
  { id: 'ocean', label: 'Oceano', colors: { primary: '#0891b2', secondary: '#0c1a2e', accent: '#ecfeff', background: '#0a1628', text: '#f0f9ff' } },
  { id: 'sunset', label: 'Pôr do Sol', colors: { primary: '#ea580c', secondary: '#1c0a00', accent: '#fff7ed', background: '#0f0602', text: '#ffffff' } },
  { id: 'sage', label: 'Sálvia Suave', colors: { primary: '#65a30d', secondary: '#1a2e05', accent: '#f7fee7', background: '#0f1a03', text: '#ecfccb' } },
]

const FONT_OPTIONS: BrandFont[] = [
  { family: 'Inter', category: 'sans-serif' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Montserrat', category: 'sans-serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Poppins', category: 'sans-serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Raleway', category: 'sans-serif' },
  { family: 'Cormorant Garamond', category: 'serif' },
  { family: 'Nunito', category: 'sans-serif' },
  { family: 'DM Sans', category: 'sans-serif' },
]

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: 'descontraído', label: 'Descontraído', emoji: '😊' },
  { id: 'profissional', label: 'Profissional', emoji: '💼' },
  { id: 'inspirador', label: 'Inspirador', emoji: '✨' },
  { id: 'urgente', label: 'Urgente', emoji: '🔥' },
  { id: 'educativo', label: 'Educativo', emoji: '📚' },
  { id: 'provocador', label: 'Provocador', emoji: '🎯' },
  { id: 'afetuoso', label: 'Afetuoso', emoji: '💜' },
]

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'threads', label: 'Threads' },
  { id: 'pinterest', label: 'Pinterest' },
]

const SLIDE_COUNTS: SlideCount[] = [5, 7, 8, 10]

const VOICE_QUESTIONS: { key: string; label: string; placeholder: string }[] = [
  { key: 'comunicacao', label: 'Como você se comunica com seus seguidores?', placeholder: 'Ex: De forma direta e acolhedora, como uma conversa entre amigas...' },
  { key: 'crencas', label: 'Suas 3 crenças centrais sobre sua área', placeholder: 'Ex: 1. Terapia não é luxo, é necessidade. 2. Todo mundo merece...' },
  { key: 'palavrasUsa', label: 'Palavras/expressões que você sempre usa', placeholder: 'Ex: "regulação emocional", "presença", "você não está sozinha"...' },
  { key: 'palavrasNunca', label: 'Palavras que você NUNCA usaria', placeholder: 'Ex: Nunca uso "cura milagrosa", nunca prometo resultado em X dias...' },
  { key: 'transformacao', label: 'Transformação real que você entrega', placeholder: 'Ex: A pessoa sai sabendo nomear suas emoções e agir com mais clareza...' },
  { key: 'diferencial', label: 'O que te diferencia no nicho', placeholder: 'Ex: Combino neurociência com escuta profunda...' },
  { key: 'emocao', label: 'Como quer que a pessoa se sinta ao ver seu conteúdo', placeholder: 'Ex: Compreendida, menos sozinha, com clareza...' },
  { key: 'referencia', label: 'Descreva um conteúdo seu perfeito', placeholder: 'Ex: O post "Ansiedade não é fraqueza" porque tocou em vergonha sem julgamento...' },
]

const STEP_TITLES = [
  'Quem é você?',
  'Sua Identidade Visual',
  'Fontes, Logo e Fotos',
  'Sua Voz Única',
]

const STEP_SUBTITLES = [
  'Dados básicos que definem seu conteúdo',
  'Escolha a paleta de cores da sua marca',
  'Tipografia, logo e fotos do seu rosto',
  'Blueprint da Voz — calibra a IA para soar como você',
]

// ── Component ──

interface Props {
  onComplete: () => void
  apiKey: string
  existingProfile?: SpecialistProfile
}

export default function Onboarding({ onComplete, apiKey, existingProfile }: Props) {
  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState(existingProfile?.name || '')
  const [instagramHandle, setInstagramHandle] = useState(existingProfile?.instagramHandle || '')
  const [niche, setNiche] = useState(existingProfile?.niche || '')
  const [targetAudience, setTargetAudience] = useState(existingProfile?.targetAudience || '')
  const [tone, setTone] = useState<Tone>(existingProfile?.tone || 'descontraído')
  const [platform, setPlatform] = useState<Platform>(existingProfile?.default_platform || 'instagram')
  const [slideCount, setSlideCount] = useState<SlideCount>(existingProfile?.default_slide_count || 8)

  // Step 2 - Colors + Style Pack
  const [selectedPalette, setSelectedPalette] = useState<string>(
    existingProfile?.brandKit ? 'custom' : 'elegante'
  )
  const [colors, setColors] = useState<ColorPalette>(
    existingProfile?.brandKit?.colors || PRESET_PALETTES[0].colors
  )
  const [stylePackId, setStylePackId] = useState<StylePackId>(
    (existingProfile?.stylePackId as StylePackId) || 'presenca-dourada'
  )

  // Step 3 - Fonts, logo, photos
  const [titleFont, setTitleFont] = useState<BrandFont>(
    existingProfile?.brandKit?.fonts.title || FONT_OPTIONS[1] // Playfair Display
  )
  const [bodyFont, setBodyFont] = useState<BrandFont>(
    existingProfile?.brandKit?.fonts.body || FONT_OPTIONS[0] // Inter
  )
  const [logo, setLogo] = useState<string | undefined>(existingProfile?.brandKit?.logo)
  const [photos, setPhotos] = useState<string[]>(existingProfile?.brandKit?.photos || [])

  // Step 4 - Blueprint
  const [blueprintTab, setBlueprintTab] = useState<'guided' | 'direct'>('direct')
  const [voiceBlueprint, setVoiceBlueprint] = useState(existingProfile?.voiceBlueprint || '')
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({})
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false)

  const [error, setError] = useState('')
  const logoRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  // ── Handlers ──

  const selectPalette = (id: string) => {
    setSelectedPalette(id)
    const preset = PRESET_PALETTES.find(p => p.id === id)
    if (preset) setColors(preset.colors)
  }

  const updateColor = (key: keyof ColorPalette, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
    setSelectedPalette('custom')
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200_000) { toast.error('Logo muito grande (máx 200KB)'); return }
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photos.length >= 3) { toast.error('Máximo 3 fotos do rosto'); return }
    const reader = new FileReader()
    reader.onload = ev => setPhotos(prev => [...prev, ev.target?.result as string])
    reader.readAsDataURL(file)
  }

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx))

  const handleGenerateBlueprint = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configurações primeiro'); return }
    const filledCount = Object.values(guidedAnswers).filter(v => v.trim()).length
    if (filledCount < 3) { toast.error('Responda pelo menos 3 perguntas'); return }

    setIsGeneratingBlueprint(true)
    const toastId = toast.loading('Gerando Blueprint da Voz...')
    try {
      const blueprint = await generateVoiceBlueprint(guidedAnswers, name, niche)
      setVoiceBlueprint(blueprint)
      toast.success('Blueprint gerado! Revise antes de salvar.', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      toast.error(msg, { id: toastId })
    } finally {
      setIsGeneratingBlueprint(false)
    }
  }

  // ── Validation ──

  const validateStep = (s: number): boolean => {
    setError('')
    if (s === 1) {
      if (!name.trim()) { setError('Digite seu nome'); return false }
      if (!niche.trim()) { setError('Escolha seu nicho'); return false }
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    setStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  // ── Save ──

  const handleSave = () => {
    if (!validateStep(1)) { setStep(1); return }

    const brandKit: BrandKit = {
      colors,
      fonts: { title: titleFont, body: bodyFont },
      logo,
      photos,
    }

    const profile: SpecialistProfile = {
      id: existingProfile?.id || crypto.randomUUID(),
      name: name.trim(),
      instagramHandle: instagramHandle.trim() || undefined,
      niche: niche.trim(),
      targetAudience: targetAudience.trim(),
      tone,
      bio: '',
      color_palette: { primary: colors.primary, secondary: colors.secondary, accent: colors.accent, background: colors.background, text: colors.text },
      brandKit,
      default_platform: platform,
      default_slide_count: slideCount,
      is_default: true,
      created_at: existingProfile?.created_at || new Date().toISOString(),
      voiceBlueprint: voiceBlueprint.trim() || undefined,
      stylePackId,
    }

    saveProfile(profile)
    toast.success('Perfil salvo com sucesso!')
    onComplete()
  }

  // ── Render helpers ──

  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 mb-4">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{STEP_TITLES[step - 1]}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{STEP_SUBTITLES[step - 1]}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => { if (s < step || validateStep(step)) setStep(s) }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  s < step ? 'bg-violet-600 text-white' :
                  s === step ? 'bg-violet-700 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950' :
                  'border-2 border-gray-300 dark:border-gray-700 text-gray-400'
                )}
              >
                {s < step ? <Check size={14} /> : s}
              </button>
              {s < 4 && <div className={cn('w-8 h-0.5 rounded', s < step ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-700')} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">

          {/* ── STEP 1: Dados básicos ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Seu nome / marca *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Dra. Marina Santos" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">@ do Instagram</label>
                <input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} placeholder="Ex: @dra.marina.santos" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nicho *</label>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ex: Psicologia, Coaching, Nutrição..." className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Público-alvo</label>
                <textarea
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  placeholder="Ex: Mulheres de 30-45 anos que sofrem de ansiedade e buscam autoconhecimento..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Tom de voz</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all',
                        tone === t.id
                          ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                      )}
                    >
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Plataforma</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                          platform === p.id
                            ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Slides padrão</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SLIDE_COUNTS.map(n => (
                      <button
                        key={n}
                        onClick={() => setSlideCount(n)}
                        className={cn(
                          'py-2 rounded-xl text-xs font-bold border transition-all',
                          slideCount === n
                            ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Paleta de cores ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Escolha uma paleta</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_PALETTES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPalette(p.id)}
                      className={cn(
                        'rounded-xl border-2 p-3 transition-all text-left',
                        selectedPalette === p.id
                          ? 'border-violet-500 shadow-lg shadow-violet-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      )}
                    >
                      <div className="flex gap-1 mb-2">
                        {[p.colors.primary, p.colors.secondary, p.colors.accent].map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600" style={{ background: c }} />
                        ))}
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom colors */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Personalizar cores</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { key: 'primary' as const, label: 'Primária' },
                    { key: 'secondary' as const, label: 'Secundária' },
                    { key: 'accent' as const, label: 'Destaque' },
                    { key: 'background' as const, label: 'Fundo' },
                    { key: 'text' as const, label: 'Texto' },
                  ]).map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors[item.key]}
                        onChange={e => updateColor(item.key, e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{colors[item.key]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Preview</label>
                <div
                  className="rounded-2xl p-6 border"
                  style={{ background: colors.background, borderColor: colors.primary + '40' }}
                >
                  <h3 style={{ color: colors.primary, fontFamily: titleFont.family }} className="text-xl font-bold mb-2">
                    Título de exemplo
                  </h3>
                  <p style={{ color: colors.text, fontFamily: bodyFont.family }} className="text-sm mb-3 opacity-80">
                    Este é um exemplo de como seu conteúdo vai ficar com as cores e fontes escolhidas.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: colors.primary, color: colors.accent }}>
                      CTA Principal
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: colors.secondary, color: colors.text }}>
                      Secundário
                    </span>
                  </div>
                </div>
              </div>

              {/* Estilo AUTOR.IA */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Estilo AUTOR.IA</label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Escolha o estilo dos seus carrosseis. Voce configura UMA VEZ e todos saem prontos.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['presenca-dourada', 'diario-artesanal', 'impacto-editorial'] as const).map(packId => {
                    const pack = STYLE_PACKS[packId]
                    if (!pack) return null
                    const isActive = stylePackId === packId
                    return (
                      <button
                        key={packId}
                        onClick={() => setStylePackId(packId)}
                        className={cn(
                          'rounded-xl border-2 p-4 transition-all text-left',
                          isActive
                            ? 'border-violet-500 shadow-lg shadow-violet-500/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <div className="flex gap-1.5 mb-2">
                          <div className="w-6 h-6 rounded-full" style={{ background: pack.palette.dark, border: '1px solid rgba(255,255,255,0.1)' }} />
                          <div className="w-6 h-6 rounded-full" style={{ background: pack.palette.accent }} />
                          <div className="w-6 h-6 rounded-full" style={{ background: pack.palette.light }} />
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{pack.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{pack.description}</p>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setStylePackId('livre')}
                  className={cn(
                    'mt-2 w-full px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left',
                    stylePackId === 'livre'
                      ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  )}
                >
                  Modo Livre — controle total de cores e layout manualmente
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Fontes, Logo, Fotos ── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Fontes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Fonte do título</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_OPTIONS.map(f => (
                    <button
                      key={f.family}
                      onClick={() => setTitleFont(f)}
                      className={cn(
                        'px-4 py-3 rounded-xl border text-left transition-all',
                        titleFont.family === f.family
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      )}
                    >
                      <span style={{ fontFamily: `"${f.family}", ${f.category}` }} className="text-sm font-bold text-gray-800 dark:text-white">
                        {f.family}
                      </span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">{f.category}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Fonte do corpo</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_OPTIONS.filter(f => f.category === 'sans-serif').map(f => (
                    <button
                      key={f.family}
                      onClick={() => setBodyFont(f)}
                      className={cn(
                        'px-4 py-3 rounded-xl border text-left transition-all',
                        bodyFont.family === f.family
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      )}
                    >
                      <span style={{ fontFamily: `"${f.family}", ${f.category}` }} className="text-sm text-gray-700 dark:text-gray-300">
                        {f.family}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Logo <span className="text-gray-400 font-normal normal-case">(opcional, PNG/JPG, máx 200KB)</span>
                </label>
                <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                {logo ? (
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="Logo" className="h-12 max-w-[120px] object-contain rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white" />
                    <button onClick={() => setLogo(undefined)} className="text-xs text-red-500 hover:underline">Remover</button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-all"
                  >
                    Enviar logo
                  </button>
                )}
              </div>

              {/* Fotos do rosto */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Fotos do rosto <span className="text-gray-400 font-normal normal-case">(até 3 — a IA nunca altera seu rosto)</span>
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Quando você gerar imagens com IA, ela muda cenário e roupa, mas mantém seu rosto exatamente como é.
                </p>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <div className="flex items-center gap-3">
                  {photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-xl object-cover border-2 border-violet-400" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      onClick={() => photoRef.current?.click()}
                      className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-all"
                    >
                      <Camera size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Blueprint da Voz ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-xl p-3 border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                <Sparkles size={14} className="mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Campo opcional.</span> O Blueprint calibra toda a IA para gerar conteúdo com a sua voz. Você pode pular e adicionar depois.
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                <button
                  onClick={() => setBlueprintTab('direct')}
                  className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', blueprintTab === 'direct' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
                >
                  Colar direto
                </button>
                <button
                  onClick={() => setBlueprintTab('guided')}
                  className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', blueprintTab === 'guided' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
                >
                  Guiado (IA gera)
                </button>
              </div>

              {blueprintTab === 'direct' ? (
                <textarea
                  value={voiceBlueprint}
                  onChange={e => setVoiceBlueprint(e.target.value)}
                  placeholder="Cole aqui o seu blueprint gerado pelo Luminae, ChatGPT, ou escreva manualmente..."
                  rows={10}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              ) : (
                <div className="space-y-3">
                  {VOICE_QUESTIONS.map(q => (
                    <div key={q.key}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{q.label}</label>
                      <textarea
                        value={guidedAnswers[q.key] || ''}
                        onChange={e => setGuidedAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                        placeholder={q.placeholder}
                        rows={2}
                        className={`${inputCls} resize-none leading-relaxed`}
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleGenerateBlueprint}
                    disabled={isGeneratingBlueprint}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingBlueprint ? <><Loader2 size={16} className="animate-spin" /> Gerando...</> : <><Sparkles size={14} /> Gerar Blueprint com IA</>}
                  </button>
                  {voiceBlueprint && (
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Blueprint gerado — revise:</label>
                      <textarea
                        value={voiceBlueprint}
                        onChange={e => setVoiceBlueprint(e.target.value)}
                        rows={10}
                        className={`${inputCls} resize-none leading-relaxed font-mono text-xs`}
                      />
                    </div>
                  )}
                </div>
              )}

              {voiceBlueprint && (
                <p className="text-xs text-gray-400">{voiceBlueprint.length} caracteres</p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
              >
                <Check size={16} /> Salvar e Começar
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Tudo fica salvo no seu navegador. Você pode alterar depois nos Perfis.
        </p>
      </div>
    </div>
  )
}
