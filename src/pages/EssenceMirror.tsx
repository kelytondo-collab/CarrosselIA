import { useMemo, useState, useRef } from 'react'
import { Sparkles, ArrowRight, ArrowLeft, Loader2, ChevronLeft, ChevronRight, Crown, Palette, Video, FileText, Layout, MessageSquare } from 'lucide-react'
import { calcProfile, calcEnergyOfMonth, suggestContentType, NUMBER_MEANINGS, type NumerologyProfile } from '../services/numerologyService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3080'

interface Props {
  name: string
  birthDate: string
  niche: string
  onStartTrial: () => void
  onBack: () => void
}

interface DemoSlide {
  headline: string
  subtitle: string
  type: string
}

interface DemoCarousel {
  slides: DemoSlide[]
  caption?: { hook?: string; body?: string; cta?: string; hashtags?: string }
}

// Mini slide card for demo preview
function MiniSlide({ slide, index, total, palette }: { slide: DemoSlide; index: number; total: number; palette: { bg: string; text: string; accent: string } }) {
  const isCover = index === 0
  const isCta = index === total - 1

  return (
    <div
      className="w-full aspect-[4/5] rounded-2xl flex flex-col justify-between overflow-hidden relative shrink-0"
      style={{
        background: isCover
          ? `linear-gradient(145deg, ${palette.bg} 0%, ${palette.accent}dd 100%)`
          : isCta
            ? `linear-gradient(145deg, ${palette.accent} 0%, ${palette.bg} 100%)`
            : `linear-gradient(145deg, ${palette.bg} 0%, ${palette.bg}ee 100%)`,
        padding: '10%',
      }}
    >
      {/* Accent bar */}
      {!isCover && !isCta && (
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: palette.accent }} />
      )}

      {/* Slide number */}
      {!isCover && !isCta && (
        <div className="text-[10px] font-bold opacity-40" style={{ color: palette.text }}>
          {String(index).padStart(2, '0')}
        </div>
      )}

      {isCover && (
        <div className="flex items-center gap-1.5 mb-auto">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: palette.accent + '40' }}>
            <Sparkles size={10} style={{ color: palette.text }} />
          </div>
          <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: palette.text, opacity: 0.7 }}>
            AUTOR.IA
          </span>
        </div>
      )}

      <div className={isCover ? 'mt-auto' : ''}>
        <h3
          className={`font-bold leading-tight ${isCover ? 'text-base md:text-lg' : isCta ? 'text-sm md:text-base' : 'text-sm md:text-base'}`}
          style={{ color: palette.text }}
        >
          {slide.headline}
        </h3>
        {slide.subtitle && (
          <p
            className="mt-2 text-[11px] md:text-xs leading-relaxed opacity-80"
            style={{ color: palette.text }}
          >
            {slide.subtitle}
          </p>
        )}
      </div>

      {isCta && (
        <div
          className="mt-4 py-2 px-4 rounded-xl text-center text-[11px] font-bold"
          style={{ background: palette.accent, color: palette.bg }}
        >
          Saiba mais
        </div>
      )}
    </div>
  )
}

