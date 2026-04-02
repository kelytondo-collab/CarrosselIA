import { Router } from 'express'
import { all, get, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkProfileLimit } from '../middleware/planLimits.js'

const router = Router()

// All routes require auth
router.use(authMiddleware)

// GET /api/profiles
router.get('/', (req, res) => {
  try {
    const profiles = all('SELECT * FROM profiles WHERE user_id = ? ORDER BY is_default DESC, created_at ASC', [req.user.id])
    // Parse JSON fields
    const parsed = profiles.map(p => ({
      ...p,
      color_palette: p.color_palette ? JSON.parse(p.color_palette) : null,
      brand_kit: p.brand_kit ? JSON.parse(p.brand_kit) : null,
      numerology_data: p.numerology_data ? JSON.parse(p.numerology_data) : null,
      is_default: !!p.is_default,
    }))
    res.json({ profiles: parsed })
  } catch (err) {
    console.error('[Profiles List]', err)
    res.status(500).json({ error: 'Erro ao listar perfis' })
  }
})

// GET /api/profiles/:id
router.get('/:id', (req, res) => {
  try {
    const profile = get('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!profile) return res.status(404).json({ error: 'Perfil nao encontrado' })
    profile.color_palette = profile.color_palette ? JSON.parse(profile.color_palette) : null
    profile.brand_kit = profile.brand_kit ? JSON.parse(profile.brand_kit) : null
    profile.numerology_data = profile.numerology_data ? JSON.parse(profile.numerology_data) : null
    profile.is_default = !!profile.is_default
    res.json({ profile })
  } catch (err) {
    console.error('[Profile Get]', err)
    res.status(500).json({ error: 'Erro ao buscar perfil' })
  }
})

// POST /api/profiles
router.post('/', checkProfileLimit, (req, res) => {
  try {
    const { name, niche, target_audience, tone, bio, color_palette, brand_kit,
            voice_blueprint, numerology_data, instagram_handle, style_pack_id,
            default_platform, default_slide_count, preferred_font, photo_base64, is_default } = req.body

    if (!name) return res.status(400).json({ error: 'Nome e obrigatorio' })

    // If this is default, unset other defaults
    if (is_default) {
      run('UPDATE profiles SET is_default = 0 WHERE user_id = ?', [req.user.id])
    }

    // If this is the first profile, make it default
    const existingCount = get('SELECT COUNT(*) as cnt FROM profiles WHERE user_id = ?', [req.user.id])
    const makeDefault = is_default || existingCount.cnt === 0

    const { lastId } = run(
      `INSERT INTO profiles (user_id, name, niche, target_audience, tone, bio,
        color_palette, brand_kit, voice_blueprint, numerology_data,
        instagram_handle, style_pack_id, default_platform, default_slide_count,
        preferred_font, photo_base64, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, niche || null, target_audience || null, tone || 'profissional',
       bio || null, color_palette ? JSON.stringify(color_palette) : null,
       brand_kit ? JSON.stringify(brand_kit) : null, voice_blueprint || null,
       numerology_data ? JSON.stringify(numerology_data) : null,
       instagram_handle || null, style_pack_id || 'livre',
       default_platform || 'instagram', default_slide_count || 8,
       preferred_font || null, photo_base64 || null, makeDefault ? 1 : 0]
    )

    const profile = get('SELECT * FROM profiles WHERE id = ?', [lastId])
    profile.color_palette = profile.color_palette ? JSON.parse(profile.color_palette) : null
    profile.brand_kit = profile.brand_kit ? JSON.parse(profile.brand_kit) : null
    profile.numerology_data = profile.numerology_data ? JSON.parse(profile.numerology_data) : null
    profile.is_default = !!profile.is_default
    res.json({ profile })
  } catch (err) {
    console.error('[Profile Create] FULL ERROR:', err?.message, err?.stack)
    res.status(500).json({ error: 'Erro ao criar perfil', detail: err?.message })
  }
})

// PUT /api/profiles/:id
router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!existing) return res.status(404).json({ error: 'Perfil nao encontrado' })

    const { name, niche, target_audience, tone, bio, color_palette, brand_kit,
            voice_blueprint, numerology_data, instagram_handle, style_pack_id,
            default_platform, default_slide_count, preferred_font, photo_base64, is_default } = req.body

    if (is_default) {
      run('UPDATE profiles SET is_default = 0 WHERE user_id = ?', [req.user.id])
    }

    run(
      `UPDATE profiles SET
        name = COALESCE(?, name),
        niche = COALESCE(?, niche),
        target_audience = COALESCE(?, target_audience),
        tone = COALESCE(?, tone),
        bio = COALESCE(?, bio),
        color_palette = COALESCE(?, color_palette),
        brand_kit = COALESCE(?, brand_kit),
        voice_blueprint = COALESCE(?, voice_blueprint),
        numerology_data = COALESCE(?, numerology_data),
        instagram_handle = COALESCE(?, instagram_handle),
        style_pack_id = COALESCE(?, style_pack_id),
        default_platform = COALESCE(?, default_platform),
        default_slide_count = COALESCE(?, default_slide_count),
        preferred_font = COALESCE(?, preferred_font),
        photo_base64 = COALESCE(?, photo_base64),
        is_default = COALESCE(?, is_default)
       WHERE id = ? AND user_id = ?`,
      [name || null, niche, target_audience, tone, bio,
       color_palette ? JSON.stringify(color_palette) : null,
       brand_kit ? JSON.stringify(brand_kit) : null,
       voice_blueprint, numerology_data ? JSON.stringify(numerology_data) : null,
       instagram_handle, style_pack_id, default_platform,
       default_slide_count || null, preferred_font, photo_base64,
       is_default !== undefined ? (is_default ? 1 : 0) : null,
       req.params.id, req.user.id]
    )

    const profile = get('SELECT * FROM profiles WHERE id = ?', [req.params.id])
    profile.color_palette = profile.color_palette ? JSON.parse(profile.color_palette) : null
    profile.brand_kit = profile.brand_kit ? JSON.parse(profile.brand_kit) : null
    profile.numerology_data = profile.numerology_data ? JSON.parse(profile.numerology_data) : null
    profile.is_default = !!profile.is_default
    res.json({ profile })
  } catch (err) {
    console.error('[Profile Update]', err)
    res.status(500).json({ error: 'Erro ao atualizar perfil' })
  }
})

// DELETE /api/profiles/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!existing) return res.status(404).json({ error: 'Perfil nao encontrado' })

    run('DELETE FROM profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])

    // If deleted profile was default, make another one default
    if (existing.is_default) {
      const next = get('SELECT id FROM profiles WHERE user_id = ? LIMIT 1', [req.user.id])
      if (next) run('UPDATE profiles SET is_default = 1 WHERE id = ?', [next.id])
    }

    res.json({ message: 'Perfil removido' })
  } catch (err) {
    console.error('[Profile Delete]', err)
    res.status(500).json({ error: 'Erro ao remover perfil' })
  }
})

export default router
