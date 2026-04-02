import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { calcEnergyOfDay, calcPersonalDay, suggestContentType, NUMBER_MEANINGS } from '../../services/numerologyService'
import { useAuth } from '../../contexts/AuthContext'

export default function EssenceCalendar() {
  const { user } = useAuth()
  const [monthOffset, setMonthOffset] = useState(0)

  const { year, days, monthName } = useMemo(() => {
    const now = new Date()
    now.setMonth(now.getMonth() + monthOffset)
    const y = now.getFullYear()
    const m = now.getMonth()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const firstDayOfWeek = new Date(y, m, 1).getDay()

    const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

    const days = []
    // Empty cells for days before month start
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d)
      const energy = user?.birth_date ? calcPersonalDay(user.birth_date, date) : calcEnergyOfDay(date)
      const suggestion = suggestContentType(energy)
      const meaning = NUMBER_MEANINGS[energy]
      const isToday = d === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear()
      days.push({ day: d, energy, suggestion, meaning, isToday })
    }

    return { year: y, month: m as number, days, monthName: monthNames[m] }
  }, [monthOffset, user?.birth_date])

  const typeColors: Record<string, string> = {
    provocacao: 'bg-red-500/20 text-red-400 border-red-500/30',
    conexao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    criatividade: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ensino: 'bg-green-500/20 text-green-400 border-green-500/30',
    transformacao: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    mentoria: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    reflexao: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    venda: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    inspiracao: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    despertar: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legado: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Calendario de Essencia</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, i) => {
          if (!cell) return <div key={i} />
          const colorClass = typeColors[cell.suggestion.type] || 'bg-gray-500/20 text-gray-400'
          return (
            <div
              key={i}
              className={`rounded-xl p-2 text-center border transition-all hover:scale-105 cursor-default ${colorClass} ${cell.isToday ? 'ring-2 ring-violet-500' : ''}`}
              title={`${cell.suggestion.label}: ${cell.suggestion.description}`}
            >
              <p className="text-xs font-bold">{cell.day}</p>
              <p className="text-[9px] mt-0.5 opacity-80">{cell.suggestion.label.slice(0, 5)}</p>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(typeColors).slice(0, 6).map(([type, cls]) => (
          <div key={type} className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${cls}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-gray-500">
        {user?.birth_date ? 'Energia personalizada (sua data de nascimento + dia)' : 'Energia universal do dia (adicione sua data de nascimento para personalizar)'}
      </p>
    </div>
  )
}
