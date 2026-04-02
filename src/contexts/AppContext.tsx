import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Project, CarouselData, SpecialistProfile } from '../types'
import { loadDarkMode, saveDarkMode, getProfiles, fetchProfiles, fetchProjects } from '../services/storageService'

export type View = 'dashboard' | 'editor' | 'preview' | 'profiles' | 'settings' | 'post-editor' | 'post-preview' | 'stories-editor' | 'stories-preview' | 'quote-video' | 'carousel-reel' | 'reels-conexao' | 'creator-dashboard' | 'referral'

interface AppCtx {
  view: View
  setView: (v: View) => void
  currentProject: Project | null
  setCurrentProject: (p: Project | null) => void
  currentCarousel: CarouselData | null
  setCurrentCarousel: (c: CarouselData | null) => void
  projects: Project[]
  refreshProjects: () => Promise<void>
  profiles: SpecialistProfile[]
  refreshProfiles: () => Promise<void>
  isDark: boolean
  toggleDark: () => void
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
  generationPhase: string
  setGenerationPhase: (p: string) => void
  generationProgress: number
  setGenerationProgress: (n: number) => void
  expertPhotoBase64: string | undefined
  setExpertPhotoBase64: (v: string | undefined) => void
}

const Ctx = createContext<AppCtx | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [view, setView] = useState<View>('dashboard')
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentCarousel, setCurrentCarousel] = useState<CarouselData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [profiles, setProfiles] = useState<SpecialistProfile[]>([])
  const [isDark, setIsDark] = useState(loadDarkMode)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPhase, setGenerationPhase] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [expertPhotoBase64, setExpertPhotoBase64] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDark])

  useEffect(() => {
    refreshProjects()
    refreshProfiles()
  }, [])

  const refreshProjects = async () => {
    const updated = await fetchProjects()
    setProjects(updated)
  }

  const refreshProfiles = async () => {
    // Fast: read from localStorage cache first
    const cached = getProfiles()
    if (cached.length > 0) {
      setProfiles(cached)
      const dp = cached.find(p => p.is_default) || cached[0]
      if (dp?.photo_base64) setExpertPhotoBase64(dp.photo_base64)
    }
    // Then fetch from API (updates localStorage + state)
    const updated = await fetchProfiles()
    setProfiles(updated)
    const dp = updated.find(p => p.is_default) || updated[0]
    if (dp?.photo_base64) setExpertPhotoBase64(dp.photo_base64)
  }

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    saveDarkMode(next)
  }

  return (
    <Ctx.Provider value={{
      view, setView,
      currentProject, setCurrentProject,
      currentCarousel, setCurrentCarousel,
      projects, refreshProjects,
      profiles, refreshProfiles,
      isDark, toggleDark,
      isGenerating, setIsGenerating,
      generationPhase, setGenerationPhase,
      generationProgress, setGenerationProgress,
      expertPhotoBase64, setExpertPhotoBase64,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
