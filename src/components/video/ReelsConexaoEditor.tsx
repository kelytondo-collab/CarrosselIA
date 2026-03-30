import { useState, useRef, useEffect } from 'react'
import { Download, Play, Loader2, Upload, X, Plus, Trash2, Clipboard, ArrowLeft } from 'lucide-react'
import { renderReelsConexao } from '../../services/videoRenderer'
import type { ReelsConexaoConfig, ReelsConexaoPhrase } from '../../services/videoRenderer'
import { getDefaultProfile } from '../../services/storageService'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface PhraseEntry {
  phrase: string
  keywords: string  // comma-separated
  arc: string
}

const ARC_OPTIONS = [
  { id: 'fachada', label: 'Fachada', color: 'bg-sky-500' },
  { id: 'contraste', label: 'Contraste', color: 'bg-amber-500' },
  { id: 'verdade', label: 'Verdade', color: 'bg-rose-500' },
  { id: 'convite', label: 'Convite', color: 'bg-green-500' },
]

const DEFAULT_PHRASES: PhraseEntry[] = [
  { phrase: 'Ta tudo bem', keywords: 'tudo', arc: 'fachada' },
  { phrase: 'Tudo organizado', keywords: 'organizado', arc: 'fachada' },
  { phrase: 'Mas por dentro', keywords: 'dentro', arc: 'contraste' },
  { phrase: 'Vida pulsa', keywords: 'vida', arc: 'verdade' },
  { phrase: 'E voce nao', keywords: 'voce', arc: 'verdade' },
  { phrase: 'Talvez voce so', keywords: 'talvez', arc: 'convite' },
  { phrase: 'Esteja longe de voce', keywords: 'longe,voce', arc: 'convite' },
]

