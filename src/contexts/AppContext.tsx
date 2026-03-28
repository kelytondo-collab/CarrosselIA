import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Project, CarouselData, SpecialistProfile } from '../types'
import { loadDarkMode, saveDarkMode, loadApiKey, getProjects, getProfiles, saveApiKey } from '../services/storageService'
import { initGemini } from '../services/geminiService'

export type View = 'dashboard' | 'editor' | 'preview' | 'profiles' | 'settings' | 'post-editor' | 'post-preview' | 'stories-editor' | 'stories-preview' | 'quote-video' | 'carousel-reel'

interface AppCtx {
  view: View
  setView: (v: View) => void
  currentProject: Project | null
  setCurrentProject: (p: Project | null) => void
  currentCarousel: CarouselData | null
  setCurrentCarousel: (c: CarouselData | null) => void
  projects: Project[]
  refreshProjects: () => void
  profiles: SpecialistProfile[]
  refreshProfiles: () => void
  isDark: boolean
  toggleDark: () => void
  apiKey: string
  setApiKey: (k: string) => void
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
  const [apiKey, setApiKeyState] = useState(loadApiKey)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPhase, setGenerationPhase] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [expertPhotoBase64, setExpertPhotoBase64] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDark])

  useEffect(() => {
    if (apiKey) initGemini(apiKey)
  }, [apiKey])

  useEffect(() => {
    refreshProjects()
    refreshProfiles()
    // Load expert photo from default profile
    const dp = getProfiles().find(p => p.is_default) || getProfiles()[0]
    if (dp?.photo_base64) setExpertPhotoBase64(dp.photo_base64)
  }, [])

  const refreshProjects = () => setProjects(getProjects())
  const refreshProfiles = () => {
    const updated = getProfiles()
    setProfiles(updated)
    // Keep expert photo in sync with default profile
    const dp = updated.find(p => p.is_default) || updated[0]
    if (dp?.photo_base64) setExpertPhotoBase64(dp.photo_base64)
  }

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    saveDarkMode(next)
  }

  const setApiKey = (k: string) => {
    setApiKeyState(k)
    saveApiKey(k)
    if (k) initGemini(k)
  }

  return (
    <Ctx.Provider value={{
      view, setView,
      currentProject, setCurrentProject,
      currentCarousel, setCurrentCarousel,
      projects, refreshProjects,
      profiles, refreshProfiles,
      isDark, toggleDark,
      apiKey, setApiKey,
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
