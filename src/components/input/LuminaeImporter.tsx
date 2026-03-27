import { useState } from 'react'
import { Check, AlertTriangle, FileJson, FileText } from 'lucide-react'
import { parseLuminaeContent, detectContentFormat } from '../../services/luminaeParser'
import type { LuminaeImportData } from '../../types/luminae'
import { cn } from '../../utils/cn'

interface Props {
  onImport: (data: LuminaeImportData) => void
}

export default function LuminaeImporter({ onImport }: Props) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<LuminaeImportData | null>(null)
  const [error, setError] = useState('')

  const handleTextChange = (value: string) => {
    setText(value)
    setError('')
    setPreview(null)

    if (!value.trim()) return

    const format = detectContentFormat(value)
    const parsed = parseLuminaeContent(value)

    if (parsed) {
      setPreview(parsed)
    } else if (format === 'texto-livre') {
      setError('Texto livre detectado. Use o modo "Colar Conteudo" para texto livre — la a IA formata em slides sem reescrever.')
    } else {
      setError('Nao foi possivel detectar o formato. Verifique se o conteudo veio do Luminae.')
    }
  }

  const handleImport = () => {
    if (preview) {
      onImport(preview)
    }
  }

  const format = text.trim() ? detectContentFormat(text) : null

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Cole o conteudo do Luminae
          </label>
          {format && (
            <span className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
              format === 'json' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
              format === 'marcadores' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
              'bg-gray-100 dark:bg-gray-800 text-gray-500'
            )}>
              {format === 'json' ? <FileJson size={10} /> : <FileText size={10} />}
              {format === 'json' ? 'JSON' : format === 'marcadores' ? 'Estruturado' : 'Texto livre'}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-2">
          O conteudo gerado no Luminae sera preservado EXATAMENTE como esta. Nenhuma palavra sera reescrita.
        </p>
        <textarea
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          placeholder='Cole aqui o JSON ou texto estruturado do Luminae...\n\nExemplo JSON:\n{\n  "slides": [\n    { "headline": "...", "subtitle": "..." }\n  ],\n  "caption": { "hook": "...", "body": "...", "cta": "..." }\n}'
          rows={8}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors resize-none leading-relaxed font-mono"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{error}</p>
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-xl">
            <Check size={14} className="text-green-500 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300">
              <span className="font-bold">{preview.slides.length} slides</span> detectados
              {preview.caption.hook && ' + legenda completa'}
              {preview.gatilho && ` · Gatilho: ${preview.gatilho}`}
            </p>
          </div>

          {/* Preview slides */}
          <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            {preview.slides.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[10px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{s.headline}</p>
                  {s.subtitle && <p className="text-[10px] text-gray-500 truncate">{s.subtitle.slice(0, 80)}</p>}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleImport}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Usar este conteudo (sem reescrever)
          </button>
        </div>
      )}
    </div>
  )
}
