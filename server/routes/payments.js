import { Router } from 'express'
import { get, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const ASAAS_URL = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3'
const ASAAS_KEY = process.env.ASAAS_API_KEY

const PLANS = {
  essencial: { name: 'AUTOR.IA Essencial', value: 79.00, postsLimit: 20, profilesLimit: 1 },
  profissional: { name: 'AUTOR.IA Profissional', value: 197.00, postsLimit: 999, profilesLimit: 1 },
  agencia: { name: 'AUTOR.IA Agencia', value: 397.00, postsLimit: 999, profilesLimit: 3 },
}

async function asaasFetch(path, options = {}) {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_KEY,
      ...options.headers,
    },
  })
  return res.json()
}

// Find or create Asaas customer
async function findOrCreateCustomer(user) {
  // Search by email
  const search = await asaasFetch(`/customers?email=${encodeURIComponent(user.email)}`)
  if (search.data && search.data.length > 0) return search.data[0]

  // Create new
  const customer = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      notificationDisabled: false,
    }),
  })
  return customer
}

// POST /api/payments/checkout
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    if (!ASAAS_KEY) return res.status(500).json({ error: 'Pagamentos nao configurados' })

    const { plan } = req.body
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plano invalido' })

    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    const planConfig = PLANS[plan]

    // Find/create Asaas customer
    const customer = await findOrCreateCustomer(user)
    if (!customer?.id) return res.status(500).json({ error: 'Erro ao criar cliente no Asaas' })

    // Create subscription
    const subscription = await asaasFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'CREDIT_CARD',
        value: planConfig.value,
        nextDueDate: new Date().toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: planConfig.name,
        externalReference: `user_${user.id}_${plan}`,
      }),
    })

    if (subscription.errors) {
      console.error('[Asaas] Subscription error:', subscription.errors)
      return res.status(400).json({ error: 'Erro ao criar assinatura', details: subscription.errors })
    }

    // Save subscription ID
    run('UPDATE users SET subscription_id = ?, updated_at = datetime("now") WHERE id = ?',
      [subscription.id, user.id])

    res.json({
      subscription_id: subscription.id,
      payment_link: subscription.paymentLink || null,
      invoice_url: subscription.invoiceUrl || null,
      plan: planConfig.name,
      value: planConfig.value,
    })
  } catch (err) {
    console.error('[Payments Checkout]', err)
    res.status(500).json({ error: 'Erro ao processar pagamento' })
  }
})

// POST /api/payments/webhook — Asaas webhook
router.post('/webhook', async (req, res) => {
  try {
    const { event, payment, subscription } = req.body

    console.log(`[Asaas Webhook] ${event}`, { payment: payment?.id, subscription: subscription?.id })

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const extRef = payment?.externalReference || subscription?.externalReference
      if (!extRef) return res.json({ received: true })

      // Extract user_id and plan from external reference (format: user_ID_plan)
      const match = extRef.match(/^user_(\d+)_(\w+)$/)
      if (!match) return res.json({ received: true })

      const [, userId, plan] = match
      const planConfig = PLANS[plan]
      if (!planConfig) return res.json({ received: true })

      run(
        `UPDATE users SET plan = ?, posts_limit = ?, profiles_limit = ?,
         subscription_id = ?, updated_at = datetime("now") WHERE id = ?`,
        [plan, planConfig.postsLimit, planConfig.profilesLimit,
         subscription?.id || payment?.subscription || null, userId]
      )
      console.log(`[Asaas] User ${userId} upgraded to ${plan}`)
    }

    if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_DELETED') {
      const extRef = payment?.externalReference || subscription?.externalReference
      if (!extRef) return res.json({ received: true })

      const match = extRef.match(/^user_(\d+)_(\w+)$/)
      if (!match) return res.json({ received: true })
      const [, userId] = match

      // Downgrade to expired trial
      run(
        `UPDATE users SET plan = 'trial', trial_ends_at = datetime("now"),
         subscription_id = NULL, updated_at = datetime("now") WHERE id = ?`,
        [userId]
      )
      console.log(`[Asaas] User ${userId} subscription ended`)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Asaas Webhook Error]', err)
    res.status(500).json({ error: 'Webhook error' })
  }
})

// GET /api/payments/plans — public endpoint
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([id, p]) => ({
      id,
      name: p.name,
      value: p.value,
      posts_limit: p.postsLimit === 999 ? 'Ilimitado' : p.postsLimit,
      profiles_limit: p.profilesLimit,
    })),
  })
})

export default router
