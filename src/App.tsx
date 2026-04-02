import { useState, useEffect } from 'react'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Menu } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useApp } from './contexts/AppContext'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './components/dashboard/Dashboard'
import InputSection from './components/input/InputSection'
import CarouselPreview from './components/preview/CarouselPreview'
import ProfileManager from './components/profile/ProfileManager'
import Settings from './components/settings/Settings'
import GeneratingOverlay from './components/GeneratingOverlay'
import Onboarding from './components/onboarding/Onboarding'
import PostEditor from './components/post/PostEditor'
import PostPreview from './components/post/PostPreview'
import StoriesEditor from './components/stories/StoriesEditor'
import StoriesPreview from './components/stories/StoriesPreview'
import QuoteVideoEditor from './components/video/QuoteVideoEditor'
import CarouselReelEditor from './components/video/CarouselReelEditor'
import ReelsConexaoEditor from './components/video/ReelsConexaoEditor'
import Login from './pages/Login'
import Landing from './pages/Landing'
import EssenceMirror from './pages/EssenceMirror'
import Paywall from './components/Paywall'
import UsageBanner from './components/UsageBanner'
import CreatorDashboard from './components/dashboard/CreatorDashboard'
import Referral from './pages/Referral'
import { createSimpleProject, updateProjectCarousel, updateProjectPost, updateProjectStories } from './services/storageService'
import toast from 'react-hot-toast'

type PageRoute = 'app' | 'landing' | 'mirror'

