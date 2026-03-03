import { useState } from 'react'
import { Plus, Trash2, Check, User } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { SpecialistProfile, Tone, Platform, SlideCount, ColorPalette } from '../../types'
import { saveProfile, deleteProfile } from '../../services/storageService'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const TONES: Tone[] = ['profissional', 'descontraído', 'inspirador', 'urgente', 'educativo', 'provocador', 'afetuoso']
const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'threads', 'pinterest']
const SLIDE_COUNTS: SlideCount[] = [5, 7, 8, 10]

const DEFAULT_PALETTE: ColorPalette = { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc' }

const emptyProfile = (): Omit<SpecialistProfile, 'id' | 'created_at'> => ({
  name: '',
  niche: '',
  tone: 'descontraído',
  bio: '',
  color_palette: { ...DEFAULT_PALETTE },
  default_platform: 'instagram',
  default_slide_count: 8,
  is_default: false,
})

export default function ProfileManager() {
  const { profiles, refreshProfiles } = useApp()
  const [editing, setEditing] = useState<(Omit<SpecialistProfile, 'id' | 'created_at'> & { id?: string }) | null>(null)

  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5'
  const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400'

  const handleSave = () => {
    if (!editing || !editing.name.trim()) { toast.error('Nome obrigatório'); return }
    const profile: SpecialistProfile = {
      ...editing,
      id: editing.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    saveProfile(profile)
    refreshProfiles()
    setEditing(null)
    toast.success('Perfil salvo!')
  }

  const handleDelete = (id: string) => {
    if (confirm('Excluir este perfil?')) {
      deleteProfile(id)
      refreshProfiles()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfis de Especialista</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure perfis com tom de voz, nicho e paleta de cores</p>
        </div>
        <button
          onClick={() => setEditing(emptyProfile())}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-all"
        >
          <Plus size={16} /> Novo Perfil
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {profiles.length === 0 && !editing && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
              <User size={24} className="text-violet-400" />
            </div>
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Nenhum perfil criado</h3>
            <p className="text-sm text-gray-400 mb-5">Crie um perfil para personalizar a voz e o estilo dos seus carrosseis</p>
            <button onClick={() => setEditing(emptyProfile())} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700">Criar perfil</button>
          </div>
        )}

        <div className="space-y-4">
          {profiles.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg" style={{ background: p.color_palette.primary }}>
                  {p.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</span>
                    {p.is_default && <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-semibold">Padrão</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.niche} · {p.tone} · {p.default_platform}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...p })} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-all">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-violet-200 dark:border-violet-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-5">{editing.id ? 'Editar Perfil' : 'Novo Perfil'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nome *</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ex: Psicóloga Digital" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nicho</label>
                  <input value={editing.niche || ''} onChange={e => setEditing({ ...editing, niche: e.target.value })} placeholder="Ex: Psicologia, Coaching..." className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Tom de Voz</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setEditing({ ...editing, tone: t })} className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all', editing.tone === t ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Plataforma padrão</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p} onClick={() => setEditing({ ...editing, default_platform: p })} className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all', editing.default_platform === p ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Slides padrão</label>
                  <div className="flex gap-2">
                    {SLIDE_COUNTS.map(n => (
                      <button key={n} onClick={() => setEditing({ ...editing, default_slide_count: n })} className={cn('px-3 py-2 rounded-xl text-xs font-bold border transition-all', editing.default_slide_count === n ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Cor primária</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editing.color_palette.primary} onChange={e => setEditing({ ...editing, color_palette: { ...editing.color_palette, primary: e.target.value } })} className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{editing.color_palette.primary}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setEditing({ ...editing, is_default: !editing.is_default })} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all', editing.is_default ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                  {editing.is_default && <Check size={12} />} Perfil padrão
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all">Salvar Perfil</button>
                <button onClick={() => setEditing(null)} className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl text-sm hover:border-gray-300 transition-all">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
