import { Router } from 'express'
import { run, get } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// POST /api/luminae/sync — receive content from Luminae and save as project
router.post('/sync', authMiddleware, (req, res) => {
  try {
    const { tipo, slides, caption, phrases, autoStyle, metadata } = req.body

    if (!tipo) return res.status(400).json({ error: 'Tipo de conteudo obrigatorio' })

    let projectType = 'carousel'
    let projectName = 'Import Luminae'
    let carouselData = null
    let postData = null
    let storiesData = null

    if (tipo === 'carrossel' && slides?.length > 0) {
      projectType = 'carousel'
      projectName = `Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Import'}`
      carouselData = {
        strategy: { persona: '', painPoint: '', desire: '', narrativePath: '', consciousnessLevel: '', niche: '', hook: caption?.hook || '' },
        slides: slides.map((s, i) => ({
          id: i + 1,
          headline: s.headline || '',
          subtitle: s.subtitle || '',
          visualPrompt: '',
          emotion: '',
          isGeneratingImage: false,
          style: {},
          semanticType: s.type || undefined,
        })),
        caption: { hook: caption?.hook || '', body: caption?.body || '', cta: caption?.cta || '', hashtags: caption?.hashtags || '', altText: '' },
        manychat: { keyword: '', flow1: '', flow2: '', flow3: '' },
        format: '4:5',
        generatedAt: new Date().toISOString(),
        autoStyle: autoStyle || false,
      }
    } else if (tipo === 'post' && slides?.length > 0) {
      projectType = 'post'
      projectName = `Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Post'}`
      postData = {
        headline: slides[0]?.headline || '',
        subtitle: slides[0]?.subtitle || '',
        caption: { hook: caption?.hook || '', body: caption?.body || '', cta: caption?.cta || '', hashtags: caption?.hashtags || '' },
        visualPrompt: '',
        layout: 'minimal',
        generatedAt: new Date().toISOString(),
      }
    } else if (tipo === 'stories' && slides?.length > 0) {
      projectType = 'stories'
      projectName = `Luminae: ${slides[0]?.headline?.slice(0, 30) || 'Stories'}`
      storiesData = {
        slides: slides.map((s, i) => ({
          id: i + 1,
          type: 'content',
          headline: s.headline || '',
          body: s.subtitle || '',
          visualPrompt: '',
          layout: 'minimal',
        })),
        caption: { hook: caption?.hook || '', body: caption?.body || '', cta: caption?.cta || '', hashtags: caption?.hashtags || '' },
        generatedAt: new Date().toISOString(),
      }
    } else if (tipo === 'reels_conexao' && phrases?.length > 0) {
      // Reels Conexao — save as metadata in project
      projectType = 'carousel' // Store as carousel type with special flag
      projectName = `Luminae: Reels Conexao`
      carouselData = {
        tipo: 'reels_conexao',
        phrases,
        recordingTip: metadata?.recordingTip || '',
        musicMood: metadata?.musicMood || '',
        generatedAt: new Date().toISOString(),
      }
    }

    const { lastId } = run(
      `INSERT INTO projects (user_id, type, name, carousel_data, post_data, stories_data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, projectType, projectName,
       carouselData ? JSON.stringify(carouselData) : null,
       postData ? JSON.stringify(postData) : null,
       storiesData ? JSON.stringify(storiesData) : null]
    )

    const project = get('SELECT * FROM projects WHERE id = ?', [lastId])
    res.json({
      project_id: project.id,
      type: projectType,
      name: projectName,
      message: 'Conteudo sincronizado com sucesso',
    })
  } catch (err) {
    console.error('[Luminae Sync]', err)
    res.status(500).json({ error: 'Erro ao sincronizar conteudo' })
  }
})

export default router
