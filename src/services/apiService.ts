const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3080'

const TOKEN_KEY = 'autoria_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new CustomEvent('auth:logout'))
    throw new ApiError('Sessao expirada', 401)
  }

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(data.error || 'Erro desconhecido', res.status, data)
  }

  return data as T
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// ── Auth ──
export interface AuthUser {
  id: number
  email: string
  name: string
  birth_date?: string
  niche?: string
  role: string
  plan: string
  plan_label: string
  posts_used_this_month: number
  posts_limit: number
  profiles_limit: number
  trial_active: boolean
  trial_days_left: number
  trial_ends_at?: string
  referral_code: string
  extra_posts: number
  created_at: string
}

interface AuthResponse {
  token: string
  user: AuthUser
}

export async function apiRegister(data: {
  email: string; name: string; password: string;
  birth_date?: string; niche?: string; referral_code?: string
}): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  setToken(res.token)
  return res
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(res.token)
  return res
}

export async function apiGetMe(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/api/auth/me')
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

// ── Profiles ──
export async function apiGetProfiles() {
  return apiFetch<{ profiles: unknown[] }>('/api/profiles')
}

export async function apiCreateProfile(profile: Record<string, unknown>) {
  return apiFetch<{ profile: unknown }>('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function apiUpdateProfile(id: number | string, data: Record<string, unknown>) {
  return apiFetch<{ profile: unknown }>(`/api/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function apiDeleteProfile(id: number | string) {
  return apiFetch<{ message: string }>(`/api/profiles/${id}`, { method: 'DELETE' })
}

// ── Projects ──
export async function apiGetProjects(params?: { status?: string; type?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.type) query.set('type', params.type)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return apiFetch<{ projects: unknown[] }>(`/api/projects${qs ? `?${qs}` : ''}`)
}

export async function apiCreateProject(project: Record<string, unknown>) {
  return apiFetch<{ project: unknown }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  })
}

export async function apiUpdateProject(id: number | string, data: Record<string, unknown>) {
  return apiFetch<{ project: unknown }>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function apiDeleteProject(id: number | string) {
  return apiFetch<{ message: string }>(`/api/projects/${id}`, { method: 'DELETE' })
}

export async function apiToggleFavorite(id: number | string) {
  return apiFetch<{ is_favorite: boolean }>(`/api/projects/${id}/favorite`, { method: 'POST' })
}

// ── Usage ──
export interface UsageData {
  plan: string
  plan_label: string
  posts_used: number
  posts_limit: number
  extra_posts: number
  trial_ends_at?: string
  trial_active: boolean
  trial_days_left: number
  breakdown: { action: string; count: number; total: number }[]
  streak: number
  total_posts_ever: number
}

export async function apiGetUsage(): Promise<UsageData> {
  return apiFetch<UsageData>('/api/usage')
}

// ── Subscription ──
export async function apiGetSubscription() {
  return apiFetch('/api/usage/subscription')
}

// ── Payments ──
export async function apiCheckout(plan: string) {
  return apiFetch<{ subscription_id: string; payment_link?: string; invoice_url?: string }>('/api/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  })
}

export async function apiGetPlans() {
  return apiFetch<{ plans: { id: string; name: string; value: number; posts: string | number; profiles: number; features: string[] }[] }>('/api/plans')
}

// ── Referral ──
export async function apiGetReferralStats() {
  return apiFetch('/api/referral/stats')
}

export async function apiGetReferralLink() {
  return apiFetch<{ referral_code: string; referral_link: string; share_text: string }>('/api/referral/invite', { method: 'POST' })
}

// ── Gemini Proxy ──
export async function apiGeminiGenerate(payload: {
  model?: string;
  contents: unknown[];
  generationConfig?: Record<string, unknown>;
}) {
  return apiFetch<{ parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }>('/api/gemini/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