function NumberCard({ num, label, meaning }: { num: number; label: string; meaning: { title: string; keywords: string[]; communicationStyle: string; magnetism: string } }) {
  const colors: Record<number, string> = {
    1: 'from-red-500 to-orange-500',
    2: 'from-blue-400 to-cyan-400',
    3: 'from-amber-400 to-yellow-400',
    4: 'from-green-500 to-emerald-500',
    5: 'from-orange-500 to-red-400',
    6: 'from-pink-400 to-rose-400',
    7: 'from-indigo-500 to-purple-500',
    8: 'from-amber-500 to-yellow-600',
    9: 'from-violet-500 to-purple-500',
    11: 'from-violet-400 to-pink-500',
    22: 'from-amber-400 to-violet-500',
  }

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-5 hover:border-violet-500/30 transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[num] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white text-lg font-bold shadow-lg shrink-0`}>
          {num}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
          <h3 className="text-base font-bold text-white mb-1">{meaning.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{meaning.communicationStyle}</p>
        </div>
      </div>
    </div>
  )
}

export default function EssenceMirror({ name, birthDate, niche, onStartTrial, onBack }: Props) {
  const profile = useMemo<NumerologyProfile>(() => calcProfile(name, birthDate), [name, birthDate])
  const monthEnergy = useMemo(() => calcEnergyOfMonth(), [])
  const monthSuggestion = useMemo(() => suggestContentType(monthEnergy), [monthEnergy])

  const [demoCarousel, setDemoCarousel] = useState<DemoCarousel | null>(null)
  const [generating, setGenerating] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [error, setError] = useState('')
  const carouselRef = useRef<HTMLDivElement>(null)

  const firstName = name.split(' ')[0]
  const expressaoMeaning = NUMBER_MEANINGS[profile.expressao] || NUMBER_MEANINGS[1]
  const destinoMeaning = NUMBER_MEANINGS[profile.destino] || NUMBER_MEANINGS[1]
  const motivacaoMeaning = NUMBER_MEANINGS[profile.motivacao] || NUMBER_MEANINGS[1]
  const missaoMeaning = NUMBER_MEANINGS[profile.missao] || NUMBER_MEANINGS[1]
  const impressaoMeaning = NUMBER_MEANINGS[profile.impressao] || NUMBER_MEANINGS[1]

  // Palette based on expression number
  const palettes: Record<number, { bg: string; text: string; accent: string }> = {
    1: { bg: '#1a1020', text: '#ffffff', accent: '#e74c3c' },
    2: { bg: '#0f1a2e', text: '#ffffff', accent: '#3498db' },
    3: { bg: '#1a1520', text: '#ffffff', accent: '#f39c12' },
    4: { bg: '#0f1f15', text: '#ffffff', accent: '#27ae60' },
    5: { bg: '#1f1510', text: '#ffffff', accent: '#e67e22' },
    6: { bg: '#1f1020', text: '#ffffff', accent: '#e91e8c' },
    7: { bg: '#15102a', text: '#ffffff', accent: '#8e44ad' },
    8: { bg: '#1a1810', text: '#ffffff', accent: '#d4a017' },
    9: { bg: '#1a1030', text: '#ffffff', accent: '#9b59b6' },
    11: { bg: '#1a1030', text: '#ffffff', accent: '#a855f7' },
    22: { bg: '#1a1520', text: '#ffffff', accent: '#c084fc' },
  }
  const palette = palettes[profile.expressao] || palettes[1]

  const generateDemoCarousel = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/demo/generate-carousel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthDate, niche }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao gerar demo')
      }
      const data = await res.json()
      setDemoCarousel(data.carousel)
      setCurrentSlide(0)
      // Scroll to carousel
      setTimeout(() => {
        carouselRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar demo. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const slides = demoCarousel?.slides || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 overflow-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">AUTOR.IA</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        {/* Title */}
        <div className="text-center pt-8 pb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            <Sparkles size={14} />
            Espelho da Essencia
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {firstName}, esta e a sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">essencia</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Sua numerologia revela como voce naturalmente se comunica, atrai e transforma.
            {niche && <> Aplicado ao seu nicho de <strong className="text-gray-200">{niche}</strong>.</>}
          </p>
        </div>

        {/* Main number — Expressao */}
        <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 rounded-3xl border border-violet-500/30 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-purple-500/30 shrink-0">
              {profile.expressao}
            </div>
            <div>
              <p className="text-xs text-violet-400 uppercase tracking-wider mb-1">Seu Numero de Expressao</p>
              <h2 className="text-2xl font-bold text-white mb-2">{expressaoMeaning.title}</h2>
              <p className="text-gray-300 leading-relaxed mb-3">{expressaoMeaning.communicationStyle}</p>
              <p className="text-sm text-violet-300">
                <strong>Magnetismo:</strong> {expressaoMeaning.magnetism}
              </p>
            </div>
          </div>
        </div>

        {/* Other numbers grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <NumberCard num={profile.destino} label="Destino" meaning={destinoMeaning} />
          <NumberCard num={profile.motivacao} label="Motivacao" meaning={motivacaoMeaning} />
          <NumberCard num={profile.missao} label="Missao" meaning={missaoMeaning} />
          <NumberCard num={profile.impressao} label="Impressao" meaning={impressaoMeaning} />
        </div>

        {/* Month energy */}
        <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              {monthEnergy}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Energia do Mes</p>
              <p className="font-bold text-white">{monthSuggestion.label}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">{monthSuggestion.description}</p>
        </div>

        {/* ============ DEMO CAROUSEL SECTION ============ */}
        <div ref={carouselRef} className="mb-12">
          {!demoCarousel && !generating && (
            <div className="text-center py-12 bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-3xl border border-violet-500/20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/30">
                <Sparkles size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Veja sua essencia em acao</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                A IA vai gerar um carrossel de exemplo usando sua essencia numerologica.
                Conteudo que <strong className="text-violet-300">so voce</strong> poderia ter escrito.
              </p>
              <button
                onClick={generateDemoCarousel}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-base rounded-2xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-2xl shadow-purple-500/25"
              >
                <Sparkles size={18} />
                Gerar meu carrossel de exemplo
                <ArrowRight size={18} />
              </button>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>
          )}

          {generating && (
            <div className="text-center py-16 bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-3xl border border-violet-500/20">
              <Loader2 size={40} className="text-violet-400 animate-spin mx-auto mb-5" />
              <h3 className="text-lg font-bold text-white mb-2">Gerando seu carrossel com essencia...</h3>
              <p className="text-gray-400 text-sm">A IA esta criando conteudo unico para voce. Aguarde uns segundos.</p>
            </div>
          )}

          {demoCarousel && slides.length > 0 && (
            <>
              <div className="text-center mb-6">
                <p className="text-xs text-violet-400 uppercase tracking-wider font-medium mb-2">Carrossel gerado com sua essencia</p>
                <h3 className="text-xl font-bold text-white">Isso e o que a IA generica NUNCA vai fazer por voce</h3>
              </div>

              {/* Carousel viewer */}
              <div className="bg-gray-900/60 rounded-3xl border border-gray-800 p-6 md:p-8">
                {/* Slide display */}
                <div className="max-w-xs mx-auto mb-6">
                  <MiniSlide
                    slide={slides[currentSlide]}
                    index={currentSlide}
                    total={slides.length}
                    palette={palette}
                  />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-400 font-medium">
                    {currentSlide + 1} / {slides.length}
                  </span>
                  <button
                    onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                    disabled={currentSlide === slides.length - 1}
                    className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Dots */}
                <div className="flex items-center justify-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === currentSlide ? 'bg-violet-500 w-5' : 'bg-gray-700 hover:bg-gray-600'}`}
                    />
                  ))}
                </div>

                {/* Caption preview */}
                {demoCarousel.caption && (
                  <div className="mt-6 pt-5 border-t border-gray-800">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Legenda gerada</p>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      <strong>{demoCarousel.caption.hook}</strong>{' '}
                      {demoCarousel.caption.body}{' '}
                      <span className="text-violet-400">{demoCarousel.caption.cta}</span>
                    </p>
                    {demoCarousel.caption.hashtags && (
                      <p className="text-xs text-violet-400/60 mt-2">{demoCarousel.caption.hashtags}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ============ PAYWALL / CTA SECTION ============ */}
        <div className="relative rounded-3xl border border-violet-500/20 p-8 md:p-10 mb-12 overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/30">
              <Crown size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {demoCarousel ? 'Gostou? Isso e so um gostinho.' : 'Isso e so o comeco, ' + firstName + '.'}
            </h3>
            <p className="text-gray-400 max-w-lg mx-auto">
              {demoCarousel
                ? 'Na versao completa, voce gera carrosseis, posts, stories, videos com teleprompter, reels com legendas e muito mais — tudo com a SUA essencia.'
                : 'Com o AUTOR.IA, voce desbloqueia todo o poder da sua essencia para criar conteudo que so VOCE poderia ter escrito.'
              }
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto">
            {[
              { icon: Layout, label: 'Carrosseis', desc: 'Com style packs profissionais' },
              { icon: FileText, label: 'Posts', desc: 'Feed e stories prontos' },
              { icon: Video, label: 'Videos', desc: 'Teleprompter + legendas' },
              { icon: MessageSquare, label: 'Reels', desc: 'Frases animadas com audio' },
              { icon: Palette, label: 'Visual', desc: '3 temas de design premium' },
              { icon: Sparkles, label: 'Essencia', desc: 'Numerologia em cada conteudo' },
            ].map((f, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                <f.icon size={16} className="text-violet-400 mb-1.5" />
                <p className="text-sm font-bold text-white">{f.label}</p>
                <p className="text-[10px] text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing teaser */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 mb-3">A partir de</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">R$79</span>
              <span className="text-gray-400">/mes</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">ou R$197/mes ilimitado</p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={onStartTrial}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg rounded-2xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-2xl shadow-purple-500/25"
            >
              <Sparkles size={20} />
              Comecar trial gratis de 7 dias
              <ArrowRight size={20} />
            </button>
            <p className="text-sm text-gray-500 mt-4">Sem cartao. Cancele quando quiser.</p>
          </div>
        </div>

        {/* Differentiator */}
        <div className="text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">A diferenca que a essencia faz</p>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 text-left">
              <p className="font-bold text-red-400 mb-2 text-sm">IA Generica (ChatGPT, etc)</p>
              <ul className="space-y-1.5 text-xs text-gray-500">
                <li>- Conteudo generico que qualquer um poderia postar</li>
                <li>- Mesmo tom para todos os nichos</li>
                <li>- Zero personalidade ou essencia</li>
                <li>- Voce gasta horas reescrevendo</li>
              </ul>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 text-left">
              <p className="font-bold text-violet-400 mb-2 text-sm">AUTOR.IA</p>
              <ul className="space-y-1.5 text-xs text-gray-300">
                <li>+ Conteudo com SUA essencia numerologica</li>
                <li>+ Tom calibrado pela sua voz unica</li>
                <li>+ Visual profissional em 5 minutos</li>
                <li>+ Carrossel, post, stories, video prontos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
