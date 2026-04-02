import { Router } from 'express'
import { all, get, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { checkPostLimit } from '../middleware/planLimits.js'

const router = Router()

router.use(authMiddleware)

// GET /api/projects
router.get('/', (req, res) => {
  try {
    const { status, type, limit, offset } = req.query
    let sql = 'SELECT * FROM projects WHERE user_id = ?'
    const params = [req.user.id]

    if (status) { sql += ' AND status = ?'; params.push(status) }
    if (type) { sql += ' AND type = ?'; params.push(type) }

    sql += ' ORDER BY updated_at DESC'

    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)) }
    if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)) }

    const projects = all(sql, params)
    const parsed = projects.map(p => ({
      ...p,
      inputs_json: p.inputs_json ? JSON.parse(p.inputs_json) : null,
      carousel_data: p.carousel_data ? JSON.parse(p.carousel_data) : null,
      post_data: p.post_data ? JSON.parse(p.post_data) : null,
      stories_data: p.stories_data ? JSON.parse(p.stories_data) : null,
      tags: p.tags ? JSON.parse(p.tags) : [],
      is_favorite: !!p.is_favorite,
    }))
    res.json({ projects: parsed })
  } catch (err) {
    console.error('[Projects List]', err)
    res.status(500).json({ error: 'Erro ao listar projetos' })
  }
})

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  try {
    const project = get('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!project) return res.status(404).json({ error: 'Projeto nao encontrado' })

    project.inputs_json = project.inputs_json ? JSON.parse(project.inputs_json) : null
    project.carousel_data = project.carousel_data ? JSON.parse(project.carousel_data) : null
    project.post_data = project.post_data ? JSON.parse(project.post_data) : null
    project.stories_data = project.stories_data ? JSON.parse(project.stories_data) : null
    project.tags = project.tags ? JSON.parse(project.tags) : []
    project.is_favorite = !!project.is_favorite

    res.json({ project })
  } catch (err) {
    console.error('[Project Get]', err)
    res.status(500).json({ error: 'Erro ao buscar projeto' })
  }
})

// POST /api/projects — creates project + increments usage
router.post('/', checkPostLimit, (req, res) => {
  try {
    const { name, type, theme, product, platform, profile_id,
            inputs_json, carousel_data, post_data, stories_data } = req.body

    if (!name) return res.status(400).json({ error: 'Nome do projeto e obrigatorio' })

    const { lastId } = run(
      `INSERT INTO projects (user_id, profile_id, type, name, theme, product, platform,
        inputs_json, carousel_data, post_data, stories_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, profile_id || null, type || 'carousel', name,
       theme || null, product || null, platform || null,
       inputs_json ? JSON.stringify(inputs_json) : null,
       carousel_data ? JSON.stringify(carousel_data) : null,
       post_data ? JSON.stringify(post_data) : null,
       stories_data ? JSON.stringify(stories_data) : null]
    )

    // Increment usage
    run('UPDATE users SET posts_used_this_month = posts_used_this_month + 1, updated_at = datetime("now") WHERE id = ?', [req.user.id])
    run('INSERT INTO usage_log (user_id, action, credits_used) VALUES (?, ?, 1)', [req.user.id, `create_${type || 'carousel'}`])

    const project = get('SELECT * FROM projects WHERE id = ?', [lastId])
    project.inputs_json = project.inputs_json ? JSON.parse(project.inputs_json) : null
    project.carousel_data = project.carousel_data ? JSON.parse(project.carousel_data) : null
    project.post_data = project.post_data ? JSON.parse(project.post_data) : null
    project.stories_data = project.stories_data ? JSON.parse(project.stories_data) : null
    project.is_favorite = !!project.is_favorite
    res.json({ project })
  } catch (err) {
    console.error('[Project Create]', err)
    res.status(500).json({ error: 'Erro ao criar projeto' })
  }
})

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!existing) return res.status(404).json({ error: 'Projeto nao encontrado' })

    const { name, theme, product, platform, status, is_favorite, tags,
            inputs_json, carousel_data, post_data, stories_data } = req.body

    const updates = []
    const params = []

    if (name !== undefined) { updates.push('name = ?'); params.push(name) }
    if (theme !== undefined) { updates.push('theme = ?'); params.push(theme) }
    if (product !== undefined) { updates.push('product = ?'); params.push(product) }
    if (platform !== undefined) { updates.push('platform = ?'); params.push(platform) }
    if (status !== undefined) { updates.push('status = ?'); params.push(status) }
    if (is_favorite !== undefined) { updates.push('is_favorite = ?'); params.push(is_favorite ? 1 : 0) }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)) }
    if (inputs_json !== undefined) { updates.push('inputs_json = ?'); params.push(JSON.stringify(inputs_json)) }
    if (carousel_data !== undefined) { updates.push('carousel_data = ?'); params.push(JSON.stringify(carousel_data)) }
    if (post_data !== undefined) { updates.push('post_data = ?'); params.push(JSON.stringify(post_data)) }
    if (stories_data !== undefined) { updates.push('stories_data = ?'); params.push(JSON.stringify(stories_data)) }

    if (updates.length === 0) return res.json({ message: 'Nada para atualizar' })

    updates.push('updated_at = datetime("now")')
    params.push(req.params.id, req.user.id)

    run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params)

    const project = get('SELECT * FROM projects WHERE id = ?', [req.params.id])
    project.inputs_json = project.inputs_json ? JSON.parse(project.inputs_json) : null
    project.carousel_data = project.carousel_data ? JSON.parse(project.carousel_data) : null
    project.post_data = project.post_data ? JSON.parse(project.post_data) : null
    project.stories_data = project.stories_data ? JSON.parse(project.stories_data) : null
    project.tags = project.tags ? JSON.parse(project.tags) : []
    project.is_favorite = !!project.is_favorite
    res.json({ project })
  } catch (err) {
    console.error('[Project Update]', err)
    res.status(500).json({ error: 'Erro ao atualizar projeto' })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!existing) return res.status(404).json({ error: 'Projeto nao encontrado' })

    run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    res.json({ message: 'Projeto removido' })
  } catch (err) {
    console.error('[Project Delete]', err)
    res.status(500).json({ error: 'Erro ao remover projeto' })
  }
})

// POST /api/projects/:id/favorite
router.post('/:id/favorite', (req, res) => {
  try {
    const existing = get('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!existing) return res.status(404).json({ error: 'Projeto nao encontrado' })

    run('UPDATE projects SET is_favorite = ?, updated_at = datetime("now") WHERE id = ?',
      [existing.is_favorite ? 0 : 1, req.params.id])
    res.json({ is_favorite: !existing.is_favorite })
  } catch (err) {
    console.error('[Project Favorite]', err)
    res.status(500).json({ error: 'Erro ao favoritar' })
  }
})

export default router
