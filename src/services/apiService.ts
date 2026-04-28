const API_URL = import.meta.env.VITE_API_URL || 'https://carrossel-api.kellytondo.com'

function getToken(): string | null {
  return localStorage.getItem('carrossel_jwt')
}

function setToken(token: string) {
  localStorage.setItem('carrossel_jwt', token)
}

export function clearAuth() {
  localStorage.removeItem('carrossel_jwt')
  localStorage.removeItem('carrossel_user')
}

function headers(): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...headers(), ...(opts.headers as Record<string, string> || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data as T
}

// ── Auto-login (cada navegador tem seu proprio usuario isolado) ──

const SHARED_LEGACY_EMAIL = 'kelly@kellytondo.com'

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('carrossel_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('carrossel_device_id', id)
  }
  return id
}

export async function ensureLoggedIn(): Promise<void> {
  // Limpa sessao antiga compartilhada (bug pre-fix): todo mundo logava
  // como kelly@kellytondo.com e via os perfis dos outros.
  try {
    const stored = localStorage.getItem('carrossel_user')
    if (stored) {
      const u = JSON.parse(stored)
      if (u?.email === SHARED_LEGACY_EMAIL) {
        clearAuth()
        localStorage.removeItem('postativo_profiles')
        localStorage.removeItem('postativo_projects')
      }
    }
  } catch { /* ignore */ }

  if (getToken()) return

  const deviceId = getOrCreateDeviceId()
  const email = `device-${deviceId}@carrossel.local`
  const password = deviceId

  try {
    await login(email, password)
  } catch {
    try {
      await register(email, 'Usuario', password)
    } catch { /* already exists or server offline */ }
  }
}

// ── Auth ──

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface MeResponse {
  user: AuthUser
  instagram: { username: string; expiresAt: string } | null
}

export async function register(email: string, name: string, password: string): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  })
  setToken(data.token)
  localStorage.setItem('carrossel_user', JSON.stringify(data.user))
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  localStorage.setItem('carrossel_user', JSON.stringify(data.user))
  return data
}

export async function getMe(): Promise<MeResponse> {
  return api<MeResponse>('/auth/me')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('carrossel_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Profiles ──

export async function fetchProfiles(): Promise<any[]> {
  return api<any[]>('/api/profiles')
}

export async function syncProfile(profile: any): Promise<{ id: string; saved: boolean }> {
  return api<{ id: string; saved: boolean }>('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function removeProfile(id: string): Promise<void> {
  await api(`/api/profiles/${id}`, { method: 'DELETE' })
}

// ── Projects ──

export async function fetchProjects(): Promise<any[]> {
  return api<any[]>('/api/projects')
}

export async function syncProject(project: any): Promise<{ id: string; saved: boolean }> {
  return api<{ id: string; saved: boolean }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  })
}

export async function removeProject(id: string): Promise<void> {
  await api(`/api/projects/${id}`, { method: 'DELETE' })
}

// ── Instagram ──

export async function getInstagramStatus(): Promise<{ connected: boolean; username?: string; expiresAt?: string }> {
  return api('/api/instagram/status')
}

export async function saveInstagramToken(data: {
  accessToken: string
  igAccountId: string
  username: string
  expiresAt: string
}): Promise<void> {
  await api('/api/instagram/save-token', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function disconnectInstagram(): Promise<void> {
  await api('/api/instagram/disconnect', { method: 'DELETE' })
}

export async function uploadImages(files: File[]): Promise<{ urls: string[] }> {
  const token = getToken()
  const formData = new FormData()
  files.forEach(f => formData.append('images', f))

  const res = await fetch(`${API_URL}/api/upload-images`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar imagens')
  return data
}

export async function publishSingle(imageUrl: string, caption: string): Promise<{ id: string; permalink?: string }> {
  return api('/api/publish/single', {
    method: 'POST',
    body: JSON.stringify({ imageUrl, caption }),
  })
}

export async function publishCarousel(imageUrls: string[], caption: string): Promise<{ id: string; permalink?: string }> {
  return api('/api/publish/carousel', {
    method: 'POST',
    body: JSON.stringify({ imageUrls, caption }),
  })
}

export async function publishStories(imageUrls: string[]): Promise<{ published: number; results: { id: string; index: number }[] }> {
  return api('/api/publish/stories', {
    method: 'POST',
    body: JSON.stringify({ imageUrls }),
  })
}

export function getInstagramAuthUrl(): string {
  return `${API_URL}/auth/instagram`
}
