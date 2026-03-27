import { useState } from 'react'
import { Wand2, Sparkles } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { Tone, StoryType, StoriesInputs, StoriesData, StorySlide } from '../../types'
import { getDefaultProfile, createSimpleProject, updateProjectStories } from '../../services/storageService'
import { generateStoriesCopy, generateStoriesFormat } from '../../services/geminiService'
import { parseLuminaeContent } from '../../services/luminaeParser'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: 'descontraído', label: 'Descontraido', emoji: '😊' },
  { id: 'profissional', label: 'Profissional', emoji: '💼' },
  { id: 'inspirador', label: 'Inspirador', emoji: '✨' },
  { id: 'educativo', label: 'Educativo', emoji: '📚' },
  { id: 'provocador', label: 'Provocador', emoji: '🎯' },
  { id: 'afetuoso', label: 'Afetuoso', emoji: '💜' },
]

const STORY_TYPES: { id: StoryType; label: string; emoji: string; desc: string }[] = [
  { id: 'content', label: 'Conteudo', emoji: '📖', desc: 'Educativo ou inspirador' },
  { id: 'poll', label: 'Enquete', emoji: '📊', desc: 'Pergunta com opcoes' },
  { id: 'question', label: 'Caixinha', emoji: '❓', desc: 'Caixinha de pergunta' },
]

type EditorMode = 'luminae' | 'criar'

