import { useState } from 'react'
import { Search, Heart, MoreVertical, Archive, Trash2, Calendar, Layers, Star, Square, Film } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { View } from '../../contexts/AppContext'
import { toggleFavorite, archiveProject, deleteProject } from '../../services/storageService'
import type { Project } from '../../types'
import { cn } from '../../utils/cn'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pinterest: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  threads: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  carousel: { label: 'Carrossel', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  post: { label: 'Post', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  stories: { label: 'Stories', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
}

function ProjectCard({ project, onOpen, onRefresh }: { project: Project; onOpen: () => void; onRefresh: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(project.id)
    onRefresh()
  }

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    archiveProject(project.id)
    onRefresh()
    setMenuOpen(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Excluir este projeto?')) {
      deleteProject(project.id)
      onRefresh()
    }
    setMenuOpen(false)
  }

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all cursor-pointer group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {project.theme || project.product || 'Sem tema definido'}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button onClick={handleFavorite} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Heart size={14} className={project.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreVertical size={14} className="text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1">
                <button onClick={handleArchive} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Archive size={12} /> Arquivar
                </button>
                <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {project.type && TYPE_BADGES[project.type] && (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_BADGES[project.type].cls)}>
            {TYPE_BADGES[project.type].label}
          </span>
        )}
        {project.platform && (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PLATFORM_COLORS[project.platform])}>
            {project.platform}
          </span>
        )}
        {project.current_carousel_data && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Layers size={11} />
            {project.current_carousel_data.slides?.length || 0} slides
          </span>
        )}
        {project.current_stories_data && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Film size={11} />
            {project.current_stories_data.slides?.length || 0} stories
          </span>
        )}
        {project.current_post_data && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Square size={11} />
            1080×1080
          </span>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <Calendar size={11} />
        {format(new Date(project.updated_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
      </div>

      {/* Has content indicator */}
      {(project.current_carousel_data || project.current_post_data || project.current_stories_data) && (
        <div className="absolute top-3 right-12">
          <Star size={10} className="text-amber-400 fill-amber-400" />
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { projects, refreshProjects, setView, setCurrentProject, setCurrentCarousel } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')

  const active = projects.filter(p => p.status === 'active')
  const filtered = active
    .filter(p => filter === 'favorites' ? p.is_favorite : true)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.theme || '').toLowerCase().includes(search.toLowerCase()))

  const openProject = (p: Project) => {
    setCurrentProject(p)
    if (p.type === 'post') {
      setView(p.current_post_data ? 'post-preview' as View : 'post-editor' as View)
    } else if (p.type === 'stories') {
      setView(p.current_stories_data ? 'stories-preview' as View : 'stories-editor' as View)
    } else {
      if (p.current_carousel_data) {
        setCurrentCarousel(p.current_carousel_data)
        setView('preview')
      } else {
        setView('editor')
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Seus Projetos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{active.length} projetos criados</p>
          </div>
        </div>

        {/* Quick create buttons */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => { setCurrentProject(null); setCurrentCarousel(null); setView('editor') }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Layers size={16} /> Carrossel
          </button>
          <button
            onClick={() => { setCurrentProject(null); setView('post-editor' as View) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Square size={16} /> Post Estático
          </button>
          <button
            onClick={() => { setCurrentProject(null); setView('stories-editor' as View) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Film size={16} /> Stories
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar projetos..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400"
            />
          </div>
          {(['all', 'favorites'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                filter === f
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {f === 'all' ? 'Todos' : '❤ Favoritos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 scroll-area px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
              <Layers size={28} className="text-violet-400" />
            </div>
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">
              {search ? 'Nenhum resultado encontrado' : 'Nenhum projeto ainda'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {search ? 'Tente outra busca' : 'Use os botões acima para criar seu primeiro conteúdo'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => openProject(p)}
                onRefresh={refreshProjects}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
