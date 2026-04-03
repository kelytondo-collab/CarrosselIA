import { useState, useRef, useEffect } from 'react'
import { LayoutDashboard, User, Settings, Moon, Sun, Sparkles, X, Zap, Layers, Square, Film, Video, Clapperboard, Heart, Camera, ChevronDown, LogOut, Check } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import { getDefaultProfile, saveProfile } from '../../services/storageService'
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
  { id: 'reels-record' as View, label: 'Reels', icon: Camera, desc: 'Gravar + Filtro' },
]

const NAV_BOTTOM = [
  { id: 'profiles' as View, label: 'Perfis', icon: User },
  { id: 'settings' as View, label: 'Configurações', icon: Settings },
]

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const { view, setView, isDark, toggleDark, apiKey, profiles, refreshProfiles } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const defaultProfile = getDefaultProfile()

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  const switchProfile = (id: string) => {
    const target = profiles.find(p => p.id === id)
    if (!target) return
    // Set new default
    saveProfile({ ...target, is_default: true })
    refreshProfiles()
    setProfileOpen(false)
  }

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

      {/* Profile Switcher */}
      <div className="px-3 pt-3 pb-1" ref={dropdownRef}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border',
            profileOpen
              ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          )}
        >
          {defaultProfile?.photo_base64 ? (
            <img src={defaultProfile.photo_base64} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
              <User size={14} className="text-violet-600 dark:text-violet-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{defaultProfile?.name || 'Sem perfil'}</p>
            <p className="text-[10px] text-gray-400 truncate">{defaultProfile?.niche || 'Perfil ativo'}</p>
          </div>
          <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0', profileOpen && 'rotate-180')} />
        </button>

        {/* Dropdown */}
        {profileOpen && (
          <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50 relative">
            {profiles.length > 1 && (
              <div className="max-h-48 overflow-y-auto">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => switchProfile(p.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-700',
                      p.is_default && 'bg-violet-50 dark:bg-violet-900/20'
                    )}
                  >
                    {p.photo_base64 ? (
                      <img src={p.photo_base64} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        <User size={12} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.niche || ''}</p>
                    </div>
                    {p.is_default && <Check size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { go('profiles'); setProfileOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
              >
                <User size={14} />
                {profiles.length > 0 ? 'Gerenciar Perfis' : 'Criar Perfil'}
              </button>
            </div>
          </div>
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
