import type { Project, SpecialistProfile, CarouselData, ProjectInputs, PostData, StoriesData, ProjectType } from '../types'
import { apiFetch, getToken } from './apiService'

const KEYS = {
  projects: 'postativo_projects',
  profiles: 'postativo_profiles',
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

const isAuth = () => !!getToken()

// ── Field Mappers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileFromServer(p: any): SpecialistProfile {
  return {
    id: String(p.id),
    name: p.name || '',
    photo_base64: p.photo_base64 || undefined,
    niche: p.niche || undefined,
    targetAudience: p.target_audience || undefined,
    tone: p.tone || undefined,
    bio: p.bio || undefined,
    color_palette: p.color_palette || { primary: '#8b5cf6', secondary: '#0f172a', accent: '#f8fafc', background: '#0f0a1a', text: '#ffffff' },
    brandKit: p.brand_kit || undefined,
    default_platform: p.default_platform || 'instagram',
    default_slide_count: p.default_slide_count || 8,
    is_default: !!p.is_default,
    created_at: p.created_at || new Date().toISOString(),
    voiceBlueprint: p.voice_blueprint || undefined,
    preferred_font: p.preferred_font || undefined,
    instagramHandle: p.instagram_handle || undefined,
    stylePackId: p.style_pack_id || undefined,
  }
}

function mapProfileToServer(p: SpecialistProfile): Record<string, unknown> {
  return {
    name: p.name,
    photo_base64: p.photo_base64 || null,
    niche: p.niche || null,
    target_audience: p.targetAudience || null,
    tone: p.tone || 'profissional',
    bio: p.bio || null,
    color_palette: p.color_palette,
    brand_kit: p.brandKit || null,
    voice_blueprint: p.voiceBlueprint || null,
    instagram_handle: p.instagramHandle || null,
    style_pack_id: p.stylePackId || 'livre',
    default_platform: p.default_platform || 'instagram',
    default_slide_count: p.default_slide_count || 8,
    preferred_font: p.preferred_font || null,
    is_default: p.is_default,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProjectFromServer(p: any): Project {
  return {
    id: String(p.id),
    name: p.name || '',
    type: p.type || 'carousel',
    theme: p.theme || undefined,
    product: p.product || undefined,
    platform: p.platform || undefined,
    inputs_json: p.inputs_json || undefined,
    current_carousel_data: p.carousel_data || undefined,
    current_post_data: p.post_data || undefined,
    current_stories_data: p.stories_data || undefined,
    status: p.status || 'active',
    is_favorite: !!p.is_favorite,
    tags: p.tags || undefined,
    created_at: p.created_at || new Date().toISOString(),
    updated_at: p.updated_at || new Date().toISOString(),
  }
}

// ── Dark Mode (always local) ──
export const saveDarkMode = (v: boolean) => localStorage.setItem(KEYS.darkMode, String(v))
export const loadDarkMode = (): boolean => localStorage.getItem(KEYS.darkMode) === 'true'

// ── Profiles — sync reads from localStorage cache ──
export const getProfiles = (): SpecialistProfile[] => load<SpecialistProfile>(KEYS.profiles)

export const getDefaultProfile = (): SpecialistProfile | undefined =>
  getProfiles().find(p => p.is_default) || getProfiles()[0]

// ── Profiles — async API + cache ──
export async function fetchProfiles(): Promise<SpecialistProfile[]> {
  if (!isAuth()) return getProfiles()
  try {
    const res = await apiFetch<{ profiles: unknown[] }>('/api/profiles')
    const mapped = (res.profiles || []).map(mapProfileFromServer)
    save(KEYS.profiles, mapped)
    return mapped
  } catch (err) {
    console.error('[fetchProfiles]', err)
    return getProfiles()
  }
}

export async function saveProfile(profile: SpecialistProfile): Promise<SpecialistProfile> {
  // Update localStorage cache immediately
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === profile.id)
  if (idx >= 0) profiles[idx] = profile
  else profiles.push(profile)
  if (profile.is_default) {
    profiles.forEach(p => { if (p.id !== profile.id) p.is_default = false })
  }
  save(KEYS.profiles, profiles)

  if (!isAuth()) return profile

  try {
    const serverData = mapProfileToServer(profile)
    const isExisting = idx >= 0 && /^\d+$/.test(profile.id)
    if (isExisting) {
      const res = await apiFetch<{ profile: unknown }>(`/api/profiles/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify(serverData),
      })
      const mapped = mapProfileFromServer(res.profile)
      const updated = getProfiles()
      const i = updated.findIndex(p => p.id === mapped.id)
      if (i >= 0) updated[i] = mapped
      save(KEYS.profiles, updated)
      return mapped
    } else {
      const res = await apiFetch<{ profile: unknown }>('/api/profiles', {
        method: 'POST',
        body: JSON.stringify(serverData),
      })
      const mapped = mapProfileFromServer(res.profile)
      // Replace UUID entry with server entry
      const updated = getProfiles().filter(p => p.id !== profile.id)
      updated.push(mapped)
      if (mapped.is_default) updated.forEach(p => { if (p.id !== mapped.id) p.is_default = false })
      save(KEYS.profiles, updated)
      return mapped
    }
  } catch (err) {
    console.error('[saveProfile API]', err)
    return profile
  }
}

export async function deleteProfile(id: string): Promise<void> {
  save(KEYS.profiles, getProfiles().filter(p => p.id !== id))
  if (!isAuth()) return
  try {
    await apiFetch(`/api/profiles/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.error('[deleteProfile API]', err)
  }
}

// ── Projects — sync reads from localStorage cache ──
export const getProjects = (): Project[] =>
  load<Project>(KEYS.projects).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

export const getProject = (id: string): Project | undefined =>
  getProjects().find(p => p.id === id)

// ── Projects — async API + cache ──
export async function fetchProjects(): Promise<Project[]> {
  if (!isAuth()) return getProjects()
  try {
    const res = await apiFetch<{ projects: unknown[] }>('/api/projects')
    const mapped = (res.projects || []).map(mapProjectFromServer)
    save(KEYS.projects, mapped)
    return mapped
  } catch (err) {
    console.error('[fetchProjects]', err)
    return getProjects()
  }
}

export async function createProject(inputs: ProjectInputs, type: ProjectType = 'carousel'): Promise<Project> {
  const { expertPhotoBase64: _photo, ...inputsToSave } = inputs
  const project: Project = {
    id: crypto.randomUUID(),
    name: inputs.projectName || `Projeto ${Date.now()}`,
    type,
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

  if (!isAuth()) return project

  try {
    const res = await apiFetch<{ project: unknown }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: project.name,
        type: project.type,
        theme: project.theme,
        product: project.product,
        platform: project.platform,
        inputs_json: inputsToSave,
      }),
    })
    const mapped = mapProjectFromServer(res.project)
    const updated = getProjects().filter(p => p.id !== project.id)
    updated.unshift(mapped)
    save(KEYS.projects, updated)
    return mapped
  } catch (err) {
    console.error('[createProject API]', err)
    return project
  }
}

