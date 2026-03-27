import { cn } from '../../utils/cn'

export type BackgroundType = 'gradient' | 'photo' | 'photo-text' | 'ia'

export interface GradientPreset {
  id: string
  label: string
  css: string
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'midnight', label: 'Meia-noite', css: 'linear-gradient(145deg, #0f0a1a 0%, #1a1145 50%, #0f172a 100%)' },
  { id: 'sunset', label: 'Por do sol', css: 'linear-gradient(145deg, #1a0505 0%, #4a1942 50%, #2d1b69 100%)' },
  { id: 'ocean', label: 'Oceano', css: 'linear-gradient(145deg, #0c1a2e 0%, #0e3b5c 50%, #041e42 100%)' },
  { id: 'forest', label: 'Floresta', css: 'linear-gradient(145deg, #052e16 0%, #14532d 50%, #064e3b 100%)' },
  { id: 'warm', label: 'Quente', css: 'linear-gradient(145deg, #1c0505 0%, #451a03 50%, #292524 100%)' },
  { id: 'clean', label: 'Limpo', css: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)' },
  { id: 'peach', label: 'Pessego', css: 'linear-gradient(145deg, #fef2f2 0%, #fce7f3 50%, #faf5ff 100%)' },
  { id: 'mesh-violet', label: 'Mesh Violeta', css: 'radial-gradient(circle at 20% 80%, #7c3aed33 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a78bfa33 0%, transparent 50%), linear-gradient(145deg, #0f0a1a, #1e1b4b)' },
  { id: 'mesh-rose', label: 'Mesh Rosa', css: 'radial-gradient(circle at 30% 70%, #ec489933 0%, transparent 50%), radial-gradient(circle at 70% 30%, #f472b633 0%, transparent 50%), linear-gradient(145deg, #1f001a, #2d1b38)' },
  { id: 'noise-dark', label: 'Textura Escuro', css: 'linear-gradient(145deg, #18181b 0%, #27272a 100%)' },
  { id: 'noise-warm', label: 'Textura Quente', css: 'linear-gradient(145deg, #292524 0%, #44403c 100%)' },
  { id: 'solid-black', label: 'Preto', css: 'linear-gradient(145deg, #050505 0%, #0a0a0a 100%)' },
]

interface BackgroundTypeSelectorProps {
  value: BackgroundType
  onChange: (type: BackgroundType) => void
}

export function BackgroundTypeSelector({ value, onChange }: BackgroundTypeSelectorProps) {
  const options: { id: BackgroundType; label: string; desc: string; safe: boolean }[] = [
    { id: 'gradient', label: 'Gradiente', desc: 'SEGURO', safe: true },
    { id: 'photo', label: 'Foto Real', desc: 'SEGURO', safe: true },
    { id: 'photo-text', label: 'Foto+Texto', desc: 'SEGURO', safe: true },
    { id: 'ia', label: 'IA', desc: 'RISCO', safe: false },
  ]

  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all',
            value === opt.id
              ? opt.safe
                ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-300'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-700 dark:text-amber-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-500'
          )}
          title={opt.safe ? 'Formato seguro para o algoritmo' : 'Imagens IA podem ter alcance reduzido'}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface GradientPickerProps {
  selected: string
  onSelect: (gradient: GradientPreset) => void
}

export default function GradientPicker({ selected, onSelect }: GradientPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {GRADIENT_PRESETS.map(g => (
        <button
          key={g.id}
          onClick={() => onSelect(g)}
          title={g.label}
          style={{ background: g.css }}
          className={cn(
            'w-7 h-7 rounded-lg transition-all border',
            selected === g.id
              ? 'ring-2 ring-offset-1 ring-violet-500 scale-110 border-violet-400'
              : 'border-gray-300 dark:border-gray-600 hover:scale-105'
          )}
        />
      ))}
    </div>
  )
}
