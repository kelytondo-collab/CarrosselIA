import { useState, useEffect } from 'react'
import { Sparkles, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiForgotPassword, ApiError, clearToken } from '../services/apiService'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register' | 'forgot'

interface Props {
  referralCode?: string
  onLanding?: () => void
}

export default function Login({ referralCode, onLanding }: Props) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Clear stale token when login page mounts (fixes "sessão expirada" loop)
  useEffect(() => { clearToken() }, [])

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [niche, setNiche] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Bem-vindo(a) de volta!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await register({ email, name, password, birth_date: birthDate || undefined, niche: niche || undefined, referral_code: referralCode })
      toast.success('Conta criada! Seu trial de 7 dias comecou.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiForgotPassword(email)
      toast.success(res.message)
      setMode('login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">AUTOR.IA</h1>
              <p className="text-xs text-purple-300">Sua fabrica de conteudo com essencia</p>
            </div>
          </div>
          {referralCode && (
            <div className="inline-block px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
              +3 dias extras no trial via indicacao
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 p-8 shadow-2xl">
          {/* Mode tabs */}
          {mode !== 'forgot' && (
            <div className="flex mb-6 bg-gray-800/50 rounded-xl p-1">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Criar conta
              </button>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-12"
                    placeholder="Sua senha"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Entrar</span> <ArrowRight size={16} /></>}
              </button>
              <button type="button" onClick={() => setMode('forgot')} className="w-full text-center text-sm text-purple-400 hover:text-purple-300">
                Esqueci minha senha
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome completo *</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Data de nascimento</label>
                  <input
                    type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Nicho</label>
                  <input
                    type="text" value={niche} onChange={e => setNiche(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Ex: terapia"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-12"
                    placeholder="Min. 6 caracteres"
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Comecar trial gratis</span> <ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-gray-500">
                7 dias gratis com todas as funcionalidades{referralCode ? ' (+3 dias bonus)' : ''}
              </p>
            </form>
          )}

          {/* Forgot Password */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-2">Recuperar senha</h3>
              <p className="text-sm text-gray-400 mb-4">Informe seu email para receber o link de recuperacao.</p>
              <div>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enviar link'}
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-purple-400 hover:text-purple-300">
                Voltar ao login
              </button>
            </form>
          )}
        </div>

        {/* Landing CTA */}
        {onLanding && (
          <div className="text-center mt-6">
            <button onClick={onLanding} className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4">
              Descubra sua Essencia em 60 segundos
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          AUTOR.IA — Fabrica de conteudo com essencia
        </p>
      </div>
    </div>
  )
}
