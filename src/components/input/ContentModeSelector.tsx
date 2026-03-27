import type { InputMode } from '../../types/luminae'
import { cn } from '../../utils/cn'
import { Sparkles, ClipboardPaste, Wand2 } from 'lucide-react'

interface Props {
  mode: InputMode
  onChange: (mode: InputMode) => void
}

const MODES: { id: InputMode; label: string; desc: string; icon: typeof Sparkles }[] = [
  { id: 'luminae', label: 'Importar do Luminae', desc: 'Cola JSON ou texto estruturado', icon: Sparkles },
  { id: 'colar', label: 'Colar Conteudo', desc: 'Texto livre → IA formata', icon: ClipboardPaste },
  { id: 'criar', label: 'Criar do Zero', desc: 'Tema + objetivo → IA gera tudo', icon: Wand2 },
]

export default function ContentModeSelector({ mode, onChange }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Como voce quer criar?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
              mode === m.id
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            )}
          >
            <m.icon size={20} className={mode === m.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'} />
            <span className={cn('text-xs font-bold', mode === m.id ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300')}>{m.label}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
