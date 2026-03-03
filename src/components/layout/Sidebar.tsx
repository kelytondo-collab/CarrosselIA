import { LayoutDashboard, PlusCircle, User, Settings, Moon, Sun, Sparkles, X, Zap } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'

type View = 'dashboard' | 'editor' | 'preview' | 'profiles' | 'settings'

const NAV = [
  { id: 'dashboard' as View, label: 'Projetos', icon: LayoutDashboard },
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
          <span className="font-bold text-gray-900 dark:text-white text-sm">Carrossel IA</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* New button */}
      <div className="px-4 py-4">
        <button
          onClick={() => go('editor')}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg"
        >
          <PlusCircle size={18} />
          Novo Carrossel
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(item => (
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
        <span className="text-xs text-gray-400">v1.0</span>
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
