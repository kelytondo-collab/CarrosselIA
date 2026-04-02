import { GoogleGenerativeAI } from '@google/generative-ai'
import { get, run } from '../db.js'

let genAI = null

export function initGeminiProxy() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.warn('[Gemini] No API key configured — AI features disabled')
    return false
  }
  genAI = new GoogleGenerativeAI(key)
  console.log('[Gemini] Proxy initialized')
  return true
}

export function getGenAI() {
  return genAI
}

// Proxy endpoint handler — receives prompt from frontend, calls Gemini, returns result
export async function handleGeminiProxy(req, res) {
  try {
    if (!genAI) return res.status(503).json({ error: 'IA nao configurada no servidor' })

    const { model: modelName, contents, generationConfig, systemInstruction } = req.body
    if (!contents) return res.status(400).json({ error: 'Conteudo obrigatorio' })

    // Track usage
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(401).json({ error: 'Usuario nao encontrado' })

    // Check trial
    if (user.plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) < new Date()) {
      return res.status(403).json({ error: 'trial_expired', message: 'Seu trial expirou' })
    }

    const modelConfig = { model: modelName || 'gemini-2.5-flash' }
    if (systemInstruction) modelConfig.systemInstruction = systemInstruction
    const model = genAI.getGenerativeModel(modelConfig)

    const result = await model.generateContent({
      contents,
      generationConfig: generationConfig || {},
    })

    const response = result.response

    // Check for image responses
    const parts = response.candidates?.[0]?.content?.parts || []
    const responseParts = parts.map(part => {
      if (part.inlineData) {
        return { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } }
      }
      return { text: part.text || '' }
    })

    // Log AI usage
    run('INSERT INTO usage_log (user_id, action, credits_used, metadata) VALUES (?, ?, 1, ?)',
      [req.user.id, 'gemini_call', JSON.stringify({ model: modelName || 'gemini-2.5-flash' })])

    res.json({ parts: responseParts })
  } catch (err) {
    console.error('[Gemini Proxy]', err?.message || err)
    const status = err?.status || 500
    res.status(status).json({ error: err?.message || 'Erro na chamada de IA' })
  }
}
