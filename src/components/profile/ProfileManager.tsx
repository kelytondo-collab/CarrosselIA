import { useState } from 'react'
import { Plus, Trash2, Check, User, Loader2, Camera } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import type { SpecialistProfile, Tone, Platform, SlideCount, ColorPalette } from '../../types'
import { saveProfile, deleteProfile } from '../../services/storageService'
import { generateVoiceBlueprint } from '../../services/geminiService'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const TONES: Tone[] = ['profissional', 'descontraído', 'inspirador', 'urgente', 'educativo', 'provocador', 'afetuoso']
const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'threads', 'pinterest']
const SLIDE_COUNTS: SlideCount[] = [5, 7, 8, 10]

const DEFAULT_PALETTE: ColorPalette = { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc', background: '#0f0a1a', text: '#ffffff' }

const VOICE_QUESTIONS: { key: string; label: string; placeholder: string }[] = [
  { key: 'comunicacao', label: 'Como você se comunica com seus seguidores?', placeholder: 'Ex: De forma direta e acolhedora, como uma conversa entre amigas...' },
  { key: 'crencas', label: 'Suas 3 crenças centrais sobre sua área', placeholder: 'Ex: 1. Terapia não é luxo, é necessidade. 2. Todo mundo merece...' },
  { key: 'palavrasUsa', label: 'Palavras/expressões que você sempre usa', placeholder: 'Ex: "regulação emocional", "presença", "você não está sozinha"...' },
  { key: 'palavrasNunca', label: 'Palavras/abordagens que você NUNCA usaria', placeholder: 'Ex: Nunca uso "cura milagrosa", nunca prometo resultado em X dias...' },
  { key: 'transformacao', label: 'Transformação real que você entrega', placeholder: 'Ex: A pessoa sai sabendo nomear suas emoções e criar pausas antes de reagir...' },
  { key: 'diferencial', label: 'O que te diferencia no nicho', placeholder: 'Ex: Combino neurociência com escuta profunda. Não dou fórmulas — trabalho o específico...' },
  { key: 'emocao', label: 'Como você quer que a pessoa se sinta ao consumir seu conteúdo', placeholder: 'Ex: Compreendida, menos sozinha, com clareza de que pode agir agora...' },
  { key: 'referencia', label: 'Descreva um conteúdo seu perfeito e por quê funcionou', placeholder: 'Ex: O post "Ansiedade não é fraqueza" porque tocou em vergonha sem julgamento...' },
]

const emptyProfile = (): Omit<SpecialistProfile, 'id' | 'created_at'> => ({
  name: '',
  instagramHandle: '',
  niche: '',
  tone: 'descontraído',
  bio: '',
  color_palette: { ...DEFAULT_PALETTE },
  default_platform: 'instagram',
  default_slide_count: 8,
  is_default: false,
  voiceBlueprint: '',
})

export default function ProfileManager() {
  const { profiles, refreshProfiles, apiKey } = useApp()
  const [editing, setEditing] = useState<(Omit<SpecialistProfile, 'id' | 'created_at'> & { id?: string }) | null>(null)
  const [blueprintTab, setBlueprintTab] = useState<'guided' | 'direct'>('guided')
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({})
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false)

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
    setGuidedAnswers({})
    toast.success('Perfil salvo!')
  }

  const handleDelete = (id: string) => {
    if (confirm('Excluir este perfil?')) {
      deleteProfile(id)
      refreshProfiles()
    }
  }

  const handleEditOpen = (p: SpecialistProfile) => {
    setEditing({ ...p })
    setGuidedAnswers({})
    setBlueprintTab('guided')
  }

  const handleGenerateBlueprint = async () => {
    if (!apiKey) { toast.error('Configure sua chave Gemini API nas Configurações'); return }
    if (!editing) return
    const filledCount = Object.values(guidedAnswers).filter(v => v.trim()).length
    if (filledCount < 3) { toast.error('Responda pelo menos 3 perguntas para gerar o blueprint'); return }

    setIsGeneratingBlueprint(true)
    const toastId = toast.loading('Gerando Blueprint da Voz...')
    try {
      const blueprint = await generateVoiceBlueprint(guidedAnswers, editing.name, editing.niche || '')
      setEditing({ ...editing, voiceBlueprint: blueprint })
      toast.success('Blueprint gerado! Revise e salve o perfil.', { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar blueprint'
      toast.error(msg, { id: toastId })
    } finally {
      setIsGeneratingBlueprint(false)
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
          onClick={() => { setEditing(emptyProfile()); setGuidedAnswers({}); setBlueprintTab('guided') }}
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
            <button onClick={() => { setEditing(emptyProfile()); setGuidedAnswers({}) }} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700">Criar perfil</button>
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
                    {p.voiceBlueprint && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">✦ Voz</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.niche} · {p.tone} · {p.default_platform}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditOpen(p)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-all">Editar</button>
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
                <label className={labelCls}>@ do Instagram</label>
                <input value={editing.instagramHandle || ''} onChange={e => setEditing({ ...editing, instagramHandle: e.target.value })} placeholder="Ex: @dra.marina.santos" className={inputCls} />
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
              {/* Foto do Expert */}
              <div>
                <label className={labelCls}>Foto do Expert (usada na IA)</label>
                <div className="flex items-center gap-4">
                  {editing.photo_base64 ? (
                    <img src={editing.photo_base64} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-violet-300" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Camera size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:border-violet-400 cursor-pointer transition-all">
                      {editing.photo_base64 ? 'Trocar foto' : 'Enviar foto'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 1024 * 1024 * 2) { toast.error('Foto muito grande (max 2MB)'); return }
                        const reader = new FileReader()
                        reader.onload = ev => setEditing({ ...editing, photo_base64: ev.target?.result as string })
                        reader.readAsDataURL(file)
                      }} />
                    </label>
                    {editing.photo_base64 && (
                      <button onClick={() => setEditing({ ...editing, photo_base64: undefined })} className="px-3 py-2 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">Remover</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Paleta de cores completa */}
              <div>
                <label className={labelCls}>Paleta de cores</label>
                <div className="grid grid-cols-5 gap-3">
                  {([
                    { key: 'primary' as const, label: 'Principal' },
                    { key: 'secondary' as const, label: 'Secundária' },
                    { key: 'accent' as const, label: 'Destaque' },
                    { key: 'background' as const, label: 'Fundo' },
                    { key: 'text' as const, label: 'Texto' },
                  ]).map(c => (
                    <div key={c.key} className="flex flex-col items-center gap-1">
                      <input type="color" value={editing.color_palette[c.key]} onChange={e => setEditing({ ...editing, color_palette: { ...editing.color_palette, [c.key]: e.target.value } })} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Fonte preferida</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'inter' as const, label: 'Inter (Moderna)', sample: 'Inter, sans-serif' },
                    { id: 'playfair' as const, label: 'Elegante (Serif)', sample: '"Playfair Display", serif' },
                    { id: 'georgia' as const, label: 'Clássica', sample: 'Georgia, serif' },
                    { id: 'helvetica' as const, label: 'Bold', sample: '"Helvetica Neue", Arial, sans-serif' },
                  ]).map(f => (
                    <button key={f.id} onClick={() => setEditing({ ...editing, preferred_font: f.id })} className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-all', editing.preferred_font === f.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')} style={{ fontFamily: f.sample }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setEditing({ ...editing, is_default: !editing.is_default })} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all', editing.is_default ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-700 text-gray-500')}>
                  {editing.is_default && <Check size={12} />} Perfil padrão
                </button>
              </div>

              {/* Blueprint da Voz */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Blueprint da Voz</span>
                  <span className="text-xs text-gray-400">(opcional — calibra o conteúdo gerado para soar como você)</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-4 w-fit">
                  <button
                    onClick={() => setBlueprintTab('guided')}
                    className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', blueprintTab === 'guided' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}
                  >
                    Guiado
                  </button>
                  <button
                    onClick={() => setBlueprintTab('direct')}
                    className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', blueprintTab === 'direct' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}
                  >
                    Direto
                  </button>
                </div>

                {blueprintTab === 'guided' ? (
                  <div className="space-y-3">
                    {VOICE_QUESTIONS.map(q => (
                      <div key={q.key}>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{q.label}</label>
                        <textarea
                          value={guidedAnswers[q.key] || ''}
                          onChange={e => setGuidedAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                          placeholder={q.placeholder}
                          rows={2}
                          className={`${inputCls} resize-none leading-relaxed`}
                        />
                      </div>
                    ))}

                    <button
                      onClick={handleGenerateBlueprint}
                      disabled={isGeneratingBlueprint}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isGeneratingBlueprint ? <><Loader2 size={16} className="animate-spin" /> Gerando Blueprint...</> : '✦ Gerar Blueprint com IA'}
                    </button>

                    {editing.voiceBlueprint && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Blueprint gerado — revise e edite se necessário:</label>
                        <textarea
                          value={editing.voiceBlueprint}
                          onChange={e => setEditing({ ...editing, voiceBlueprint: e.target.value })}
                          rows={12}
                          className={`${inputCls} resize-none leading-relaxed font-mono text-xs`}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Escreva ou cole seu blueprint manualmente:</label>
                    <textarea
                      value={editing.voiceBlueprint || ''}
                      onChange={e => setEditing({ ...editing, voiceBlueprint: e.target.value })}
                      placeholder="Descreva seu tom de voz, vocabulário preferido, crenças, diferencial e regras de comunicação..."
                      rows={14}
                      className={`${inputCls} resize-none leading-relaxed`}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all">Salvar Perfil</button>
                <button onClick={() => { setEditing(null); setGuidedAnswers({}) }} className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl text-sm hover:border-gray-300 transition-all">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
