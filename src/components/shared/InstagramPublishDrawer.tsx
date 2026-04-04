import { useState } from 'react'
import { X, Instagram, Send, Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { uploadImages, publishCarousel, publishSingle } from '../../services/apiService'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'carousel' | 'single'
  caption: string
  /** For carousel: array of slide element refs to capture. For single: single element ref. */
  slideRefs: React.RefObject<(HTMLDivElement | null)[]> | null
  singleRef?: React.RefObject<HTMLDivElement | null>
}

type Phase = 'ready' | 'capturing' | 'uploading' | 'publishing' | 'done' | 'error'

export default function InstagramPublishDrawer({ open, onClose, mode, caption: initialCaption, slideRefs, singleRef }: Props) {
  const { instagram } = useApp()
  const [caption, setCaption] = useState(initialCaption)
  const [phase, setPhase] = useState<Phase>('ready')
  const [progress, setProgress] = useState('')
  const [permalink, setPermalink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handlePublish = async () => {
    if (!instagram) {
      toast.error('Conecte seu Instagram em Configuracoes primeiro')
      return
    }

    try {
      setPhase('capturing')
      setProgress('Capturando imagens...')

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default

      const blobs: Blob[] = []

      if (mode === 'carousel' && slideRefs?.current) {
        const refs = slideRefs.current.filter(Boolean) as HTMLDivElement[]
        for (let i = 0; i < refs.length; i++) {
          setProgress(`Capturando slide ${i + 1} de ${refs.length}...`)
          const canvas = await html2canvas(refs[i], { scale: 3.6, useCORS: true, backgroundColor: null })
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Erro ao converter canvas')), 'image/png')
          })
          blobs.push(blob)
        }
      } else if (mode === 'single' && singleRef?.current) {
        const canvas = await html2canvas(singleRef.current, { scale: 3.6, useCORS: true, backgroundColor: null })
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Erro ao converter canvas')), 'image/png')
        })
        blobs.push(blob)
      }

      if (blobs.length === 0) {
        throw new Error('Nenhuma imagem para publicar')
      }

      // Upload to server
      setPhase('uploading')
      setProgress('Enviando imagens ao servidor...')
      const files = blobs.map((b, i) => new File([b], `slide-${i + 1}.png`, { type: 'image/png' }))
      const { urls } = await uploadImages(files)

      // Publish to Instagram
      setPhase('publishing')
      setProgress('Publicando no Instagram...')

      let result
      if (mode === 'carousel' && urls.length >= 2) {
        result = await publishCarousel(urls, caption)
      } else {
        result = await publishSingle(urls[0], caption)
      }

      setPhase('done')
      setPermalink(result.permalink || null)
      toast.success('Publicado no Instagram!')
    } catch (err: any) {
      setPhase('error')
      setError(err.message || 'Erro desconhecido')
      toast.error(err.message || 'Erro ao publicar')
    }
  }

  const handleClose = () => {
    setPhase('ready')
    setProgress('')
    setPermalink(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Instagram size={18} className="text-pink-500" />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Publicar no Instagram</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {phase === 'ready' && (
            <>
              {!instagram && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Voce precisa conectar seu Instagram em Configuracoes antes de publicar.
                    </p>
                  </div>
                </div>
              )}

              {instagram && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Publicar como <span className="font-semibold">@{instagram.username}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Legenda
                </label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-400 resize-none"
                  placeholder="Digite a legenda do post..."
                />
                <p className="text-[10px] text-gray-400 mt-1">{caption.length} caracteres</p>
              </div>
            </>
          )}

          {(phase === 'capturing' || phase === 'uploading' || phase === 'publishing') && (
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin mx-auto mb-4 text-violet-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{progress}</p>
              <p className="text-xs text-gray-400 mt-1">Nao feche esta janela</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Publicado!</h3>
              <p className="text-sm text-gray-500 mb-4">Seu conteudo esta no Instagram</p>
              {permalink && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
                >
                  <ExternalLink size={14} />
                  Ver no Instagram
                </a>
              )}
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Erro</h3>
              <p className="text-sm text-red-500 mb-4">{error}</p>
              <button
                onClick={() => { setPhase('ready'); setError(null) }}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'ready' && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handlePublish}
              disabled={!instagram}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              Publicar agora
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
