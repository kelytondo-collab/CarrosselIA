import { Router } from 'express'
import { authMiddleware } from './auth.js'
import db from '../db.js'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

// GET /api/projects
router.get('/', (req: any, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId)
  const projects = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    theme: r.theme,
    product: r.product,
    platform: r.platform,
    inputs_json: JSON.parse(r.inputs_json || '{}'),
    current_carousel_data: r.carousel_data ? JSON.parse(r.carousel_data) : undefined,
    current_post_data: r.post_data ? JSON.parse(r.post_data) : undefined,
    current_stories_data: r.stories_data ? JSON.parse(r.stories_data) : undefined,
    status: r.status,
    is_favorite: !!r.is_favorite,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
  res.json(projects)
})

// POST /api/projects (create or update)
router.post('/', (req: any, res) => {
  const p = req.body
  const id = p.id || crypto.randomUUID()
  const now = new Date().toISOString()

  const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, req.userId)

  if (existing) {
    db.prepare(`UPDATE projects SET
      name = ?, type = ?, theme = ?, product = ?, platform = ?,
      inputs_json = ?, carousel_data = ?, post_data = ?, stories_data = ?,
      status = ?, is_favorite = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`).run(
      p.name || '', p.type || 'carousel', p.theme || '', p.product || '',
      p.platform || 'instagram', JSON.stringify(p.inputs_json || {}),
      p.current_carousel_data ? JSON.stringify(p.current_carousel_data) : null,
      p.current_post_data ? JSON.stringify(p.current_post_data) : null,
      p.current_stories_data ? JSON.stringify(p.current_stories_data) : null,
      p.status || 'active', p.is_favorite ? 1 : 0, now,
      id, req.userId
    )
  } else {
    db.prepare(`INSERT INTO projects (
      id, user_id, name, type, theme, product, platform,
      inputs_json, carousel_data, post_data, stories_data,
      status, is_favorite, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, req.userId, p.name || '', p.type || 'carousel', p.theme || '',
      p.product || '', p.platform || 'instagram', JSON.stringify(p.inputs_json || {}),
      p.current_carousel_data ? JSON.stringify(p.current_carousel_data) : null,
      p.current_post_data ? JSON.stringify(p.current_post_data) : null,
      p.current_stories_data ? JSON.stringify(p.current_stories_data) : null,
      p.status || 'active', p.is_favorite ? 1 : 0, now, now
    )
  }

  res.json({ id, saved: true })
})

// DELETE /api/projects/:id
router.delete('/:id', (req: any, res) => {
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ deleted: true })
})

export default router