export default function StoriesEditor() {
  const { setView, setCurrentProject, apiKey, setIsGenerating, setGenerationPhase, setGenerationProgress, refreshProjects } = useApp()
  const defaultProfile = getDefaultProfile()

  const [editorMode, setEditorMode] = useState<EditorMode>('criar')
  const [theme, setTheme] = useState('')
  const [objective, setObjective] = useState('')
  const [baseText, setBaseText] = useState('')
  const [tone, setTone] = useState<Tone>(defaultProfile?.tone || 'inspirador')
  const [storyCount, setStoryCount] = useState(3)
  const [types, setTypes] = useState<StoryType[]>(['content'])

  // Luminae
  const [luminaeText, setLuminaeText] = useState('')

  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  const toggleType = (t: StoryType) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  // ── LUMINAE IMPORT ──
  const handleLuminaeImport = async () => {
    if (!luminaeText.trim()) { toast.error('Cole o conteudo do Luminae'); return }

    // Try direct parse
    const parsed = parseLuminaeContent(luminaeText)
    if (parsed && parsed.slides.length > 0) {
      const storiesData: StoriesData = {
        slides: parsed.slides.map((s, i) => ({
          id: i + 1,
          type: 'content' as StoryType,
          headline: s.headline,
          body: s.subtitle,
          visualPrompt: s.visualPrompt || '',
          layout: 'minimal' as const,
        })),
        caption: parsed.caption,
        generatedAt: new Date().toISOString(),
      }
      const project = createSimpleProject(`Luminae Stories: ${parsed.slides[0].headline.slice(0, 25)}`, parsed.slides[0].headline, 'stories')
      updateProjectStories(project.id, storiesData)
      refreshProjects()
      setCurrentProject({ ...project, current_stories_data: storiesData })
      setView('stories-preview' as any)
      toast.success('Stories importados do Luminae!')
      return
    }

    // Fallback: FORMAT mode
    if (!apiKey) { toast.error('Configure sua chave Gemini'); return }

    setIsGenerating(true)
    setGenerationProgress(0)
    const toastId = toast.loading('Formatando stories...')

    try {
      const storiesData = await generateStoriesFormat(luminaeText, defaultProfile?.niche || '', storyCount, (phase, pct) => {
        setGenerationPhase(phase)
        setGenerationProgress(pct)
        toast.loading(phase, { id: toastId })
      })
      const project = createSimpleProject(`Luminae Stories`, '', 'stories')
      updateProjectStories(project.id, storiesData)
      refreshProjects()
      setCurrentProject({ ...project, current_stories_data: storiesData })
      setView('stories-preview' as any)
      toast.success('Stories formatados!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationPhase('')
      setGenerationProgress(0)
    }
  }

  // ── CREATE FROM SCRATCH ──
  const handleGenerate = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configuracoes'); return }
    if (!theme.trim()) { toast.error('Informe o tema'); return }
    if (types.length === 0) { toast.error('Selecione pelo menos um tipo'); return }

    setIsGenerating(true)
    setGenerationProgress(0)
    const toastId = toast.loading('Gerando stories...')

    try {
      const inputs: StoriesInputs = { theme, objective, baseText, tone, niche: defaultProfile?.niche || '', storyCount, types }
      const storiesData = await generateStoriesCopy(inputs, (phase, pct) => {
        setGenerationPhase(phase)
        setGenerationProgress(pct)
        toast.loading(phase, { id: toastId })
      }, defaultProfile?.voiceBlueprint)

      const project = createSimpleProject(`Stories: ${theme}`, theme, 'stories')
      updateProjectStories(project.id, storiesData)
      refreshProjects()

      setCurrentProject({ ...project, current_stories_data: storiesData })
      setView('stories-preview' as any)
      toast.success('Stories gerados!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationPhase('')
      setGenerationProgress(0)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Stories</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Formato vertical 1080x1920 — sequencia pronta para Instagram</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setEditorMode('luminae')}
          className={cn('px-5 py-2 rounded-lg text-sm font-semibold transition-all', editorMode === 'luminae' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
        >
          <Sparkles size={14} className="inline mr-1.5" />Luminae
        </button>
        <button
          onClick={() => setEditorMode('criar')}
          className={cn('px-5 py-2 rounded-lg text-sm font-semibold transition-all', editorMode === 'criar' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
        >
          <Wand2 size={14} className="inline mr-1.5" />Criar do Zero
        </button>
      </div>

      {/* ══ LUMINAE MODE ══ */}
      {editorMode === 'luminae' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <div className="rounded-xl p-3 border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 text-xs text-green-700 dark:text-green-300 leading-relaxed">
              Cole o conteudo do Luminae. Seu texto sera preservado EXATAMENTE — nenhuma palavra reescrita.
            </div>
            <div>
              <label className={labelCls}>Conteudo do Luminae</label>
              <textarea
                value={luminaeText}
                onChange={e => setLuminaeText(e.target.value)}
                placeholder="Cole aqui o JSON ou texto do Luminae..."
                rows={8}
                className={`${inputCls} resize-none leading-relaxed font-mono`}
              />
            </div>
          </div>

          {/* Story count */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Quantos stories</label>
            <div className="flex gap-2 mt-2">
              {[3, 4, 5].map(n => (
                <button key={n} onClick={() => setStoryCount(n)} className={cn('px-5 py-2.5 rounded-xl text-sm font-bold border transition-all', storyCount === n ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleLuminaeImport} className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3">
            <Sparkles size={20} /> Importar Stories (sem reescrever)
          </button>
        </div>
      )}

      {/* ══ CREATE MODE ══ */}
      {editorMode === 'criar' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div>
              <label className={labelCls}>Tema *</label>
              <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Ex: 3 erros que impedem sua transformacao" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Objetivo</label>
              <input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex: Engajar, gerar respostas na caixinha..." className={inputCls} />
            </div>
          </div>

          {/* Content paste area */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Cole seu conteudo aqui</label>
            <p className="text-xs text-gray-400 mb-2">Trecho de aula, texto, transcricao, ideias... A IA transforma em stories.</p>
            <textarea value={baseText} onChange={e => setBaseText(e.target.value)} placeholder="Cole aqui o conteudo que voce quer transformar em stories..." rows={6} className={`${inputCls} resize-none leading-relaxed`} />
          </div>

          {/* Story types */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Tipos de story (pode marcar varios)</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {STORY_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all',
                    types.includes(t.id)
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-white">{t.label}</span>
                  <span className="text-[10px] text-gray-400">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Quantos stories</label>
            <div className="flex gap-2 mt-2">
              {[3, 4, 5].map(n => (
                <button key={n} onClick={() => setStoryCount(n)} className={cn('px-5 py-2.5 rounded-xl text-sm font-bold border transition-all', storyCount === n ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Tom de voz</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
              {TONES.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)} className={cn('flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all', tone === t.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3">
            <Wand2 size={20} /> Gerar Stories com IA
          </button>
        </div>
      )}
    </div>
  )
}
