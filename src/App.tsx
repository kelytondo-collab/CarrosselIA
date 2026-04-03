import { useState, useEffect } from 'react'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Menu } from 'lucide-react'
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
import ReelsRecordEditor from './components/video/ReelsRecordEditor'
import LoginScreen from './components/auth/LoginScreen'
import { getDefaultProfile, createSimpleProject, updateProjectCarousel, updateProjectPost, updateProjectStories } from './services/storageService'
import { saveInstagramToken } from './services/apiService'
import toast from 'react-hot-toast'

function AppContent() {
  const { view, isDark, apiKey, refreshProfiles, setView, setCurrentProject, setCurrentCarousel, refreshProjects, setInstagram } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !getDefaultProfile())
  const [loggedIn, setLoggedIn] = useState(true) // Auth desabilitado — Carrossel livre

  // Recovery: re-check profile after mount (fixes race condition)
  useEffect(() => {
    const profile = getDefaultProfile()
    if (profile && showOnboarding) setShowOnboarding(false)
  }, [])

  // Handle Instagram OAuth callback from hash params
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('ig_callback=1')) return

    const params = new URLSearchParams(hash.slice(1))
    if (params.get('ig_callback') === '1') {
      const token = params.get('ig_token')
      const accountId = params.get('ig_account_id')
      const username = params.get('ig_username')
      const expiresAt = params.get('ig_expires_at')

      if (token && accountId && username && expiresAt) {
        // Save token to server
        saveInstagramToken({ accessToken: token, igAccountId: accountId, username, expiresAt })
          .then(() => {
            setInstagram({ username, expiresAt })
            toast.success(`Instagram conectado: @${username}`)
          })
          .catch(() => toast.error('Erro ao salvar token do Instagram'))
      }
      // Clear hash
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // Check for Instagram errors
    const igError = params.get('ig_error')
    if (igError) {
      if (igError === 'no_business_account') {
        toast.error('Nenhuma conta Business/Creator encontrada. Converta sua conta no Instagram.')
      } else {
        toast.error(`Erro Instagram: ${igError}`)
      }
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Luminae → Carrossel: detect #import= hash on mount
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#import=')) return
    try {
      const b64 = hash.slice('#import='.length)
      // Safe UTF-8 base64 decoding
      const binary = atob(b64)
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      const json = new TextDecoder().decode(bytes)
      const data = JSON.parse(json)
      // Clear hash immediately
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
        const project = createSimpleProject(`Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Import'}`, slides[0]?.headline || '', 'carousel')
        updateProjectCarousel(project.id, carousel as any)
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
        const project = createSimpleProject(`Luminae: ${postData.headline.slice(0, 30)}`, postData.headline, 'post')
        updateProjectPost(project.id, postData)
        refreshProjects()
        setCurrentProject({ ...project, current_post_data: postData })
        setView('post-preview')
        toast.success('Post importado do Luminae!')
      } else if (tipo === 'reels_conexao') {
        // Save phrases to localStorage — ReelsConexaoEditor reads on mount
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
      } else if (tipo === 'reels_record') {
        // Save hook text to localStorage — ReelsRecordEditor reads on mount
        const hook = data.hook || caption.hook || ''
        if (hook) {
          localStorage.setItem('luminae_reels_record_import', JSON.stringify({
            hook,
            caption: caption.body || '',
          }))
          setView('reels-record')
          toast.success('Hook importado do Luminae!')
        } else {
          toast.error('Nenhum hook encontrado para o Reels')
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
        const project = createSimpleProject(`Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Stories'}`, slides[0]?.headline || '', 'stories')
        updateProjectStories(project.id, storiesData)
        refreshProjects()
        setCurrentProject({ ...project, current_stories_data: storiesData })
        setView('stories-preview')
        toast.success('Stories importados do Luminae!')
      }
    } catch (err) {
      console.error('[Luminae Import] Erro ao decodificar hash:', err)
      toast.error('Erro ao importar do Luminae. Tente copiar e colar manualmente.')
    }
  }, [])

  const handleOnboardingComplete = () => {
    refreshProfiles()
    setShowOnboarding(false)
  }

  const handleLoginSuccess = () => {
    setLoggedIn(true)
    // Trigger data sync from server
    window.location.reload()
  }

  // Show login screen if not logged in
  if (!loggedIn) {
    return (
      <div>
        <LoginScreen onSuccess={handleLoginSuccess} />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            style: { borderRadius: '12px', fontSize: '13px' },
          }}
        />
      </div>
    )
  }

  if (showOnboarding) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <Onboarding onComplete={handleOnboardingComplete} apiKey={apiKey} />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            style: { borderRadius: '12px', fontSize: '13px' },
          }}
        />
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
    'reels-record': <ReelsRecordEditor />,
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={20} />
            </button>
            <span className="ml-3 font-bold text-gray-900 dark:text-white text-sm">Carrossel</span>
          </div>

          {/* Page content */}
          <main className="flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
