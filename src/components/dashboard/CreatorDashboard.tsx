import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, Flame, BarChart3, Calendar, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { apiGetUsage, type UsageData } from '../../services/apiService'
import { calcEnergyOfDay, calcPersonalDay, suggestContentType, NUMBER_MEANINGS } from '../../services/numerologyService'

export default function CreatorDashboard() {
  const { user } = useAuth()
  const { setView } = useApp()
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    apiGetUsage().then(setUsage).catch(() => {})
  }, [])

  const dayEnergy = useMemo(() => calcEnergyOfDay(), [])
  const personalDay = useMemo(() => {
    if (!user?.birth_date) return dayEnergy
    return calcPersonalDay(user.birth_date)
  }, [user?.birth_date, dayEnergy])
  const suggestion = useMemo(() => suggestContentType(personalDay), [personalDay])
  const dayMeaning = NUMBER_MEANINGS[personalDay] || NUMBER_MEANINGS[1]

  if (!usage) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stats = [
    { label: 'Posts este mes', value: usage.posts_used, icon: BarChart3, color: 'text-violet-400' },
    { label: 'Posts total', value: usage.total_posts_ever, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Streak', value: `${usage.streak}d`, icon: Flame, color: usage.streak >= 3 ? 'text-orange-400' : 'text-gray-400' },
  ]

  // Breakdown by type
  const typeBreakdown = usage.breakdown.filter(b => b.action.startsWith('create_'))

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe sua consistencia de criacao</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} className={s.color} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Energy of the Day */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200 dark:border-violet-800/50 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0">
              {personalDay}
            </div>
            <div className="flex-1">
              <p className="text-xs text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Energia de Hoje — {dayMeaning.title}</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{suggestion.label}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{suggestion.description}</p>
              <button
                onClick={() => setView('editor')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 transition-colors"
              >
                <Sparkles size={14} />
                Criar conteudo de {suggestion.label.toLowerCase()}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Usage breakdown */}
        {typeBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-violet-400" />
              Este mes por tipo
            </h3>
            <div className="space-y-3">
              {typeBreakdown.map((b, i) => {
                const label = b.action.replace('create_', '').replace('carousel', 'Carrossel').replace('post', 'Post').replace('stories', 'Stories')
                const maxCount = Math.max(...typeBreakdown.map(x => x.count))
                const pct = maxCount > 0 ? (b.count / maxCount) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{label}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{b.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Plan info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Seu plano</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{usage.plan_label}</p>
              {usage.posts_limit < 999 && (
                <p className="text-sm text-gray-500">{usage.posts_used}/{usage.posts_limit} posts usados este mes</p>
              )}
              {usage.trial_active && (
                <p className="text-sm text-amber-600 dark:text-amber-400">{usage.trial_days_left} dias restantes no trial</p>
              )}
            </div>
            {(usage.trial_active || usage.plan === 'essencial') && (
              <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 transition-colors">
                Fazer upgrade
              </button>
            )}
          </div>
        </div>

        {/* Encouragement */}
        {usage.total_posts_ever > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Voce ja criou <strong className="text-gray-700 dark:text-gray-200">{usage.total_posts_ever}</strong> conteudos com sua essencia.
              {usage.total_posts_ever >= 10 && ' Especialistas consistentes postam 4-5x por semana.'}
              {usage.total_posts_ever >= 30 && ' Voce ja e mais consistente que 90% dos especialistas!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
