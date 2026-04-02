import { Router } from 'express'
import { all, get, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getPlanConfig } from '../middleware/planLimits.js'

const router = Router()

router.use(authMiddleware)

// GET /api/usage — current month usage
router.get('/', (req, res) => {
  try {
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    const config = getPlanConfig(user.plan)
    const totalLimit = config.postsLimit + (user.extra_posts || 0)

    // Get usage breakdown by type
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const breakdown = all(
      `SELECT action, COUNT(*) as count, SUM(credits_used) as total
       FROM usage_log WHERE user_id = ? AND created_at >= ?
       GROUP BY action`,
      [req.user.id, monthStart.toISOString()]
    )

    // Streak calculation
    const recentDays = all(
      `SELECT DISTINCT date(created_at) as day FROM usage_log
       WHERE user_id = ? ORDER BY day DESC LIMIT 30`,
      [req.user.id]
    )

    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    for (let i = 0; i < recentDays.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      const expectedDay = expected.toISOString().split('T')[0]
      if (recentDays[i]?.day === expectedDay) {
        streak++
      } else {
        break
      }
    }

    // Total posts ever
    const totalPosts = get('SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?', [req.user.id])

    res.json({
      plan: user.plan,
      plan_label: config.label,
      posts_used: user.posts_used_this_month,
      posts_limit: totalLimit,
      extra_posts: user.extra_posts || 0,
      trial_ends_at: user.trial_ends_at,
      trial_active: user.plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) > new Date(),
      trial_days_left: user.plan === 'trial' && user.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000))
        : 0,
      breakdown,
      streak,
      total_posts_ever: totalPosts?.cnt || 0,
    })
  } catch (err) {
    console.error('[Usage]', err)
    res.status(500).json({ error: 'Erro ao buscar uso' })
  }
})

// GET /api/subscription — subscription status
router.get('/subscription', (req, res) => {
  try {
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    const config = getPlanConfig(user.plan)

    res.json({
      plan: user.plan,
      plan_label: config.label,
      subscription_id: user.subscription_id,
      trial_ends_at: user.trial_ends_at,
      trial_active: user.plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) > new Date(),
      trial_days_left: user.plan === 'trial' && user.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000))
        : 0,
      posts_used: user.posts_used_this_month,
      posts_limit: config.postsLimit + (user.extra_posts || 0),
      profiles_limit: config.profilesLimit,
    })
  } catch (err) {
    console.error('[Subscription]', err)
    res.status(500).json({ error: 'Erro ao buscar assinatura' })
  }
})

// Monthly reset cron (call from external cron or PM2 cron)
export function resetMonthlyUsage() {
  try {
    run('UPDATE users SET posts_used_this_month = 0, updated_at = datetime("now")')
    console.log('[Cron] Monthly usage reset completed')
  } catch (err) {
    console.error('[Cron] Error resetting usage:', err)
  }
}

export default router
