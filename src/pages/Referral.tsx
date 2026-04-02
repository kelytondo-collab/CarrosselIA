import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, TrendingUp, Share2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiGetReferralStats } from '../services/apiService'
import toast from 'react-hot-toast'

interface ReferralStats {
  referral_code: string
  referral_link: string
  total_referred: number
  extra_posts_earned: number
  free_months_earned: number
  referrals: { email: string; name: string; status: string; date: string }[]
}

export default function Referral() {
  useAuth() // ensure authenticated
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiGetReferralStats()
      .then(data => setStats(data as ReferralStats))
      .catch(() => {})
  }, [])

  const copyLink = () => {
    if (!stats) return
    navigator.clipboard.writeText(stats.referral_link)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = () => {
    if (!stats) return
    const text = `Crie conteudo com sua essencia usando AUTOR.IA! Use meu link e ganhe 3 dias extras no trial: ${stats.referral_link}`
    if (navigator.share) {
      navigator.share({ title: 'AUTOR.IA', text, url: stats.referral_link })
    } else {
      copyLink()
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Gift size={24} className="text-violet-500" />
            Indique e Ganhe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compartilhe AUTOR.IA e ganhe recompensas
          </p>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200 dark:border-violet-800/50 p-6 mb-8">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Como funciona</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-2">
                <Share2 size={18} className="text-violet-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">1. Compartilhe</p>
              <p className="text-xs text-gray-500 mt-1">Envie seu link para amigos e colegas</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-2">
                <Users size={18} className="text-violet-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">2. Eles ganham</p>
              <p className="text-xs text-gray-500 mt-1">+3 dias extras no trial (10 no total)</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-2">
                <Gift size={18} className="text-violet-500" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">3. Voce ganha</p>
              <p className="text-xs text-gray-500 mt-1">+5 posts extras por indicacao</p>
            </div>
          </div>
          <p className="text-center text-xs text-violet-600 dark:text-violet-400 mt-4 font-medium">
            A cada 5 indicacoes: 1 mes gratis!
          </p>
        </div>

        {/* Share link */}
        {stats && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Seu link de indicacao</h3>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={stats.referral_link}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300"
              />
              <button
                onClick={copyLink}
                className="px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors flex items-center gap-2 shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="text-sm font-medium hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={shareLink}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 text-center">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.total_referred}</p>
              <p className="text-xs text-gray-500 mt-1">Indicados</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{stats.extra_posts_earned}</p>
              <p className="text-xs text-gray-500 mt-1">Posts extras ganhos</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.free_months_earned}</p>
              <p className="text-xs text-gray-500 mt-1">Meses gratis ganhos</p>
            </div>
          </div>
        )}

        {/* Referral list */}
        {stats && stats.referrals.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-400" />
              Suas indicacoes
            </h3>
            <div className="space-y-3">
              {stats.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name || r.email}</p>
                    <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === 'registered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {r.status === 'registered' ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats && stats.referrals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Gift size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhuma indicacao ainda</p>
            <p className="text-sm mt-1">Compartilhe seu link e comece a ganhar recompensas!</p>
          </div>
        )}
      </div>
    </div>
  )
}