function AppContent() {
  const { view, isDark, setView, setCurrentProject, setCurrentCarousel, refreshProjects, refreshProfiles, profiles } = useApp()
  const { user, loading, isTrialExpired } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pageRoute, setPageRoute] = useState<PageRoute>('app')
  const [mirrorData, setMirrorData] = useState<{ name: string; birthDate: string; niche: string } | null>(null)
  const [referralCode, setReferralCode] = useState<string | undefined>(undefined)
  const [profilesLoaded, setProfilesLoaded] = useState(false)

  // Emergency token reset via ?reset=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset') === '1') {
      localStorage.removeItem('autoria_token')
      window.history.replaceState(null, '', window.location.pathname)
      window.location.reload()
    }
  }, [])

  // Detect referral code from URL
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/^\/r\/([A-Za-z0-9]+)$/)
    if (match) {
      setReferralCode(match[1])
      window.history.replaceState(null, '', '/')
    }
  }, [])

  // Fetch profiles from API after login, then check if needs onboarding
  useEffect(() => {
    if (user && !loading) {
      refreshProfiles().then(() => setProfilesLoaded(true))
    }
  }, [user, loading])

  // Check onboarding after profiles are loaded from API
  useEffect(() => {
    if (profilesLoaded && user) {
      setShowOnboarding(profiles.length === 0)
    }
  }, [profilesLoaded, profiles, user])

  // Luminae import via URL hash
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#import=')) return

    const doImport = async () => {
      try {
        const b64 = hash.slice('#import='.length)
        const binary = atob(b64)
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
        const json = new TextDecoder().decode(bytes)
        const data = JSON.parse(json)
        window.history.replaceState(null, '', window.location.pathname)

        const tipo = data.tipo || 'carrossel'
        const slides = data.slides || []
        const caption = data.caption || { hook: '', body: '', cta: '', hashtags: '' }
        const autoStyle = data.autoStyle === true

        if (tipo === 'carrossel' && slides.length > 0) {
          const carouselSlides = slides.map((s: { headline?: string; subtitle?: string; type?: string }, i: number) => ({
            id: i + 1,
            headline: s.headline || '',
            subtitle: s.subtitle || '',
            visualPrompt: '',
            emotion: '',
            isGeneratingImage: false,
            style: {},
            semanticType: s.type || undefined,
          }))
          const carousel = {
            strategy: { persona: '', painPoint: '', desire: '', narrativePath: '', consciousnessLevel: '', niche: '', hook: caption.hook || '' },
            slides: carouselSlides,
            caption: { hook: caption.hook || '', body: caption.body || '', cta: caption.cta || '', hashtags: caption.hashtags || '', altText: '' },
            manychat: { keyword: '', flow1: '', flow2: '', flow3: '' },
            format: '4:5' as const,
            generatedAt: new Date().toISOString(),
            autoStyle,
          }
          const project = await createSimpleProject(`Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Import'}`, slides[0]?.headline || '', 'carousel')
          await updateProjectCarousel(project.id, carousel as any)
          refreshProjects()
          setCurrentProject({ ...project, current_carousel_data: carousel as any })
          setCurrentCarousel(carousel as any)
          setView('preview')
          toast.success(autoStyle ? 'Carrossel pronto! Estilo aplicado automaticamente.' : 'Carrossel importado do Luminae!')
        } else if (tipo === 'post') {
          const postData = {
            headline: slides[0]?.headline || '',
            subtitle: slides[0]?.subtitle || '',
            caption: { hook: caption.hook || '', body: caption.body || '', cta: caption.cta || '', hashtags: caption.hashtags || '' },
            visualPrompt: '',
            layout: 'minimal' as const,
            generatedAt: new Date().toISOString(),
          }
          const project = await createSimpleProject(`Luminae: ${postData.headline.slice(0, 30)}`, postData.headline, 'post')
          await updateProjectPost(project.id, postData)
          refreshProjects()
          setCurrentProject({ ...project, current_post_data: postData })
          setView('post-preview')
          toast.success('Post importado do Luminae!')
        } else if (tipo === 'reels_conexao') {
          const phrases = data.phrases || []
          if (phrases.length > 0) {
            localStorage.setItem('luminae_reels_import', JSON.stringify({
              phrases,
              recordingTip: data.recordingTip || '',
              musicMood: data.musicMood || '',
            }))
            setView('reels-conexao')
            toast.success(`${phrases.length} frases importadas do Luminae!`)
          } else {
            toast.error('Nenhuma frase encontrada no Reels Conexao')
          }
        } else if (tipo === 'stories' && slides.length > 0) {
          const storySlides = slides.map((s: { headline?: string; subtitle?: string }, i: number) => ({
            id: i + 1,
            type: 'content' as const,
            headline: s.headline || '',
            body: s.subtitle || '',
            visualPrompt: '',
            layout: 'minimal' as const,
          }))
          const storiesData = {
            slides: storySlides,
            caption: { hook: caption.hook || '', body: caption.body || '', cta: caption.cta || '', hashtags: caption.hashtags || '' },
            generatedAt: new Date().toISOString(),
          }
          const project = await createSimpleProject(`Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Stories'}`, slides[0]?.headline || '', 'stories')
          await updateProjectStories(project.id, storiesData)
          refreshProjects()
          setCurrentProject({ ...project, current_stories_data: storiesData })
          setView('stories-preview')
          toast.success('Stories importados do Luminae!')
        }
      } catch (err) {
        console.error('[Luminae Import] Erro ao decodificar hash:', err)
        toast.error('Erro ao importar do Luminae. Tente copiar e colar manualmente.')
      }
    }
    doImport()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Landing page route
  if (pageRoute === 'landing') {
    return (
      <Landing
        onResult={(data) => { setMirrorData(data); setPageRoute('mirror') }}
        onLogin={() => setPageRoute('app')}
      />
    )
  }

  // Essence Mirror route
  if (pageRoute === 'mirror' && mirrorData) {
    return (
      <EssenceMirror
        name={mirrorData.name}
        birthDate={mirrorData.birthDate}
        niche={mirrorData.niche}
        onStartTrial={() => setPageRoute('app')}
        onBack={() => setPageRoute('landing')}
      />
    )
  }

  // Not logged in — show login (unless #import= is active — allow preview without auth)
  const hasImportHash = typeof window !== 'undefined' && window.location.hash.startsWith('#import=')
  if (!user && !hasImportHash) {
    return (
      <>
        <Login
          referralCode={referralCode}
          onLanding={() => setPageRoute('landing')}
        />
        <Toaster position="top-right" toastOptions={{ className: 'dark:bg-gray-800 dark:text-white', style: { borderRadius: '12px', fontSize: '13px' } }} />
      </>
    )
  }

  // Trial expired — show paywall (skip if import mode)
  if (isTrialExpired && !hasImportHash) {
    return (
      <>
        <Paywall />
        <Toaster position="top-right" toastOptions={{ className: 'dark:bg-gray-800 dark:text-white', style: { borderRadius: '12px', fontSize: '13px' } }} />
      </>
    )
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <Onboarding onComplete={() => { refreshProfiles(); setShowOnboarding(false) }} />
        <Toaster position="top-right" toastOptions={{ className: 'dark:bg-gray-800 dark:text-white', style: { borderRadius: '12px', fontSize: '13px' } }} />
      </div>
    )
  }

  const PAGE: Record<string, React.ReactElement> = {
    dashboard: <Dashboard />,
    editor: <InputSection />,
    preview: <CarouselPreview />,
    profiles: <ProfileManager />,
    settings: <Settings />,
    'post-editor': <PostEditor />,
    'post-preview': <PostPreview />,
    'stories-editor': <StoriesEditor />,
    'stories-preview': <StoriesPreview />,
    'quote-video': <QuoteVideoEditor />,
    'carousel-reel': <CarouselReelEditor />,
    'reels-conexao': <ReelsConexaoEditor />,
    'creator-dashboard': <CreatorDashboard />,
    'referral': <Referral />,
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Mobile Sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-50 h-full">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Usage Banner */}
          <UsageBanner />

          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={20} />
            </button>
            <span className="ml-3 font-bold text-gray-900 dark:text-white text-sm">AUTOR.IA</span>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
            {PAGE[view] || <Dashboard />}
          </main>
        </div>

        <GeneratingOverlay />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            style: { borderRadius: '12px', fontSize: '13px' },
          }}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}
