import { useState } from 'react'
import { Sparkles, ArrowRight, Loader2, Star, Zap, Shield } from 'lucide-react'

interface Props {
  onResult: (data: { name: string; birthDate: string; niche: string }) => void
  onLogin: () => void
}

export default function Landing({ onResult, onLogin }: Props) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !birthDate) return
    setLoading(true)
    // Small delay for anticipation
    setTimeout(() => {
      onResult({ name, birthDate, niche })
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-white">AUTOR.IA</span>
        </div>
        <button onClick={onLogin} className="text-sm text-purple-400 hover:text-white transition-colors">
          Ja tenho conta
        </button>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-block px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium mb-6">
              A IA que gera conteudo com a SUA essencia
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Seus posts nunca mais vao ser{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">genericos</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              AUTOR.IA usa numerologia, essencia e inteligencia artificial para criar conteudo que{' '}
              <strong className="text-gray-200">so voce poderia ter escrito</strong>.
              Descubra em 60 segundos o que torna sua comunicacao unica.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-6 mb-8">
              <div className="flex -space-x-2">
                {['bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-gray-950 flex items-center justify-center text-white text-[10px] font-bold`}>
                    {['K', 'M', 'D', 'A', 'P'][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400">
                <strong className="text-gray-200">250+ especialistas</strong> ja criaram com AUTOR.IA
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-800 p-8 shadow-2xl shadow-purple-500/5">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <Sparkles size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Descubra sua Essencia</h2>
              <p className="text-sm text-gray-400">3 campos. 60 segundos. Zero custo.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome completo *</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-base"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Data de nascimento *</label>
                <input
                  type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Seu nicho / area</label>
                <input
                  type="text" value={niche} onChange={e => setNiche(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-base"
                  placeholder="Ex: terapia, coaching, psicologia..."
                />
              </div>
              <button
                type="submit" disabled={loading || !name || !birthDate}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg shadow-purple-500/25"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Calculando sua essencia...</>
                ) : (
                  <><span>Descobrir minha Essencia</span> <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-600 mt-4">
              Sem cartao. Sem spam. Resultado instantaneo.
            </p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            { icon: Star, title: 'Essencia Unica', desc: 'Numerologia cabalistica + IA geram conteudo que so VOCE poderia escrever' },
            { icon: Zap, title: '5 Minutos', desc: 'De 3 horas no Canva para 5 minutos. Carrossel, post, stories e video prontos' },
            { icon: Shield, title: 'Sua Voz', desc: 'AUTOR.IA NUNCA reescreve. Preserva suas palavras e so muda o formato' },
          ].map((f, i) => (
            <div key={i} className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-violet-400" />
              </div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Differentiator */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">O que a IA generica NUNCA vai fazer por voce</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-left">
              <p className="font-bold text-red-400 mb-3">IA Generica</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>- Conteudo generico que qualquer um poderia postar</li>
                <li>- Mesmo tom para todos os nichos</li>
                <li>- Zero personalidade ou essencia</li>
                <li>- Voce precisa reescrever tudo</li>
              </ul>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-6 text-left">
              <p className="font-bold text-violet-400 mb-3">AUTOR.IA</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>+ Conteudo com sua essencia numerologica</li>
                <li>+ Tom calibrado pela sua voz unica</li>
                <li>+ Preserva suas palavras originais</li>
                <li>+ Visual profissional em 5 minutos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
