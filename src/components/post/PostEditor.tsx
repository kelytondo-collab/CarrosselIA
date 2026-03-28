import { useState, useRef } from 'react'
import { Wand2, Upload, X, Loader2, Image, Sparkles, ClipboardPaste } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import type { Tone, PostInputs, PostData } from '../../types'
import type { InputMode, LuminaeImportData } from '../../types/luminae'
import { getDefaultProfile, createSimpleProject, updateProjectPost } from '../../services/storageService'
import { generatePostCopy, generatePostFormat, clonePostVisual } from '../../services/geminiService'
import { parseLuminaeContent, detectContentFormat } from '../../services/luminaeParser'
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
  const { currentProject, setView, setCurrentProject, apiKey, expertPhotoBase64, setIsGenerating, setGenerationPhase, setGenerationProgress, refreshProjects } = useApp()
  const defaultProfile = getDefaultProfile()

  // Pre-fill from existing project when coming back from preview
  const existingPost = currentProject?.current_post_data

  const [mode, setMode] = useState<'luminae' | 'create' | 'clone'>(existingPost ? 'create' : 'create')
  const [theme, setTheme] = useState(existingPost?.headline || '')
  const [objective, setObjective] = useState('')
  const [baseText, setBaseText] = useState(existingPost ? `${existingPost.headline}\n${existingPost.subtitle}` : '')
  const [tone, setTone] = useState<Tone>(defaultProfile?.tone || 'inspirador')
  const [niche] = useState(defaultProfile?.niche || '')
  const [referenceImage, setReferenceImage] = useState<string | undefined>(existingPost?.imageUrl)
  const [analyzing, setAnalyzing] = useState(false)
  const [cloneTheme, setCloneTheme] = useState(existingPost?.headline || '')
  const [cloneContent, setCloneContent] = useState(existingPost ? `${existingPost.headline}\n${existingPost.subtitle}` : '')
  const [clonePhoto, setClonePhoto] = useState<string | undefined>()

  // Luminae import
  const [luminaeText, setLuminaeText] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setReferenceImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── LUMINAE IMPORT ──
  const handleLuminaeImport = () => {
    if (!luminaeText.trim()) { toast.error('Cole o conteudo do Luminae'); return }

    const parsed = parseLuminaeContent(luminaeText)
    if (parsed && parsed.slides.length > 0) {
      const postData: PostData = {
        headline: parsed.slides[0].headline,
        subtitle: parsed.slides[0].subtitle,
        caption: parsed.caption,
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

  const handleClonePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setClonePhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleClone = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini nas Configuracoes'); return }
    if (!referenceImage) { toast.error('Envie a imagem de referencia para clonar'); return }
    if (!cloneContent.trim() && !cloneTheme.trim()) { toast.error('Cole seu conteudo ou informe o tema'); return }

    setAnalyzing(true)
    const toastId = toast.loading('Clonando visual da referencia...')

    try {
      const userText = cloneContent.trim() || cloneTheme.trim()
      // Use clone photo, or fall back to expert photo from profile
      const photoToUse = clonePhoto || expertPhotoBase64
      if (!photoToUse) { toast.error('Envie sua foto ou configure foto do perfil', { id: toastId }); setAnalyzing(false); return }
      toast.loading('Analisando estilo + gerando sua foto...', { id: toastId })

      const postData = await clonePostVisual(
        referenceImage,
        photoToUse,
        userText,
        niche,
        tone,
        defaultProfile?.voiceBlueprint
      )

      const project = createSimpleProject(`Clone: ${userText.slice(0, 30)}`, userText.slice(0, 50), 'post')
      updateProjectPost(project.id, postData)
      refreshProjects()

      setCurrentProject({ ...project, current_post_data: postData })
      setView('post-preview' as View)
      toast.success('Post clonado com sucesso!', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao clonar'
      console.error('[CLONE ERROR]', err)
      toast.error(msg, { id: toastId, duration: 8000 })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Post Estatico</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Formato 1080x1080 — pronto para Instagram</p>
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
        <button
          onClick={() => setMode('clone')}
          className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all', mode === 'clone' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}
        >
          <Image size={14} className="inline mr-1.5" />Clone
        </button>
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
      {mode === 'clone' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div className="rounded-xl p-3 border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">Como funciona:</span> A IA vai CLONAR o visual exato da referencia — mesmo fundo, mesmas cores, mesmo estilo de texto, mesma composicao. Troca a pessoa pela SUA foto e o texto pelo SEU conteudo. O resultado parece feito pelo mesmo designer.
            </div>

            {/* 1. Referencia */}
            <div>
              <label className={labelCls}>1. Screenshot de referencia (estilo) *</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
              {referenceImage ? (
                <div className="flex items-start gap-3">
                  <img src={referenceImage} alt="Ref" className="w-28 h-28 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Referencia carregada</p>
                    <p className="text-xs text-gray-400 mt-0.5">A IA vai clonar cores, layout e estilo</p>
                    <button onClick={() => setReferenceImage(undefined)} className="mt-2 text-xs text-red-500 hover:underline flex items-center gap-1"><X size={12} /> Remover</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-all flex flex-col items-center gap-2">
                  <Upload size={24} />
                  <span className="text-sm">Enviar screenshot do post que voce gostou</span>
                </button>
              )}
            </div>

            {/* 2. Sua foto */}
            <div>
              <label className={labelCls}>2. Sua foto (imagem do post)</label>
              <p className="text-xs text-gray-400 mb-2">A IA vai gerar uma foto SUA no mesmo estilo da referência.{expertPhotoBase64 && !clonePhoto ? ' (usando foto do perfil)' : ''}</p>
              {clonePhoto ? (
                <div className="flex items-start gap-3">
                  <img src={clonePhoto} alt="Foto" className="w-28 h-28 object-cover rounded-xl border border-green-300 dark:border-green-700" />
                  <div className="flex-1">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">Sua foto carregada</p>
                    <button onClick={() => setClonePhoto(undefined)} className="mt-2 text-xs text-red-500 hover:underline flex items-center gap-1"><X size={12} /> Remover</button>
                  </div>
                </div>
              ) : (
                <label className="w-full py-4 border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl text-green-500 hover:border-green-400 hover:text-green-600 transition-all flex flex-col items-center gap-1.5 cursor-pointer">
                  <Image size={20} />
                  <span className="text-sm">Enviar sua foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleClonePhotoUpload} />
                </label>
              )}
            </div>

            {/* 3. Conteudo */}
            <div>
              <label className={labelCls}>3. Seu conteudo (texto do post)</label>
              <p className="text-xs text-gray-400 mb-2">Cole seu texto — a IA vai formatar no estilo da referencia SEM reescrever. Se deixar vazio, informe o tema abaixo.</p>
              <textarea value={cloneContent} onChange={e => setCloneContent(e.target.value)} placeholder="Cole aqui sua frase, texto, trecho de aula..." rows={4} className={`${inputCls} resize-none leading-relaxed`} />
            </div>

            {/* 4. Tema (fallback se nao colou conteudo) */}
            <div>
              <label className={labelCls}>4. Tema {cloneContent ? '(opcional)' : '*'}</label>
              <input value={cloneTheme} onChange={e => setCloneTheme(e.target.value)} placeholder="Ex: Autoconhecimento para mulheres..." className={inputCls} />
            </div>
          </div>

          <button onClick={handleClone} disabled={analyzing} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3">
            {analyzing ? <><Loader2 size={20} className="animate-spin" /> Analisando...</> : <><Image size={20} /> Clonar Estilo + Meu Conteudo</>}
          </button>
        </div>
      )}
    </div>
  )
}
