import { Router } from 'express'
import { authMiddleware } from './auth.js'
import db from '../db.js'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import multer from 'multer'
import sharp from 'sharp'
import { createContainer, createCarouselContainer, publishContainer, waitForContainer, getInstagramAccount } from '../utils/instagram-api.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://carrossel.kellytondo.com.br'
const META_APP_ID = process.env.META_APP_ID || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const META_CALLBACK_URL = process.env.META_CALLBACK_URL || ''
const GRAPH_API = 'https://graph.facebook.com/v21.0'

const router = Router()

// ── OAuth Routes (no auth middleware) ──

// GET /auth/instagram — redirect to Facebook OAuth
router.get('/instagram', (req, res) => {
  const scopes = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement'
  const state = crypto.randomBytes(16).toString('hex')
  const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_CALLBACK_URL)}&scope=${scopes}&state=${state}&response_type=code`
  res.redirect(url)
})

// GET /auth/instagram/callback — handle OAuth callback
router.get('/instagram/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('Codigo nao recebido')

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(`${GRAPH_API}/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_CALLBACK_URL)}&client_secret=${META_APP_SECRET}&code=${code}`)
    const tokenData = await tokenRes.json() as any
    if (!tokenData.access_token) throw new Error('Token nao recebido: ' + JSON.stringify(tokenData))

    // 2. Exchange for long-lived token (60 days)
    const longRes = await fetch(`${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`)
    const longData = await longRes.json() as any
    const accessToken = longData.access_token || tokenData.access_token
    const expiresIn = longData.expires_in || 5184000 // 60 days default

    // 3. Get Instagram Business Account
    const igAccount = await getInstagramAccount(accessToken)
    if (!igAccount) {
      return res.redirect(`${FRONTEND_URL}/#ig_error=no_business_account`)
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 4. Redirect back to frontend with data in hash
    const params = new URLSearchParams({
      ig_callback: '1',
      ig_token: accessToken,
      ig_account_id: igAccount.id,
      ig_username: igAccount.username,
      ig_expires_at: expiresAt,
    })
    res.redirect(`${FRONTEND_URL}/#${params.toString()}`)
  } catch (err: any) {
    console.error('[Instagram OAuth Error]', err.message)
    res.redirect(`${FRONTEND_URL}/#ig_error=${encodeURIComponent(err.message)}`)
  }
})

// ── Protected Routes ──

// POST /api/instagram/save-token — save token from frontend after OAuth
router.post('/instagram/save-token', authMiddleware, (req: any, res) => {
  const { accessToken, igAccountId, username, expiresAt } = req.body
  if (!accessToken || !igAccountId || !username) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }

  const id = crypto.randomUUID()
  const existing = db.prepare('SELECT id FROM instagram_connections WHERE user_id = ?').get(req.userId) as any

  if (existing) {
    db.prepare('UPDATE instagram_connections SET access_token = ?, ig_account_id = ?, username = ?, expires_at = ?, connected_at = datetime("now") WHERE user_id = ?')
      .run(accessToken, igAccountId, username, expiresAt, req.userId)
  } else {
    db.prepare('INSERT INTO instagram_connections (id, user_id, access_token, ig_account_id, username, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.userId, accessToken, igAccountId, username, expiresAt)
  }

  res.json({ saved: true })
})

// DELETE /api/instagram/disconnect
router.delete('/instagram/disconnect', authMiddleware, (req: any, res) => {
  db.prepare('DELETE FROM instagram_connections WHERE user_id = ?').run(req.userId)
  res.json({ disconnected: true })
})

// GET /api/instagram/status
router.get('/instagram/status', authMiddleware, (req: any, res) => {
  const ig = db.prepare('SELECT username, expires_at FROM instagram_connections WHERE user_id = ?').get(req.userId) as any
  if (!ig) return res.json({ connected: false })
  res.json({ connected: true, username: ig.username, expiresAt: ig.expires_at })
})

// POST /api/upload-images — receive PNGs, convert to JPEG, return public URLs
router.post('/upload-images', authMiddleware, upload.array('images', 10), async (req: any, res) => {
  const files = req.files as Express.Multer.File[]
  if (!files?.length) return res.status(400).json({ error: 'Nenhuma imagem recebida' })

  const baseUrl = `${req.protocol}://${req.get('host')}`
  const urls: string[] = []

  for (const file of files) {
    const filename = `${crypto.randomUUID()}.jpg`
    const filepath = join(UPLOADS_DIR, filename)

    await sharp(file.buffer)
      .jpeg({ quality: 90 })
      .toFile(filepath)

    urls.push(`${baseUrl}/uploads/${filename}`)
  }

  res.json({ urls })
})

// POST /api/publish/single — publish single image post
router.post('/publish/single', authMiddleware, async (req: any, res) => {
  const { imageUrl, caption } = req.body
  const ig = db.prepare('SELECT access_token, ig_account_id FROM instagram_connections WHERE user_id = ?').get(req.userId) as any
  if (!ig) return res.status(400).json({ error: 'Instagram nao conectado' })

  try {
    const containerId = await createContainer(ig.ig_account_id, ig.access_token, imageUrl, caption)
    await waitForContainer(containerId, ig.access_token)
    const result = await publishContainer(ig.ig_account_id, ig.access_token, containerId)
    res.json(result)
  } catch (err: any) {
    console.error('[Instagram Publish Error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/publish/carousel — publish carousel (2-10 images)
router.post('/publish/carousel', authMiddleware, async (req: any, res) => {
  const { imageUrls, caption } = req.body
  if (!imageUrls?.length || imageUrls.length < 2) {
    return res.status(400).json({ error: 'Carrossel precisa de no minimo 2 imagens' })
  }

  const ig = db.prepare('SELECT access_token, ig_account_id FROM instagram_connections WHERE user_id = ?').get(req.userId) as any
  if (!ig) return res.status(400).json({ error: 'Instagram nao conectado' })

  try {
    // 1. Create individual containers
    const childIds: string[] = []
    for (const url of imageUrls) {
      const id = await createContainer(ig.ig_account_id, ig.access_token, url, undefined, true)
      await waitForContainer(id, ig.access_token)
      childIds.push(id)
    }

    // 2. Create carousel container
    const carouselId = await createCarouselContainer(ig.ig_account_id, ig.access_token, childIds, caption)
    await waitForContainer(carouselId, ig.access_token)

    // 3. Publish
    const result = await publishContainer(ig.ig_account_id, ig.access_token, carouselId)
    res.json(result)
  } catch (err: any) {
    console.error('[Instagram Carousel Publish Error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/publish/stories — publish multiple images as individual stories
router.post('/publish/stories', authMiddleware, async (req: any, res) => {
  const { imageUrls } = req.body
  if (!imageUrls?.length) {
    return res.status(400).json({ error: 'Nenhuma imagem para publicar' })
  }

  const ig = db.prepare('SELECT access_token, ig_account_id FROM instagram_connections WHERE user_id = ?').get(req.userId) as any
  if (!ig) return res.status(400).json({ error: 'Instagram nao conectado' })

  try {
    const results: { id: string; index: number }[] = []
    for (let i = 0; i < imageUrls.length; i++) {
      const containerId = await createContainer(ig.ig_account_id, ig.access_token, imageUrls[i], undefined, false, 'STORIES')
      await waitForContainer(containerId, ig.access_token)
      const result = await publishContainer(ig.ig_account_id, ig.access_token, containerId)
      results.push({ id: result.id, index: i })
    }
    res.json({ published: results.length, results })
  } catch (err: any) {
    console.error('[Instagram Stories Publish Error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
