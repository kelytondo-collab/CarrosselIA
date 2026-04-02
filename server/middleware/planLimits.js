import { get } from '../db.js'

const PLAN_CONFIG = {
  trial: { postsLimit: 999, profilesLimit: 1, label: 'Trial' },
  essencial: { postsLimit: 20, profilesLimit: 1, label: 'Essencial' },
  profissional: { postsLimit: 999, profilesLimit: 1, label: 'Profissional' },
  agencia: { postsLimit: 999, profilesLimit: 3, label: 'Agencia' },
  admin: { postsLimit: 999, profilesLimit: 10, label: 'Admin' },
}

export function getPlanConfig(plan) {
  return PLAN_CONFIG[plan] || PLAN_CONFIG.trial
}

export function checkPostLimit(req, res, next) {
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
  if (!user) return res.status(401).json({ error: 'Usuario nao encontrado' })

  // Check trial expiration
  if (user.plan === 'trial' && user.trial_ends_at) {
    const trialEnd = new Date(user.trial_ends_at)
    if (trialEnd < new Date()) {
      return res.status(403).json({
        error: 'trial_expired',
        message: 'Seu trial expirou. Assine para continuar criando.',
      })
    }
  }

  // Check subscription for paid plans
  if (['essencial', 'profissional', 'agencia'].includes(user.plan)) {
    // Paid plan — check if subscription is active (done via webhook)
  }

  // Check post limit
  const config = getPlanConfig(user.plan)
  const totalLimit = config.postsLimit + (user.extra_posts || 0)
  if (user.posts_used_this_month >= totalLimit && totalLimit < 999) {
    return res.status(403).json({
      error: 'limit_reached',
      message: `Voce atingiu o limite de ${totalLimit} posts este mes. Faca upgrade para continuar.`,
      used: user.posts_used_this_month,
      limit: totalLimit,
    })
  }

  req.planConfig = config
  next()
}

export function checkProfileLimit(req, res, next) {
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
  if (!user) return res.status(401).json({ error: 'Usuario nao encontrado' })

  const config = getPlanConfig(user.plan)
  const profileCount = get('SELECT COUNT(*) as cnt FROM profiles WHERE user_id = ?', [req.user.id])

  if (profileCount.cnt >= config.profilesLimit) {
    return res.status(403).json({
      error: 'profile_limit',
      message: `Seu plano permite ate ${config.profilesLimit} perfil(is). Faca upgrade para adicionar mais.`,
      current: profileCount.cnt,
      limit: config.profilesLimit,
    })
  }

  next()
}
