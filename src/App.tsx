import { useState } from 'react'
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
import { getDefaultProfile } from './services/storageService'

function AppContent() {
  const { view, isDark, apiKey, refreshProfiles } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!getDefaultProfile())

  const handleOnboardingComplete = () => {
    refreshProfiles()
    setShowOnboarding(false)
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
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={20} />
            </button>
            <span className="ml-3 font-bold text-gray-900 dark:text-white text-sm">Post Ativo AI</span>
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
