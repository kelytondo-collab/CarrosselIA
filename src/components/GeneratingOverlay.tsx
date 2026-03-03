import { useApp } from '../contexts/AppContext'

export default function GeneratingOverlay() {
  const { isGenerating, generationPhase, generationProgress } = useApp()
  if (!isGenerating) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-5 relative">
          <div className="absolute inset-0 rounded-full bg-violet-100 dark:bg-violet-900/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <span className="text-2xl animate-pulse">✦</span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Gerando com IA</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{generationPhase || 'Processando...'}</p>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{generationProgress}%</p>
      </div>
    </div>
  )
}