export async function createSimpleProject(name: string, theme: string, type: ProjectType): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    type,
    theme,
    status: 'active',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const projects = getProjects()
  projects.unshift(project)
  save(KEYS.projects, projects)

  if (!isAuth()) return project

  try {
    const res = await apiFetch<{ project: unknown }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, type, theme }),
    })
    const mapped = mapProjectFromServer(res.project)
    const updated = getProjects().filter(p => p.id !== project.id)
    updated.unshift(mapped)
    save(KEYS.projects, updated)
    return mapped
  } catch (err) {
    console.error('[createSimpleProject API]', err)
    return project
  }
}

export async function updateProjectCarousel(id: string, data: CarouselData): Promise<void> {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    const dataToSave: CarouselData = {
      ...data,
      slides: data.slides.map(s => ({ ...s, imageUrl: undefined, isGeneratingImage: false })),
    }
    projects[idx].current_carousel_data = dataToSave
    projects[idx].updated_at = new Date().toISOString()
    save(KEYS.projects, projects)
  }

  if (!isAuth()) return
  try {
    await apiFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        carousel_data: {
          ...data,
          slides: data.slides.map(s => ({ ...s, imageUrl: undefined, isGeneratingImage: false })),
        },
      }),
    })
  } catch (err) {
    console.error('[updateProjectCarousel API]', err)
  }
}

export async function toggleFavorite(id: string): Promise<void> {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    projects[idx].is_favorite = !projects[idx].is_favorite
    save(KEYS.projects, projects)
  }

  if (!isAuth()) return
  try {
    await apiFetch(`/api/projects/${id}/favorite`, { method: 'POST' })
  } catch (err) {
    console.error('[toggleFavorite API]', err)
  }
}

export async function archiveProject(id: string): Promise<void> {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    projects[idx].status = 'archived'
    save(KEYS.projects, projects)
  }

  if (!isAuth()) return
  try {
    await apiFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'archived' }),
    })
  } catch (err) {
    console.error('[archiveProject API]', err)
  }
}

export async function deleteProject(id: string): Promise<void> {
  save(KEYS.projects, getProjects().filter(p => p.id !== id))

  if (!isAuth()) return
  try {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.error('[deleteProject API]', err)
  }
}

export async function updateProjectPost(id: string, data: PostData): Promise<void> {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    const dataToSave: PostData = { ...data, imageUrl: undefined }
    projects[idx].current_post_data = dataToSave
    projects[idx].updated_at = new Date().toISOString()
    save(KEYS.projects, projects)
  }

  if (!isAuth()) return
  try {
    await apiFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ post_data: { ...data, imageUrl: undefined } }),
    })
  } catch (err) {
    console.error('[updateProjectPost API]', err)
  }
}

export async function updateProjectStories(id: string, data: StoriesData): Promise<void> {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx >= 0) {
    const dataToSave: StoriesData = {
      ...data,
      slides: data.slides.map(s => ({ ...s, imageUrl: undefined })),
    }
    projects[idx].current_stories_data = dataToSave
    projects[idx].updated_at = new Date().toISOString()
    save(KEYS.projects, projects)
  }

  if (!isAuth()) return
  try {
    await apiFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        stories_data: {
          ...data,
          slides: data.slides.map(s => ({ ...s, imageUrl: undefined })),
        },
      }),
    })
  } catch (err) {
    console.error('[updateProjectStories API]', err)
  }
}
