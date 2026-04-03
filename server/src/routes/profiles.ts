import { Router } from 'express'
import { authMiddleware } from './auth.js'
import db from '../db.js'
import crypto from 'crypto'

const router = Router()
router.use(authMiddleware)

// GET /api/profiles
router.get('/', (req: any, res) => {
  const rows = db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY is_default DESC, created_at ASC').all(req.userId)
  const profiles = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    niche: r.niche,
    tone: r.tone,
    bio: r.bio,
    color_palette: JSON.parse(r.color_palette || '{}'),
    brandKit: JSON.parse(r.brand_kit || '{}'),
    photo_base64: r.photo_base64,
    voiceBlueprint: r.voice_blueprint,
    instagramHandle: r.instagram_handle,
    stylePackId: r.style_pack,
    preferred_font: r.preferred_font,
    targetAudience: r.target_audience,
    default_platform: r.default_platform,
    default_slide_count: r.default_slide_count,
    is_default: !!r.is_default,
    created_at: r.created_at,
  }))
  res.json(profiles)
})

// POST /api/profiles (create or update)
router.post('/', (req: any, res) => {
  const p = req.body
  const id = p.id || crypto.randomUUID()

  // If setting as default, unset others
  if (p.is_default) {
    db.prepare('UPDATE profiles SET is_default = 0 WHERE user_id = ?').run(req.userId)
  }

  const existing = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(id, req.userId)

  if (existing) {
    db.prepare(`UPDATE profiles SET
      name = ?, niche = ?, tone = ?, bio = ?, color_palette = ?,
      brand_kit = ?, photo_base64 = ?, voice_blueprint = ?,
      instagram_handle = ?, style_pack = ?, preferred_font = ?,
      target_audience = ?, default_platform = ?, default_slide_count = ?,
      is_default = ?
      WHERE id = ? AND user_id = ?`).run(
      p.name || '', p.niche || '', p.tone || 'descontraído', p.bio || '',
      JSON.stringify(p.color_palette || {}), JSON.stringify(p.brandKit || {}),
      p.photo_base64 || '', p.voiceBlueprint || '',
      p.instagramHandle || '', p.stylePackId || 'livre', p.preferred_font || '',
      p.targetAudience || '', p.default_platform || 'instagram',
      p.default_slide_count || 8, p.is_default ? 1 : 0,
      id, req.userId
    )
  } else {
    db.prepare(`INSERT INTO profiles (
      id, user_id, name, niche, tone, bio, color_palette,
      brand_kit, photo_base64, voice_blueprint,
      instagram_handle, style_pack, preferred_font,
      target_audience, default_platform, default_slide_count, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, req.userId, p.name || '', p.niche || '', p.tone || 'descontraído', p.bio || '',
      JSON.stringify(p.color_palette || {}), JSON.stringify(p.brandKit || {}),
      p.photo_base64 || '', p.voiceBlueprint || '',
      p.instagramHandle || '', p.stylePackId || 'livre', p.preferred_font || '',
      p.targetAudience || '', p.default_platform || 'instagram',
      p.default_slide_count || 8, p.is_default ? 1 : 0
    )
  }

  res.json({ id, saved: true })
})

// DELETE /api/profiles/:id
router.delete('/:id', (req: any, res) => {
  db.prepare('DELETE FROM profiles WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ deleted: true })
})

export default router
