import { cn } from '../../utils/cn'
import type { StylePackId } from '../../types/stylePacks'
import { STYLE_PACKS } from './StylePacks'

interface Props {
  selected: StylePackId
  onChange: (id: StylePackId) => void
}

const OPTIONS: { id: StylePackId; label: string; colors: [string, string, string] }[] = [
  { id: 'livre', label: 'Livre', colors: ['#8b5cf6', '#1e1b4b', '#ffffff'] },
  { id: 'presenca-dourada', label: 'Presença Dourada', colors: ['#d4a574', '#1a1008', '#faf5ee'] },
  { id: 'diario-artesanal', label: 'Diário Artesanal', colors: ['#d97706', '#e8d5b7', '#faf6f0'] },
  { id: 'impacto-editorial', label: 'Impacto Editorial', colors: ['#ef4444', '#111111', '#fafafa'] },
]

export default function StyleSelector({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Estilo AUTOR.IA
      </p>
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map(opt => {
          const isActive = selected === opt.id
          const pack = opt.id !== 'livre' ? STYLE_PACKS[opt.id] : null
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              title={pack?.description || 'Modo livre — paleta e template manuais'}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                isActive
                  ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 text-violet-700 dark:text-violet-300 ring-1 ring-violet-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              )}
            >
              {/* Mini color preview */}
              <div className="flex -space-x-1">
                {opt.colors.map((c, i) => (
                  <div
                    key={i}
                    style={{ background: c, width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.15)' }}
                  />
                ))}
              </div>
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
