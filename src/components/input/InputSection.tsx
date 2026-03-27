import { useState, useRef } from 'react'
import { Wand2, ChevronDown, ChevronUp, Camera, X } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { ProjectInputs, Tone, Platform, SlideCount, SlideData, CarouselData } from '../../types'
import type { InputMode, LuminaeImportData } from '../../types/luminae'
import { createProject, updateProjectCarousel, getDefaultProfile } from '../../services/storageService'
import { generateCarouselCopy, generateCarouselFormat } from '../../services/geminiService'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'
import ContentModeSelector from './ContentModeSelector'
import LuminaeImporter from './LuminaeImporter'

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: 'descontraído', label: 'Descontraido', emoji: '😊' },
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

const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors'
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

export default function InputSection() {
  const { setView, setCurrentProject, setCurrentCarousel, refreshProjects, setIsGenerating, setGenerationPhase, setGenerationProgress, apiKey, setExpertPhotoBase64 } = useApp()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('colar')
  const photoInputRef = useRef<HTMLInputElement>(null)

  const defaultProfile = getDefaultProfile()

  const [form, setForm] = useState<ProjectInputs>({
    projectName: '',
    theme: '',
    product: defaultProfile?.niche ? `${defaultProfile.niche}` : '',
    objective: '',
    investment: '',
    baseText: '',
    contextInfo: '',
    tone: defaultProfile?.tone || 'descontraído',
    niche: defaultProfile?.niche || '',
    platform: defaultProfile?.default_platform || 'instagram',
    slideCount: defaultProfile?.default_slide_count || 8,
    expertPhotoBase64: defaultProfile?.brandKit?.photos?.[0] || undefined,
  })

  const set = (field: keyof ProjectInputs, value: string | number | undefined) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set('expertPhotoBase64', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── LUMINAE IMPORT: Direct, no Gemini ──
  const handleLuminaeImport = (data: LuminaeImportData) => {
    const slides: SlideData[] = data.slides.map((s, i) => ({
      id: i + 1,
      headline: s.headline,
      subtitle: s.subtitle,
      visualPrompt: s.visualPrompt || '',
      emotion: s.emotion || '',
      isGeneratingImage: false,
      style: {},
    }))

    const carousel: CarouselData = {
      strategy: {
        persona: data.strategy?.persona || '',
        painPoint: data.strategy?.painPoint || '',
        desire: data.strategy?.desire || '',
        narrativePath: data.strategy?.narrativePath || '',
        consciousnessLevel: data.nivelConsciencia || data.strategy?.consciousnessLevel || '',
        niche: data.strategy?.niche || form.niche,
        hook: data.strategy?.hook || data.caption.hook,
      },
      slides,
      caption: {
        hook: data.caption.hook,
        body: data.caption.body,
        cta: data.caption.cta,
        hashtags: data.caption.hashtags || '',
        altText: data.caption.altText || '',
      },
      manychat: { keyword: '', flow1: '', flow2: '', flow3: '' },
      format: form.platform === 'linkedin' ? '1:1' : '4:5',
      generatedAt: new Date().toISOString(),
    }

    const projectName = form.projectName || `Luminae — ${data.slides[0]?.headline?.slice(0, 30) || 'Import'}`
    const project = createProject({ ...form, projectName }, 'carousel')
    updateProjectCarousel(project.id, carousel)
    refreshProjects()

    setExpertPhotoBase64(form.expertPhotoBase64)
    setCurrentProject({ ...project, current_carousel_data: carousel })
    setCurrentCarousel(carousel)
    setView('preview')
    toast.success('Conteudo importado do Luminae!')
  }

  // ── COLAR: Gemini FORMAT-ONLY ──
  const handleFormatText = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini API nas Configuracoes'); return }
    if (!form.baseText.trim()) { toast.error('Cole o conteudo para formatar'); return }

    setIsGenerating(true)
    setGenerationProgress(0)
    const toastId = toast.loading('Formatando conteudo...')

    try {
      const carousel = await generateCarouselFormat(form, (phase, pct) => {
        setGenerationPhase(phase)
        setGenerationProgress(pct)
        toast.loading(phase, { id: toastId })
      })

      const projectName = form.projectName || `Formatado — ${form.baseText.slice(0, 30)}`
      const project = createProject({ ...form, projectName }, 'carousel')
      updateProjectCarousel(project.id, carousel)
      refreshProjects()

      setExpertPhotoBase64(form.expertPhotoBase64)
      setCurrentProject({ ...project, current_carousel_data: carousel })
      setCurrentCarousel(carousel)
      setView('preview')
      toast.success('Conteudo formatado em slides!', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao formatar'
      toast.error(msg, { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationPhase('')
      setGenerationProgress(0)
    }
  }

  // ── CRIAR: Full Gemini generation (original behavior) ──
  const handleGenerate = async () => {
    if (!apiKey) {
      toast.error('Configure sua chave Gemini API nas Configuracoes')
      return
    }
    if (!form.theme.trim() || !form.product.trim()) {
      toast.error('Preencha o tema e o produto/servico')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    const toastId = toast.loading('Gerando carrossel...')

    try {
      const carousel = await generateCarouselCopy(form, (phase, pct) => {
        setGenerationPhase(phase)
        setGenerationProgress(pct)
        toast.loading(phase, { id: toastId })
      }, defaultProfile?.voiceBlueprint)

      const project = createProject({ ...form, projectName: form.projectName || `${form.theme} — ${form.product}` })
      updateProjectCarousel(project.id, carousel)
      refreshProjects()

      setExpertPhotoBase64(form.expertPhotoBase64)
      setCurrentProject({ ...project, current_carousel_data: carousel })
      setCurrentCarousel(carousel)
      setView('preview')
      toast.success('Carrossel gerado!', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar'
      toast.error(msg, { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationPhase('')
      setGenerationProgress(0)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Novo Carrossel</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Escolha como criar: importe do Luminae, cole um texto, ou crie do zero com IA.</p>
      </div>

      <div className="space-y-5">
        {/* Mode selector */}
        <ContentModeSelector mode={inputMode} onChange={setInputMode} />

        {/* ══ MODE: LUMINAE IMPORT ══ */}
        {inputMode === 'luminae' && (
          <>
            <LuminaeImporter onImport={handleLuminaeImport} />

            {/* Platform (needed for format) */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Plataforma</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => set('platform', p.id)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                      form.platform === p.id
                        ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ MODE: COLAR CONTEUDO (FORMAT-ONLY) ══ */}
        {inputMode === 'colar' && (
          <>
            {/* Project name */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Nome do Projeto</label>
              <input value={form.projectName} onChange={e => set('projectName', e.target.value)} placeholder="Ex: Carrossel de vendas — Mentoria" className={inputCls} />
            </div>

            {/* Content paste */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <div>
                <label className={labelCls}>Cole seu conteudo aqui</label>
                <div className="rounded-xl p-3 border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 text-xs text-green-700 dark:text-green-300 leading-relaxed mb-2">
                  A IA vai FORMATAR seu texto em slides sem reescrever nenhuma palavra. Seu conteudo, sua voz.
                </div>
                <textarea
                  value={form.baseText}
                  onChange={e => set('baseText', e.target.value)}
                  placeholder="Cole aqui o conteudo que voce quer transformar em carrossel. Pode ser texto do Luminae, trecho de aula, transcricao..."
                  rows={8}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              </div>
            </div>

            {/* Platform + slides */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Plataforma e Formato</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Plataforma</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => set('platform', p.id)} className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-all', form.platform === p.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300')}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Numero de Slides</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SLIDE_COUNTS.map(n => (
                      <button key={n} onClick={() => set('slideCount', n)} className={cn('py-2 rounded-xl text-xs font-bold border transition-all', form.slideCount === n ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Niche */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <label className={labelCls}>Nicho</label>
              <input value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="Ex: Psicologia, Coaching, Nutricao..." className={inputCls} />
            </div>

            {/* Generate FORMAT */}
            <button
              onClick={handleFormatText}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <Wand2 size={22} />
              Formatar em Slides (sem reescrever)
            </button>
          </>
        )}

        {/* ══ MODE: CRIAR DO ZERO (original) ══ */}
        {inputMode === 'criar' && (
          <>
            {/* Essentials */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Informacoes Essenciais</h2>

              <div>
                <label className={labelCls}>Nome do Projeto</label>
                <input value={form.projectName} onChange={e => set('projectName', e.target.value)} placeholder="Ex: Carrossel de vendas — Mentoria" className={inputCls} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tema / Assunto *</label>
                  <input value={form.theme} onChange={e => set('theme', e.target.value)} placeholder="Ex: Como sair da ansiedade" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Produto / Servico *</label>
                  <input value={form.product} onChange={e => set('product', e.target.value)} placeholder="Ex: Mentoria individual" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Objetivo</label>
                  <input value={form.objective} onChange={e => set('objective', e.target.value)} placeholder="Ex: Gerar leads qualificados" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Preco / Investimento</label>
                  <input value={form.investment} onChange={e => set('investment', e.target.value)} placeholder="Ex: R$ 497 por mes" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Nicho</label>
                <input value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="Ex: Psicologia, Coaching, Nutricao..." className={inputCls} />
              </div>
            </div>

            {/* Tom de voz */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Tom de Voz</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => set('tone', t.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all',
                      form.tone === t.id
                        ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    )}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform + slides */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Plataforma e Formato</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Plataforma</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => set('platform', p.id)} className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-all', form.platform === p.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300')}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Numero de Slides</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SLIDE_COUNTS.map(n => (
                      <button key={n} onClick={() => set('slideCount', n)} className={cn('py-2 rounded-xl text-xs font-bold border transition-all', form.slideCount === n ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Expert Photo */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Foto do Expert <span className="font-normal text-gray-400">(opcional)</span></h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Quando fornecida, a IA gera imagens de slides mantendo seu rosto e mudando o cenario.</p>

              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

              {form.expertPhotoBase64 ? (
                <div className="flex items-center gap-3">
                  <img src={form.expertPhotoBase64} alt="Expert" className="w-16 h-16 rounded-xl object-cover border-2 border-violet-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Foto carregada</p>
                    <p className="text-xs text-gray-400">A IA usara esta imagem como referencia facial</p>
                  </div>
                  <button onClick={() => set('expertPhotoBase64', undefined)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-300 transition-all">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => photoInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-all">
                  <Camera size={18} />
                  Enviar foto do expert
                </button>
              )}
            </div>

            {/* Content paste area */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <div>
                <label className={labelCls}>Cole seu conteudo aqui</label>
                <p className="text-xs text-gray-400 mb-2">Trecho de aula, texto, transcricao, ideias... A IA transforma em carrossel.</p>
                <textarea
                  value={form.baseText}
                  onChange={e => set('baseText', e.target.value)}
                  placeholder="Cole aqui o conteudo que voce quer transformar em carrossel..."
                  rows={6}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <span>Opcoes avancadas (contexto visual)</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvanced && (
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div>
                  <label className={labelCls}>Contexto Visual</label>
                  <input value={form.contextInfo} onChange={e => set('contextInfo', e.target.value)} placeholder="Ex: Minimalista, tons neutros, fotografia real, sem filtros" className={inputCls} />
                </div>
              </div>
            )}

            {/* Generate */}
            <button
              onClick={handleGenerate}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <Wand2 size={22} />
              Gerar Carrossel Completo com IA
            </button>
          </>
        )}
      </div>
    </div>
  )
}
