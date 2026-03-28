import { useState } from 'react'
import { Copy, Check, Download, Wand2, Loader2 } from 'lucide-react'
import type { Caption, Tone } from '../../types'
import { regenerateCaptionSection } from '../../services/geminiService'
import { getDefaultProfile } from '../../services/storageService'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface Props {
  caption: Caption
  onChange: (caption: Caption) => void
  projectName: string
  niche?: string
  theme?: string
  tone?: Tone
}

const SECTION_META: { key: keyof Caption; label: string; placeholder: string; rows: number }[] = [
  { key: 'hook', label: 'Hook (1a linha)', placeholder: 'A primeira frase que para o scroll...', rows: 2 },
  { key: 'body', label: 'Corpo', placeholder: 'Desenvolva a ideia com quebras de linha e emojis...', rows: 6 },
  { key: 'cta', label: 'CTA (Chamada)', placeholder: 'O que a pessoa deve fazer? Ex: Comenta PALAVRA...', rows: 2 },
  { key: 'hashtags', label: 'Hashtags', placeholder: '#hashtag1 #hashtag2 ...', rows: 2 },
  { key: 'altText', label: 'Alt Text (Acessibilidade)', placeholder: 'Descricao acessivel do conteudo...', rows: 2 },
]

export default function CaptionEditor({ caption, onChange, projectName, niche, theme, tone }: Props) {
  const [copied, setCopied] = useState('')
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const profile = getDefaultProfile()

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
    toast.success('Copiado!')
  }

  const fullCaption = `${caption.hook}\n\n${caption.body}\n\n${caption.cta}\n\n${caption.hashtags}`

  const charCount = (text: string) => text.length

  const updateSection = (key: keyof Caption, value: string) => {
    onChange({ ...caption, [key]: value })
  }

  const handleRegenerate = async (key: 'hook' | 'body' | 'cta' | 'hashtags') => {
    if (regenerating) return

    setRegenerating(key)
    const toastId = toast.loading(`Regenerando ${key}...`)

    try {
      const newText = await regenerateCaptionSection(
        key,
        caption,
        {
          niche: niche || profile?.niche || '',
          tone: tone || profile?.tone || 'inspirador',
          theme,
        },
        profile?.voiceBlueprint,
      )
      updateSection(key, newText)
      toast.success(`${key} regenerado!`, { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro', { id: toastId })
    } finally {
      setRegenerating(null)
    }
  }

  const exportTxt = () => {
    const blob = new Blob([
      `HOOK:\n${caption.hook}\n\nCORPO:\n${caption.body}\n\nCTA:\n${caption.cta}\n\nHASHTAGS:\n${caption.hashtags}${caption.altText ? `\n\nALT TEXT:\n${caption.altText}` : ''}`
    ], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}-legenda.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Legenda exportada!')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-800 dark:text-white">Legenda Editavel</h3>
        <div className="flex gap-2">
          <button
            onClick={() => copy(fullCaption, 'legenda')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-all"
          >
            {copied === 'legenda' ? <Check size={12} /> : <Copy size={12} />}
            {copied === 'legenda' ? 'Copiado!' : 'Copiar tudo'}
          </button>
          <button
            onClick={exportTxt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 transition-all"
          >
            <Download size={12} /> .txt
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {SECTION_META.map(section => {
          const value = caption[section.key] || ''
          const isRegenerating = regenerating === section.key
          const canRegenerate = ['hook', 'body', 'cta', 'hashtags'].includes(section.key)

          return (
            <div key={section.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {section.label}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {charCount(value)} chars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {canRegenerate && (
                    <button
                      onClick={() => handleRegenerate(section.key as 'hook' | 'body' | 'cta' | 'hashtags')}
                      disabled={!!regenerating}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 disabled:opacity-40"
                    >
                      {isRegenerating ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                      {isRegenerating ? 'Gerando...' : 'Regenerar'}
                    </button>
                  )}
                  <button
                    onClick={() => copy(value, section.key)}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                  >
                    {copied === section.key ? <Check size={10} /> : <Copy size={10} />}
                    {copied === section.key ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <textarea
                value={value}
                onChange={e => updateSection(section.key, e.target.value)}
                rows={section.rows}
                placeholder={section.placeholder}
                className={cn(
                  'w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-violet-400 transition-colors',
                  section.key === 'hashtags' && 'text-violet-600 dark:text-violet-400'
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
