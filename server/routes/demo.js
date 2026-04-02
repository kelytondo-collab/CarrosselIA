import { Router } from 'express'
import { getGenAI } from '../services/geminiProxy.js'
import { generateEssencePromptBlock, calcProfile, getVenusSign, NUMBER_MEANINGS } from '../services/essenceEngine.js'

const router = Router()

// Rate limiting
const rateLimitMap = new Map()
function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.start > 3600000) {
    rateLimitMap.set(ip, { start: now, count: 1 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

// Fallback carousel templates by expression number archetype
function buildFallbackCarousel(firstName, niche, expressaoNum) {
  const m = NUMBER_MEANINGS[expressaoNum] || NUMBER_MEANINGS[1]
  const nicheLabel = niche || 'sua area'

  const templates = {
    1: { // Pioneiro
      slides: [
        { headline: `Pare de esperar permissao`, subtitle: `O que ninguem te conta sobre ${nicheLabel}`, type: 'cover' },
        { headline: `O maior erro?`, subtitle: `Esperar estar pronto pra comecar. Quem lidera, age antes de ter certeza.`, type: 'content' },
        { headline: `A verdade incomoda`, subtitle: `Seu conhecimento vale mais do que voce cobra. E voce sabe disso.`, type: 'content' },
        { headline: `O que eu fiz diferente`, subtitle: `Parei de pedir validacao e comecei a construir. Sem plateia, sem aplausos.`, type: 'content' },
        { headline: `Resultado?`, subtitle: `Autoridade nao se pede — se constroi. Um conteudo por vez, um cliente por vez.`, type: 'content' },
        { headline: `Seu proximo passo`, subtitle: `Escolha UMA coisa que voce sabe e ensine HOJE. Nao amanha. Hoje.`, type: 'content' },
        { headline: `Salve e comece agora`, subtitle: `Se isso fez sentido, voce ja sabe o que fazer.`, type: 'cta' },
      ],
    },
    2: { // Diplomata
      slides: [
        { headline: `Voce nao precisa gritar pra ser ouvido`, subtitle: `A forca silenciosa em ${nicheLabel}`, type: 'cover' },
        { headline: `O mundo recompensa quem acolhe`, subtitle: `Sua sensibilidade nao e fraqueza. E sua maior ferramenta.`, type: 'content' },
        { headline: `Eu tambem me anulei`, subtitle: `Achava que cuidar dos outros era minha missao. Ate perceber que eu merecia o mesmo.`, type: 'content' },
        { headline: `A virada`, subtitle: `Quando parei de pedir permissao pra existir, tudo mudou.`, type: 'content' },
        { headline: `Sua voz importa`, subtitle: `Nao precisa ser a mais alta da sala. Precisa ser a mais verdadeira.`, type: 'content' },
        { headline: `Comece por voce`, subtitle: `Antes de cuidar do mundo, cuide da sua mensagem.`, type: 'content' },
        { headline: `Salve pra lembrar`, subtitle: `Compartilhe com alguem que precisa ouvir isso.`, type: 'cta' },
      ],
    },
    default: {
      slides: [
        { headline: `Seu conteudo nao deveria ser generico`, subtitle: `O que muda quando voce encontra SUA voz em ${nicheLabel}`, type: 'cover' },
        { headline: `O problema`, subtitle: `Voce sabe muito. Mas na hora de criar conteudo, parece que tudo ja foi dito.`, type: 'content' },
        { headline: `A causa real`, subtitle: `Nao e falta de conhecimento. E falta de DIRECAO. Voce esta criando sem essencia.`, type: 'content' },
        { headline: `O que descobri`, subtitle: `Quando alinhei meu conteudo com quem eu realmente sou, tudo mudou.`, type: 'content' },
        { headline: `A diferenca`, subtitle: `Conteudo generico informa. Conteudo com essencia TRANSFORMA. E so voce tem a sua.`, type: 'content' },
        { headline: `Na pratica`, subtitle: `Cada post seu deveria carregar sua marca invisivel. Sua dor, sua virada, sua verdade.`, type: 'content' },
        { headline: `Quer criar assim?`, subtitle: `Salve e descubra como gerar conteudo com SUA essencia.`, type: 'cta' },
      ],
    },
  }

  const chosen = templates[expressaoNum] || templates.default

  return {
    slides: chosen.slides,
    caption: {
      hook: `${firstName}, isso e o que muda quando voce para de criar conteudo generico.`,
      body: `Seu numero de Expressao (${m.title}) revela um estilo unico de comunicacao. Quando voce alinha seu conteudo com essa essencia, ele para de parecer "mais do mesmo" e comeca a atrair as pessoas certas.`,
      cta: `Quer descobrir mais? Comece seu trial gratis.`,
      hashtags: `#autorIA #conteudocomessencia #${(niche || 'especialista').replace(/\s/g, '')} #marketingdigital #conteudoautentico`,
    },
  }
}

// POST /api/demo/generate-carousel — PUBLIC (no auth)
router.post('/generate-carousel', async (req, res) => {
  try {
    const { name, birthDate, niche } = req.body
    if (!name || !birthDate) {
      return res.status(400).json({ error: 'Nome e data de nascimento sao obrigatorios' })
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Limite de demos atingido. Tente novamente em 1 hora.' })
    }

    const profile = calcProfile(name, birthDate)
    const venusSign = getVenusSign(birthDate)
    const firstName = name.split(' ')[0]

    // Try Gemini generation, fallback to template
    let carouselData = null
    const genAI = getGenAI()

    if (genAI) {
      try {
        const essenceBlock = generateEssencePromptBlock(name, birthDate)
        const prompt = `Voce gera carrosseis para Instagram. Gere 7 slides (capa + 5 conteudo + CTA) sobre "${niche || 'desenvolvimento pessoal'}" no estilo dessa pessoa:

${essenceBlock}

IMPORTANTE: Responda SOMENTE com JSON puro, sem markdown, sem explicacao.
headline = titulo curto (max 8 palavras), subtitle = texto apoio (max 20 palavras).
NUNCA mencione numerologia no conteudo.

{"slides":[{"headline":"...","subtitle":"...","type":"cover"},{"headline":"...","subtitle":"...","type":"content"},{"headline":"...","subtitle":"...","type":"content"},{"headline":"...","subtitle":"...","type":"content"},{"headline":"...","subtitle":"...","type":"content"},{"headline":"...","subtitle":"...","type":"content"},{"headline":"...","subtitle":"...","type":"cta"}],"caption":{"hook":"...","body":"...","cta":"...","hashtags":"..."}}`

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
        })

        let text = result.response.text().trim()
        // Clean markdown fences
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
        // Extract JSON object
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}')
        if (start >= 0 && end > start) {
          let jsonStr = text.substring(start, end + 1)
          // Fix trailing commas
          jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')
          carouselData = JSON.parse(jsonStr)
        }
      } catch (err) {
        console.error('[Demo] Gemini failed, using fallback:', err?.message)
      }
    }

    // Fallback
    if (!carouselData || !carouselData.slides?.length) {
      carouselData = buildFallbackCarousel(firstName, niche, profile.expressao)
    }

    res.json({
      numerology: profile,
      venusSign,
      firstName,
      carousel: carouselData,
    })
  } catch (err) {
    console.error('[Demo Generate]', err?.message || err)
    res.status(500).json({ error: 'Erro ao gerar demo. Tente novamente.' })
  }
})

export default router
