import { Router } from 'express'
import { all, get } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/referral/stats
router.get('/stats', (req, res) => {
  try {
    const user = get('SELECT referral_code, extra_posts FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    const referrals = all(
      `SELECT r.*, u.name as referred_name, u.created_at as referred_at
       FROM referrals r
       LEFT JOIN users u ON u.id = r.referred_user_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    )

    const totalReferred = referrals.filter(r => r.status === 'registered').length
    const extraPosts = user.extra_posts || 0
    const freeMonthsEarned = Math.floor(totalReferred / 5)

    res.json({
      referral_code: user.referral_code,
      referral_link: `https://carrossel.kellytondo.com.br/r/${user.referral_code}`,
      total_referred: totalReferred,
      extra_posts_earned: extraPosts,
      free_months_earned: freeMonthsEarned,
      referrals: referrals.map(r => ({
        email: r.referred_email,
        name: r.referred_name,
        status: r.status,
        date: r.referred_at || r.created_at,
      })),
    })
  } catch (err) {
    console.error('[Referral Stats]', err)
    res.status(500).json({ error: 'Erro ao buscar indicacoes' })
  }
})

// POST /api/referral/invite — generate/share referral link
router.post('/invite', (req, res) => {
  try {
    const user = get('SELECT referral_code FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    res.json({
      referral_code: user.referral_code,
      referral_link: `https://carrossel.kellytondo.com.br/r/${user.referral_code}`,
      share_text: `Crie conteudo com sua essencia usando AUTOR.IA! Use meu link e ganhe 3 dias extras no trial: https://carrossel.kellytondo.com.br/r/${user.referral_code}`,
    })
  } catch (err) {
    console.error('[Referral Invite]', err)
    res.status(500).json({ error: 'Erro ao gerar link' })
  }
})

export default router
