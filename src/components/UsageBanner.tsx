import { useState, useEffect } from 'react'
import { Clock, Zap, TrendingUp, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiGetUsage, type UsageData } from '../services/apiService'

export default function UsageBanner() {
  const { user } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (user) apiGetUsage().then(setUsage).catch(() => {})
  }, [user])

  if (!user || !usage || dismissed) return null

  // Trial banner
  if (usage.trial_active && usage.trial_days_left <= 5) {
    const urgency = usage.trial_days_left <= 2 ? 'bg-red-500/20 border-red-500/30 text-red-300' :
                    usage.trial_days_left <= 4 ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
                    'bg-blue-500/20 border-blue-500/30 text-blue-300'

    return (
      <div className={`flex items-center justify-between px-4 py-2.5 border-b text-sm ${urgency}`}>
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>
            {usage.trial_days_left === 0
              ? 'Seu trial expira hoje!'
              : usage.trial_days_left === 1
                ? 'Seu trial expira amanha!'
                : `${usage.trial_days_left} dias restantes no trial.`}
            {' '}
            <button className="font-semibold underline underline-offset-2 hover:opacity-80">Assine agora</button>
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="opacity-50 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    )
  }

  // Usage limit banner (Essencial plan)
  if (usage.plan === 'essencial' && usage.posts_used >= usage.posts_limit * 0.8) {
    const remaining = usage.posts_limit - usage.posts_used
    return (
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-amber-500/10 border-amber-500/20 text-amber-300 text-sm">
        <div className="flex items-center gap-2">
          <Zap size={14} />
          <span>
            {remaining <= 0
              ? 'Voce atingiu o limite de posts este mes.'
              : `${remaining} posts restantes este mes.`}
            {' '}
            <button className="font-semibold underline underline-offset-2 hover:opacity-80">Faca upgrade</button>
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="opacity-50 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    )
  }

  // Streak encouragement (optional, non-intrusive)
  if (usage.streak >= 3) {
    return (
      <div className="flex items-center justify-between px-4 py-2 border-b bg-green-500/10 border-green-500/20 text-green-300 text-xs">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} />
          <span>{usage.streak} dias consecutivos criando conteudo!</span>
        </div>
        <button onClick={() => setDismissed(true)} className="opacity-50 hover:opacity-100">
          <X size={12} />
        </button>
      </div>
    )
  }

  return null
}
