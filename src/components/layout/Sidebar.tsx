import { LayoutDashboard, User, Settings, Moon, Sun, Sparkles, X, Zap, Layers, Square, Film, Video, Clapperboard, Heart } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'

const NAV_MAIN = [
  { id: 'dashboard' as View, label: 'Projetos', icon: LayoutDashboard },
]

const NAV_CREATE = [
  { id: 'editor' as View, label: 'Carrossel', icon: Layers, desc: '1080x1350' },
  { id: 'post-editor' as View, label: 'Post Estatico', icon: Square, desc: '1080x1080' },
  { id: 'stories-editor' as View, label: 'Stories', icon: Film, desc: '1080x1920' },
]

const NAV_VIDEO = [
  { id: 'quote-video' as View, label: 'Video Citacao', icon: Video, desc: 'Reel/Feed' },
  { id: 'carousel-reel' as View, label: 'Carrossel Reel', icon: Clapperboard, desc: 'Auto-scroll' },
  { id: 'reels-conexao' as View, label: 'Reels Conexão', icon: Heart, desc: 'B-roll + Legendas' },
]

const NAV_BOTTOM = [
  { id: 'profiles' as View, label: 'Perfis', icon: User },
  { id: 'settings' as View, label: 'Configurações', icon: Settings },
]

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const { view, setView, isDark, toggleDark, apiKey } = useApp()

  const go = (v: View) => { setView(v); onClose?.() }

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-64">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">Carrossel</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Projects */}
      <div className="px-3 pt-4 pb-2">
        {NAV_MAIN.map(item => (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              view === item.id
                ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Create section */}
      <div className="px-3 pb-2">
        <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Criar</p>
        <div className="space-y-0.5">
          {NAV_CREATE.map(item => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                view === item.id || (item.id === 'editor' && view === 'preview') || (item.id === 'post-editor' && view === 'post-preview') || (item.id === 'stories-editor' && view === 'stories-preview')
                  ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon size={18} />
              <div className="flex flex-col items-start">
                <span>{item.label}</span>
                <span className="text-[10px] opacity-50">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Video section */}
      <div className="px-3 pb-2">
        <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Video</p>
        <div className="space-y-0.5">
          {NAV_VIDEO.map(item => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                view === item.id
                  ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon size={18} />
              <div className="flex flex-col items-start">
                <span>{item.label}</span>
                <span className="text-[10px] opacity-50">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav */}
      <nav className="px-3 pb-2 space-y-0.5">
        {NAV_BOTTOM.map(item => (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              view === item.id
                ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* API key status */}
      <div className="px-4 pb-2">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
          apiKey
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        )}>
          <Zap size={12} />
          {apiKey ? 'Gemini conectado' : 'Configure sua chave API'}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-400">v2.0</span>
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  )
}
