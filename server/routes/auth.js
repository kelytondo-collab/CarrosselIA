import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { get, run, all } from '../db.js'
import { generateToken, authMiddleware } from '../middleware/auth.js'
import { getPlanConfig } from '../middleware/planLimits.js'

const router = Router()

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

function safeUser(user) {
  if (!user) return null
  const { password, ...safe } = user
  const config = getPlanConfig(user.plan)
  return {
    ...safe,
    plan_label: config.label,
    posts_limit: config.postsLimit + (user.extra_posts || 0),
    profiles_limit: config.profilesLimit,
    trial_active: user.plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) > new Date(),
    trial_days_left: user.plan === 'trial' && user.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000))
      : 0,
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, birth_date, niche, referral_code } = req.body
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Preencha nome, email e senha' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
    }

    const emailLower = email.toLowerCase().trim()
    const existing = get('SELECT id FROM users WHERE email = ?', [emailLower])
    if (existing) {
      return res.status(400).json({ error: 'Este email ja esta cadastrado' })
    }

    const hash = bcrypt.hashSync(password, 10)
    const myReferralCode = generateReferralCode()

    // Trial: 7 days from now (Profissional features)
    const trialEnds = new Date()
    trialEnds.setDate(trialEnds.getDate() + 7)

    // Check if referred by someone
    let referredBy = null
    if (referral_code) {
      const referrer = get('SELECT id FROM users WHERE referral_code = ?', [referral_code])
      if (referrer) {
        referredBy = referral_code
        // Give referred user +3 extra trial days (10 total)
        trialEnds.setDate(trialEnds.getDate() + 3)
      }
    }

    run(
      `INSERT INTO users (email, name, password, birth_date, niche, plan, trial_ends_at, referral_code, referred_by, posts_limit, profiles_limit)
       VALUES (?, ?, ?, ?, ?, 'trial', ?, ?, ?, 999, 1)`,
      [emailLower, name.trim(), hash, birth_date || null, niche || null,
       trialEnds.toISOString(), myReferralCode, referredBy]
    )

    // Get the newly created user by email (more reliable than lastId)
    const newUser = get('SELECT * FROM users WHERE email = ?', [emailLower])
    if (!newUser) return res.status(500).json({ error: 'Erro ao criar usuario' })

    // If referred, create referral record and reward referrer
    if (referredBy) {
      const referrer = get('SELECT id FROM users WHERE referral_code = ?', [referral_code])
      if (referrer) {
        run(
          'INSERT INTO referrals (referrer_id, referred_email, referred_user_id, status) VALUES (?, ?, ?, ?)',
          [referrer.id, emailLower, newUser.id, 'registered']
        )
        // Give referrer +5 extra posts
        run('UPDATE users SET extra_posts = extra_posts + 5 WHERE id = ?', [referrer.id])
        // Check if referrer has 5 successful referrals — give 1 month free
        const refCount = get('SELECT COUNT(*) as cnt FROM referrals WHERE referrer_id = ? AND status = ?', [referrer.id, 'registered'])
        if (refCount.cnt > 0 && refCount.cnt % 5 === 0) {
          // Extend trial or subscription by 30 days
          const referrerUser = get('SELECT * FROM users WHERE id = ?', [referrer.id])
          if (referrerUser) {
            const baseDate = referrerUser.trial_ends_at ? new Date(referrerUser.trial_ends_at) : new Date()
            const newEnd = new Date(Math.max(baseDate.getTime(), Date.now()))
            newEnd.setDate(newEnd.getDate() + 30)
            run('UPDATE users SET trial_ends_at = ? WHERE id = ?', [newEnd.toISOString(), referrer.id])
          }
        }
      }
    }

    const token = generateToken(newUser)
    res.json({ token, user: safeUser(newUser) })
  } catch (err) {
    console.error('[Auth Register]', err)
    res.status(500).json({ error: 'Erro interno ao registrar' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Preencha email e senha' })
    }

    const user = get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    const token = generateToken(user)
    res.json({ token, user: safeUser(user) })
  } catch (err) {
    console.error('[Auth Login]', err)
    res.status(500).json({ error: 'Erro interno ao fazer login' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })
    res.json({ user: safeUser(user) })
  } catch (err) {
    console.error('[Auth Me]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Informe o email' })

    const user = get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'Se o email existir, enviaremos um link de recuperacao' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2)

    run(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt.toISOString()]
    )

    // TODO: Send email with reset link
    console.log(`[Password Reset] Token for ${email}: ${token}`)
    res.json({ message: 'Se o email existir, enviaremos um link de recuperacao' })
  } catch (err) {
    console.error('[Auth Forgot]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token e senha obrigatorios' })
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })

    const reset = get(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
      [token]
    )
    if (!reset) return res.status(400).json({ error: 'Token invalido ou expirado' })

    const hash = bcrypt.hashSync(password, 10)
    run('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [hash, reset.user_id])
    run('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id])

    res.json({ message: 'Senha alterada com sucesso' })
  } catch (err) {
    console.error('[Auth Reset]', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
