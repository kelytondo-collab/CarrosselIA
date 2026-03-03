import type { Project, SpecialistProfile, CarouselData, ProjectInputs } from '../types'

const KEYS = {
  projects: 'postativo_projects',
  profiles: 'postativo_profiles',
  apiKey: 'postativo_gemini_key',
  darkMode: 'postativo_dark_mode',
}

// ── Helpers ──
function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── API Key ──
export const saveApiKey = (key: string) => localStorage.setItem(KEYS.apiKey, key)
export const loadApiKey = (): string => localStorage.getItem(KEYS.apiKey) || ''

// ── Dark Mode ──
export const saveDarkMode = (v: boolean) => localStorage.setItem(KEYS.darkMode, String(v))
export const loadDarkMode = (): boolean => localStorage.getItem(KEYS.darkMode) === 'true'

// ── Profiles ──
export const getProfiles = (): SpecialistProfile[] => load<SpecialistProfile>(KEYS.profiles)

export const saveProfile = (profile: SpecialistProfile): void => {
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === profile.id)
  if (idx >= 0) profiles[idx] = profile
  else profiles.push(profile)
  // ensure only one default
  if (profile.is_default) {
    profiles.forEach(p => { if (p.id !== profile.id) p.is_default = false })
  }
  save(KEYS.profiles, profiles)
}

export const deleteProfile = (id: string): void => {
  save(KEYS.profiles, getProfiles().filter(p => p.id !== id))
}

export const getDefaultProfile = (): SpecialistProfile | undefined =>
  getProfiles().find(p => p.is_default) || getProfiles()[0]

// ── Projects ──
export const getProjects = (): Project[] =>
  load<Project>(KEYS.projects).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

export const getProject = (id: string): Project | undefined =>
  getProjects().find(p => p.id === id)

export const createProject = (inputs: ProjectInputs): Project => {
  // Strip expertPhotoBase64 (large base64) before saving to localStorage
  const { expertPhotoBase64: _photo, ...inputsToSave } = inputs
  const project: Project = {
    id: crypto.randomUUID(),
    name: inputs.projectName || `Projeto ${Date.now()}`,
    theme: inputs.theme,
    product: inputs.product,
    platform: inputs.platform,
    inputs_json: inputsToSave,
    status: 'active',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const projects = getProjects()
  projects.unshift(project)
  save(KEYS.projects, projects)
  return project
}

export const updateProjectCarousel = (id: string, data: CarouselData): void => {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    // Strip imageUrl (base64) from slides before saving — images are too large for localStorage
    const dataToSave: CarouselData = {
      ...data,
      slides: data.slides.map(s => ({ ...s, imageUrl: undefined, isGeneratingImage: false })),
    }
    projects[idx].current_carousel_data = dataToSave
    projects[idx].updated_at = new Date().toISOString()
    save(KEYS.projects, projects)
  }
}

export const toggleFavorite = (id: string): void => {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    projects[idx].is_favorite = !projects[idx].is_favorite
    save(KEYS.projects, projects)
  }
}

export const archiveProject = (id: string): void => {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    projects[idx].status = 'archived'
    save(KEYS.projects, projects)
  }
}

export const deleteProject = (id: string): void => {
  save(KEYS.projects, getProjects().filter(p => p.id !== id))
}