export default function ReelsConexaoEditor() {
  const { setView } = useApp()
  const profile = getDefaultProfile()

  const [phrases, setPhrases] = useState<PhraseEntry[]>(DEFAULT_PHRASES)
  const [recordingTip, setRecordingTip] = useState('')
  const [musicMood, setMusicMood] = useState('')
  const [handle, setHandle] = useState(profile?.name ? `@${profile.name.toLowerCase().replace(/\s+/g, '')}` : '')

  // Auto-import from Luminae via localStorage (set by App.tsx hash handler)
  useEffect(() => {
    const raw = localStorage.getItem('luminae_reels_import')
    if (!raw) return
    localStorage.removeItem('luminae_reels_import')
    try {
      const data = JSON.parse(raw)
      const arr = data.phrases || []
      if (arr.length > 0) {
        const parsed: PhraseEntry[] = arr.map((item: Record<string, unknown>) => ({
          phrase: String(item.phrase || ''),
          keywords: Array.isArray(item.keywords) ? (item.keywords as string[]).join(',') : '',
          arc: String(item.arc || 'verdade'),
        }))
        setPhrases(parsed)
        if (data.recordingTip) setRecordingTip(String(data.recordingTip))
        if (data.musicMood) setMusicMood(String(data.musicMood))
        toast.success(`${parsed.length} frases carregadas do Luminae!`)
      }
    } catch { /* ignore parse errors */ }
  }, [])
  const [duration, setDuration] = useState(30)
  const [fontScale, setFontScale] = useState(1.0)
  const [rendering, setRendering] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Video
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Selecione um arquivo de video'); return }
    if (file.size > 200 * 1024 * 1024) { toast.error('Video muito grande (max 200MB)'); return }

    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(file)
    setVideoBlobUrl(URL.createObjectURL(file))
  }

  const handleRemoveVideo = () => {
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
    setVideoFile(null)
    setVideoBlobUrl(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  // Phrase management
  const updatePhrase = (idx: number, field: keyof PhraseEntry, value: string) => {
    setPhrases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const addPhrase = () => {
    setPhrases(prev => [...prev, { phrase: '', keywords: '', arc: 'verdade' }])
  }

  const removePhrase = (idx: number) => {
    if (phrases.length <= 2) { toast.error('Minimo 2 frases'); return }
    setPhrases(prev => prev.filter((_, i) => i !== idx))
  }

  // Import from Luminae JSON
  const handlePasteLuminae = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const data = JSON.parse(text)

      // Accept array directly or object with content array
      const arr = Array.isArray(data) ? data : Array.isArray(data.content) ? data.content : null
      if (!arr || arr.length === 0) { toast.error('JSON invalido — cole o resultado do Luminae'); return }

      const parsed: PhraseEntry[] = arr
        .filter((item: Record<string, unknown>) => item.phrase || item.text)
        .map((item: Record<string, unknown>) => ({
          phrase: String(item.phrase || item.text || ''),
          keywords: Array.isArray(item.keywords) ? (item.keywords as string[]).join(',') : '',
          arc: String(item.arc || 'verdade'),
        }))

      if (parsed.length === 0) { toast.error('Nenhuma frase encontrada no JSON'); return }

      setPhrases(parsed)
      toast.success(`${parsed.length} frases importadas do Luminae!`)
    } catch {
      toast.error('Erro ao colar — copie o JSON do Luminae')
    }
  }

  const handleRender = async () => {
    if (!videoBlobUrl) { toast.error('Importe o video b-roll primeiro'); return }
    const validPhrases = phrases.filter(p => p.phrase.trim())
    if (validPhrases.length < 2) { toast.error('Adicione pelo menos 2 frases'); return }

    setRendering(true)
    const toastId = toast.loading('Renderizando Reels Conexao...')

    try {
      const phrasesConfig: ReelsConexaoPhrase[] = validPhrases.map((p, i) => ({
        order: i + 1,
        phrase: p.phrase.trim(),
        keywords: p.keywords.split(',').map(k => k.trim()).filter(Boolean),
        arc: p.arc,
      }))

      const config: ReelsConexaoConfig = {
        width: 1080,
        height: 1920,
        fps: 30,
        durationMs: duration * 1000,
        phrases: phrasesConfig,
        backgroundVideoUrl: videoBlobUrl,
        handle: handle.trim() || undefined,
        fontFamily: 'Inter, sans-serif',
        fontSize: Math.round(48 * fontScale),
        textColor: '#ffffff',
        highlightColor: '#f59e0b', // amber-500
      }

      const blob = await renderReelsConexao(config)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      toast.success('Reels Conexao pronto!', { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renderizar', { id: toastId })
    } finally {
      setRendering(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `reels-conexao-${Date.now()}.webm`
    a.click()
    toast.success('Video baixado!')
  }

  const inputCls = 'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 overflow-y-auto h-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setView('dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reels Conexao</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Video b-roll + frases animadas com keywords — cria conexao emocional sem olhar pra camera
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Video Upload */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <label className={labelCls}>Video B-Roll *</label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Grave momentos do dia a dia no celular (lendo, caminhando, natureza). O audio do video sera mantido.
          </p>
          {videoBlobUrl ? (
            <div className="relative">
              <video
                src={videoBlobUrl}
                className="w-full rounded-xl border border-violet-300 dark:border-violet-700"
                style={{ maxHeight: 240, objectFit: 'cover' }}
                muted
                autoPlay
                loop
                playsInline
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-[10px] text-white font-bold">
                {videoFile?.name}
              </div>
              <button
                onClick={handleRemoveVideo}
                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="w-full py-8 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl text-violet-500 hover:border-violet-400 hover:text-violet-600 transition-all flex flex-col items-center gap-2 cursor-pointer">
              <Upload size={28} />
              <span className="text-sm font-medium">Importar video b-roll</span>
              <span className="text-[10px] text-gray-400">MP4, WebM, MOV (max 200MB)</span>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </label>
          )}
        </div>

        {/* Phrases Editor */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <label className={labelCls}>Frases-Legenda *</label>
            <button
              onClick={handlePasteLuminae}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <Clipboard size={12} />
              Colar do Luminae
            </button>
          </div>

          <div className="space-y-2">
            {phrases.map((p, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30"
              >
                {/* Order number */}
                <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-1">
                  {idx + 1}
                </span>

                <div className="flex-1 space-y-1.5">
                  {/* Phrase text */}
                  <input
                    value={p.phrase}
                    onChange={e => updatePhrase(idx, 'phrase', e.target.value)}
                    placeholder="Frase curta (2-5 palavras)"
                    className={`${inputCls} font-bold`}
                  />

                  <div className="flex gap-2">
                    {/* Keywords */}
                    <input
                      value={p.keywords}
                      onChange={e => updatePhrase(idx, 'keywords', e.target.value)}
                      placeholder="Keywords (separar por virgula)"
                      className={`${inputCls} flex-1 text-xs`}
                    />

                    {/* Arc selector */}
                    <select
                      value={p.arc}
                      onChange={e => updatePhrase(idx, 'arc', e.target.value)}
                      className={`${inputCls} w-28 text-xs`}
                    >
                      {ARC_OPTIONS.map(a => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => removePhrase(idx)}
                  className="text-gray-300 hover:text-red-400 transition-colors mt-1 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addPhrase}
            className="w-full mt-3 py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={14} />
            Adicionar frase
          </button>

          {/* Arc legend */}
          <div className="flex gap-3 mt-3 justify-center">
            {ARC_OPTIONS.map(a => (
              <div key={a.id} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className={`w-2 h-2 rounded-full ${a.color}`} />
                {a.label}
              </div>
            ))}
          </div>
        </div>

        {/* Luminae Tips (shown when imported) */}
        {(recordingTip || musicMood) && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/30 p-4 space-y-2">
            {recordingTip && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Dica de Gravacao</span>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-0.5">{recordingTip}</p>
              </div>
            )}
            {musicMood && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Mood Musical</span>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-0.5">{musicMood}</p>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className={labelCls}>Duracao (segundos)</label>
              <div className="flex gap-2 mt-1">
                {[15, 20, 30, 45, 60].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                      duration === d
                        ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Handle */}
            <div>
              <label className={labelCls}>@ Handle</label>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@seunome"
                className={inputCls}
              />
            </div>
          </div>

          {/* Font Scale */}
          <div className="mt-4">
            <label className={labelCls}>Tamanho da Fonte</label>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400 font-mono w-6">A</span>
              <input
                type="range"
                min="0.6"
                max="2.0"
                step="0.1"
                value={fontScale}
                onChange={e => setFontScale(parseFloat(e.target.value))}
                className="flex-1 h-2 accent-violet-600"
              />
              <span className="text-lg text-gray-400 font-mono w-6">A</span>
              <span className="text-xs text-gray-500 font-mono w-12 text-right">
                {Math.round(fontScale * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className={labelCls}>Preview</label>
            <div className="flex justify-center">
              <video
                src={previewUrl}
                controls
                autoPlay
                loop
                style={{ width: 216, height: 384, borderRadius: 12 }}
                className="shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRender}
            disabled={rendering || !videoBlobUrl || phrases.filter(p => p.phrase.trim()).length < 2}
            className="flex-1 py-4 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3"
          >
            {rendering ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            {rendering ? 'Renderizando...' : 'Gerar Reels Conexao'}
          </button>

          {previewUrl && (
            <button
              onClick={handleDownload}
              className="py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Baixar
            </button>
          )}
        </div>

        {/* How to use */}
        <div className="bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/30 rounded-2xl border border-violet-200 dark:border-violet-800/30 p-5">
          <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-2">
            Como criar um Reels Conexao
          </p>
          <ol className="space-y-1.5 text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
            <li><span className="font-bold text-violet-800 dark:text-violet-200">1.</span> No Luminae, gere um "Reels Conexao" sobre o tema desejado</li>
            <li><span className="font-bold text-violet-800 dark:text-violet-200">2.</span> Copie o resultado e clique em "Colar do Luminae" aqui</li>
            <li><span className="font-bold text-violet-800 dark:text-violet-200">3.</span> Grave video b-roll no celular (sem olhar pra camera) + narre a reflexao</li>
            <li><span className="font-bold text-violet-800 dark:text-violet-200">4.</span> Importe o video, ajuste a duracao e clique em Gerar</li>
            <li><span className="font-bold text-violet-800 dark:text-violet-200">5.</span> Baixe e poste no Instagram!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
