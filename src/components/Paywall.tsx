import { useState, useEffect } from 'react'
import { Lock, Sparkles, Check, Loader2, Crown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiGetPlans, apiCheckout, ApiError } from '../services/apiService'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  name: string
  value: number
  posts: string | number
  profiles: number
  features: string[]
}

export default function Paywall() {
  const { user, refreshUser } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    apiGetPlans().then(res => setPlans(res.plans)).catch(() => {})
  }, [])

  const handleCheckout = async (planId: string) => {
    setLoading(planId)
    try {
      const res = await apiCheckout(planId)
      if (res.payment_link) {
        window.open(res.payment_link, '_blank')
      } else if (res.invoice_url) {
        window.open(res.invoice_url, '_blank')
      }
      toast.success('Redirecionando para pagamento...')
      // Refresh user after a delay to check if payment confirmed
      setTimeout(() => refreshUser(), 5000)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao processar pagamento')
    } finally {
      setLoading(null)
    }
  }

  const popularPlan = 'profissional'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-medium mb-4">
            <Lock size={14} />
            Seu trial expirou
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Continue criando com sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">essencia</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Seus projetos estao salvos. Assine para continuar criando conteudo que so voce poderia escrever.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.id === popularPlan
                  ? 'border-violet-500 bg-gray-900/90 shadow-xl shadow-violet-500/10 scale-105'
                  : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
              }`}
            >
              {plan.id === popularPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold shadow-lg">
                  MAIS POPULAR
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {plan.id === 'agencia' && <Crown size={18} className="text-amber-400" />}
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">R${plan.value}</span>
                  <span className="text-gray-500">/mes</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={16} className="text-violet-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  plan.id === popularPlan
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg'
                    : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} />
                    Assinar {plan.name}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500">Cancele quando quiser. Sem fidelidade.</p>
          {user && (
            <p className="text-xs text-gray-600">
              Logado como {user.email} — {user.posts_used_this_month} posts criados
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
