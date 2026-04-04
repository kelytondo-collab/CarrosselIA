import { useState } from 'react'
import { Wand2, Sparkles } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import type { Tone, PostInputs, PostData } from '../../types'
import { getDefaultProfile, createSimpleProject, updateProjectPost } from '../../services/storageService'
import { generatePostCopy, generatePostFormat } from '../../services/geminiService'
import { parseLuminaeContent } from '../../services/luminaeParser'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: 'descontraído', label: 'Descontraido', emoji: '😊' },
  { id: 'profissional', label: 'Profissional', emoji: '💼' },
  { id: 'inspirador', label: 'Inspirador', emoji: '✨' },
  { id: 'urgente', label: 'Urgente', emoji: '🔥' },
  { id: 'educativo', label: 'Educativo', emoji: '📚' },
  { id: 'provocador', label: 'Provocador', emoji: '🎯' },
  { id: 'afetuoso', label: 'Afetuoso', emoji: '💜' },
]

export default function PostEditor() {
  const { currentProject, setView, setCurrentProject, apiKey, setIsGenerating, setGenerationPhase, setGenerationProgress, refreshProjects } = useApp()
  const defaultProfile = getDefaultProfile()

  // Pre-fill from existing project when coming back from preview
  const existingPost = currentProject?.current_post_data

  const [mode, setMode] = useState<'luminae' | 'create'>(existingPost ? 'create' : 'create')
  const [theme, setTheme] = useState(existingPost?.headline || '')
  const [objective, setObjective] = useState('')
  const [baseText, setBaseText] = useState(existingPost ? `${existingPost.headline}\n${existingPost.subtitle}` : '')
  const [tone, setTone] = useState<Tone>(defaultProfile?.tone || 'inspirador')
  const [niche] = useState(defaultProfile?.niche || '')

  // Luminae import
  const [luminaeText, setLuminaeText] = useState('')


  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  // ── LUMINAE IMPORT ──
  const handleLuminaeImport = () => {
    if (!luminaeText.trim()) { toast.error('Cole o conteudo do Luminae'); return }

    const parsed = parseLuminaeContent(luminaeText)
    if (parsed && parsed.slides.length > 0) {
      // Post: subtitle VAZIO — conteúdo vai só na legenda (caption.body)
      const rawSubtitle = parsed.slides[0].subtitle || ''
      const captionBody = parsed.caption.body || rawSubtitle
      const postData: PostData = {
        headline: parsed.slides[0].headline,
        subtitle: '',
        caption: { ...parsed.caption, body: captionBody, hashtags: parsed.caption.hashtags || '' },
        visualPrompt: parsed.slides[0].visualPrompt || '',
        layout: 'minimal',
        generatedAt: new Date().toISOString(),
      }
      const project = createSimpleProject(`Luminae: ${postData.headline.slice(0, 30)}`, postData.headline, 'post')
      updateProjectPost(project.id, postData)
      refreshProjects()
      setCurrentProject({ ...project, current_post_data: postData })
      setView('post-preview' as View)
      toast.success('Post importado do Luminae!')
      return
    }

    // Fallback: use FORMAT mode with Gemini
    handleFormatPost()
  }

  const handleFormatPost = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini'); return }
    if (!luminaeText.trim()) { toast.error('Cole o conteudo'); return }

    setIsGenerating(true)
    setGenerationProgress(0)
    const toastId = toast.loading('Formatando post...')

    try {
      const postData = await generatePostFormat(luminaeText, niche, (phase, pct) => {
        setGenerationPhase(phase)
        setGenerationProgress(pct)
        toast.loading(phase, { id: toastId })
      })
      const project = createSimpleProject(`Formatado: ${postData.headline.slice(0, 30)}`, postData.headline, 'post')
      updateProjectPost(project.id, postData)
      refreshProjects()
      setCurrentProject({ ...project, current_post_data: postData })
      setView('post-preview' as View)
      toast.success('Post formatado!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationPhase('')
      setGenerationProgress(0)
    }
  }

  const handleCreate = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configuracoes'); return }
    if (!theme.trim()) { toast.error('Informe o tema do post'); return }

    setIsGenerating(true)
    setGenerationProgress(0)
    const toastId = toast.loading('Gerando post estatico...')

    try {
      const inputs: PostInputs = { theme, objective, tone, niche, baseText }
      const postData = await generatePostCopy(inputs, (phase, pct) => {
        setGenerationPhase(phase)
        setGenerationProgress(pct)
        toast.loading(phase, { id: toastId })
      }, defaultProfile?.voiceBlueprint)

      const project = createSimpleProject(theme, theme, 'post')
      updateProjectPost(project.id, postData)
      refreshProjects()

      setCurrentProject({ ...project, current_post_data: postData })
      setView('post-preview' as View)
      toast.success('Post gerado!', { id: toastId })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Post Estatico</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Formato 1080x1350 (4:5) — tamanho ideal para Instagram</p>
          </div>
          {existingPost && (
            <button onClick={() => setView('post-preview' as View)} className="flex items-center gap-2 px-3 py-2 border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded-xl text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
              Ver Preview
            </button>
          )}
        </div>
        {existingPost && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Editando post existente — seus dados foram mantidos. Ajuste o que quiser e gere novamente.</p>
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setMode('luminae')}
          className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all', mode === 'luminae' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
        >
          <Sparkles size={14} className="inline mr-1.5" />Luminae
        </button>
        <button
          onClick={() => setMode('create')}
          className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all', mode === 'create' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
        >
          <Wand2 size={14} className="inline mr-1.5" />Criar do Zero
        </button>
        {/* Clone removido — Gemini não consegue clonar rosto de forma confiável */}
      </div>

      {/* ══ LUMINAE MODE ══ */}
      {mode === 'luminae' && (
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

          <button onClick={handleLuminaeImport} className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3">
            <Sparkles size={20} /> Importar Post (sem reescrever)
          </button>
        </div>
      )}

      {/* ══ CREATE MODE ══ */}
      {mode === 'create' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div>
              <label className={labelCls}>Tema / Assunto *</label>
              <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Ex: 5 sinais de que voce precisa de terapia" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Objetivo</label>
              <input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex: Gerar awareness, atrair leads, educar..." className={inputCls} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Cole seu conteudo aqui</label>
            <p className="text-xs text-gray-400 mb-2">Trecho de aula, texto, transcricao, ideias... A IA transforma em post.</p>
            <textarea value={baseText} onChange={e => setBaseText(e.target.value)} placeholder="Cole aqui o conteudo que voce quer transformar em post..." rows={6} className={`${inputCls} resize-none leading-relaxed`} />
          </div>

          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Tom de voz</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {TONES.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all', tone === t.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3">
            <Wand2 size={20} /> Gerar Post com IA
          </button>
        </div>
      )}

      {/* ══ CLONE MODE ══ */}
      {/* Clone removido */}
    </div>
  )
}
