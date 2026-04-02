import { useState } from 'react'
import { Check, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import type { SpecialistProfile, Tone, Platform, SlideCount, BrandKit, ColorPalette } from '../../types'
import type { StylePackId } from '../../types/stylePacks'
import { saveProfile } from '../../services/storageService'
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
  { id: 'sunset', label: 'Por do Sol', colors: { primary: '#ea580c', secondary: '#1c0a00', accent: '#fff7ed', background: '#0f0602', text: '#ffffff' } },
  { id: 'sage', label: 'Salvia Suave', colors: { primary: '#65a30d', secondary: '#1a2e05', accent: '#f7fee7', background: '#0f1a03', text: '#ecfccb' } },
]

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: 'descontraído', label: 'Descontraido', emoji: '😊' },
  { id: 'profissional', label: 'Profissional', emoji: '💼' },
  { id: 'inspirador', label: 'Inspirador', emoji: '✨' },
  { id: 'urgente', label: 'Urgente', emoji: '🔥' },
  { id: 'educativo', label: 'Educativo', emoji: '📚' },
  { id: 'provocador', label: 'Provocador', emoji: '🎯' },
  { id: 'afetuoso', label: 'Afetuoso', emoji: '💜' },
]

const FONT_OPTIONS = [
  { family: 'Inter', category: 'sans-serif' as const },
  { family: 'Playfair Display', category: 'serif' as const },
]

const STEP_TITLES = [
  'Quem e voce?',
  'Seu Visual',
]

const STEP_SUBTITLES = [
  'So 3 campos obrigatorios — pronto em 30 segundos',
  'Escolha o estilo dos seus conteudos',
]

const TOTAL_STEPS = 2

// ── Component ──

interface Props {
  onComplete: () => void
  existingProfile?: SpecialistProfile
}

export default function Onboarding({ onComplete, existingProfile }: Props) {
  const [step, setStep] = useState(1)

  // Step 1 — Basico
  const [name, setName] = useState(existingProfile?.name || '')
  const [niche, setNiche] = useState(existingProfile?.niche || '')
  const [tone, setTone] = useState<Tone>(existingProfile?.tone || 'inspirador')

  // Step 2 — Visual
  const [selectedPalette, setSelectedPalette] = useState<string>(
    existingProfile?.brandKit ? 'custom' : 'elegante'
  )
  const [colors, setColors] = useState<ColorPalette>(
    existingProfile?.brandKit?.colors || PRESET_PALETTES[0].colors
  )
  const [stylePackId, setStylePackId] = useState<StylePackId>(
    (existingProfile?.stylePackId as StylePackId) || 'presenca-dourada'
  )

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'

  const selectPalette = (id: string) => {
    setSelectedPalette(id)
    const preset = PRESET_PALETTES.find(p => p.id === id)
    if (preset) setColors(preset.colors)
  }

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
    setStep(prev => Math.min(prev + 1, TOTAL_STEPS))
  }

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const handleSave = async () => {
    if (!validateStep(1)) { setStep(1); return }

    setSaving(true)
    try {
      const brandKit: BrandKit = {
        colors,
        fonts: { title: FONT_OPTIONS[1], body: FONT_OPTIONS[0] },
        photos: [],
      }

      const profile: SpecialistProfile = {
        id: existingProfile?.id || crypto.randomUUID(),
        name: name.trim(),
        niche: niche.trim(),
        targetAudience: '',
        tone,
        bio: '',
        color_palette: { primary: colors.primary, secondary: colors.secondary, accent: colors.accent, background: colors.background, text: colors.text },
        brandKit,
        default_platform: 'instagram' as Platform,
        default_slide_count: 8 as SlideCount,
        is_default: true,
        created_at: existingProfile?.created_at || new Date().toISOString(),
        stylePackId,
      }

      await saveProfile(profile)
      toast.success('Perfil criado! Bem-vindo(a) ao AUTOR.IA')
      onComplete()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast.error(msg)
      console.error('[Onboarding] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
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
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  s < step ? 'bg-violet-600 text-white' :
                  s === step ? 'bg-violet-700 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950' :
                  'border-2 border-gray-300 dark:border-gray-700 text-gray-400'
                )}
              >
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < TOTAL_STEPS && <div className={cn('w-8 h-0.5 rounded', s < step ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-700')} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">

          {/* ── STEP 1: Dados basicos ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Seu nome / marca *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Dra. Marina Santos" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nicho *</label>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ex: Psicologia, Coaching, Nutricao..." className={inputCls} />
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
            </div>
          )}

          {/* ── STEP 2: Visual ── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Style Pack */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Estilo dos conteudos</label>
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
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Paleta de cores</label>
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

              {/* Preview */}
              <div
                className="rounded-2xl p-5 border"
                style={{ background: colors.background, borderColor: colors.primary + '40' }}
              >
                <h3 style={{ color: colors.primary }} className="text-lg font-bold mb-1">
                  {name || 'Seu Nome'}
                </h3>
                <p style={{ color: colors.text }} className="text-sm opacity-80">
                  Conteudo sobre {niche || 'seu nicho'} com tom {tone}
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: colors.primary, color: colors.accent }}>
                    Salvar
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: colors.secondary, color: colors.text }}>
                    Compartilhar
                  </span>
                </div>
              </div>
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
            {step < TOTAL_STEPS ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
              >
                Proximo <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                ) : (
                  <><Check size={16} /> Comecar a Criar</>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Voce configura cores, fontes e blueprint da voz depois em Perfis.
        </p>
      </div>
    </div>
  )
}
