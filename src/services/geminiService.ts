import type { CarouselData, ProjectInputs, SlideData, Tone, Platform, PostData, PostInputs, StoriesData, StoriesInputs, StorySlide, Caption } from '../types'
import { apiFetch } from './apiService'
import { getDefaultProfile } from './storageService'

// ── Proxy response type ──

interface ProxyResponse {
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
}

// ── Internal helpers ──

async function geminiCall(opts: {
  model?: string
  systemInstruction?: string
  contents: { role: string; parts: unknown[] }[]
  generationConfig?: Record<string, unknown>
}): Promise<ProxyResponse> {
  return apiFetch<ProxyResponse>('/api/gemini/generate', {
    method: 'POST',
    body: JSON.stringify(opts),
  })
}

function getText(res: ProxyResponse): string {
  return res.parts.find(p => p.text)?.text?.trim() || ''
}

function getImage(res: ProxyResponse): string {
  const p = res.parts.find(p => p.inlineData)
  if (!p?.inlineData) throw new Error('Imagem nao gerada pelo modelo')
  return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`
}

function parseJson(text: string): unknown {
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim())
}

function stripDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, '')
}

function getMimeType(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);/)
  return m ? m[1] : 'image/jpeg'
}

const buildSystemPrompt = (tone: Tone, platform: Platform, niche: string, voiceBlueprint?: string): string => `
Você é um especialista em copywriting e estratégia de conteúdo digital para ${platform}.
Nicho: ${niche || 'marketing digital e empreendedorismo'}.
Tom de voz: ${tone.toUpperCase()}
${tone === 'descontraído' ? '- Conversa leve, próxima, como amigo.' : ''}
${tone === 'profissional' ? '- Autoridade, dados, clareza.' : ''}
${tone === 'inspirador' ? '- Motivacional, transformador, emocional.' : ''}
${tone === 'urgente' ? '- Escassez, prova social, FOMO.' : ''}
${tone === 'educativo' ? '- Didático, passo a passo.' : ''}
${tone === 'provocador' ? '- Quebra padrões, desafia crenças.' : ''}
${tone === 'afetuoso' ? '- Empático, acolhedor, mentor.' : ''}

Regras ${platform}:
${platform === 'instagram' ? '- Títulos até 60 chars, subtítulos até 120, CTA via comentário, 20-30 hashtags.' : ''}
${platform === 'linkedin' ? '- Tom profissional, dados, legenda longa, máx 5 hashtags.' : ''}

Retorne APENAS JSON válido sem markdown, sem \`\`\`json, apenas o objeto JSON puro.
${voiceBlueprint ? `\nBLUEPRINT DA VOZ:\n---\n${voiceBlueprint}\n---` : ''}`

// ── Carousel Copy (full generation) ──

export const generateCarouselCopy = async (
  inputs: ProjectInputs,
  onProgress?: (phase: string, pct: number) => void,
  voiceBlueprint?: string
): Promise<CarouselData> => {
  onProgress?.('Analisando estratégia...', 15)

  const prompt = `
Gere um carrossel completo de ${inputs.slideCount} slides para ${inputs.platform}.
Retorne JSON com esta estrutura exata:
{
  "strategy": {
    "persona": "descrição da persona ultra-específica",
    "painPoint": "dor principal",
    "desire": "desejo profundo",
    "narrativePath": "caminho narrativo",
    "consciousnessLevel": "nível de consciência do avatar",
    "niche": "${inputs.niche}",
    "hook": "gancho principal"
  },
  "slides": [
    {
      "id": 1,
      "headline": "título impactante até 60 chars",
      "subtitle": "subtítulo que complementa até 120 chars",
      "visualPrompt": "descrição ultra-detalhada da imagem para o nicho ${inputs.niche}: cenário real e específico do nicho, pessoa do público-alvo (${inputs.niche} — mulher ou homem condizente com o público real do nicho, NUNCA homem de terno em nicho de saúde/estética/bem-estar), iluminação, composição, emoção, estilo fotográfico, cores, SEM texto na imagem",
      "emotion": "emoção que o slide desperta",
      "ctaType": "tipo de CTA se aplicável"
    }
  ],
  "caption": {
    "hook": "primeira linha que para o scroll",
    "body": "corpo com quebras de linha e emojis estratégicos",
    "cta": "Comenta [PALAVRA] que te envio [BENEFÍCIO]",
    "hashtags": "#hashtag1 #hashtag2 ...",
    "altText": "descrição acessível do carrossel"
  },
  "manychat": {
    "keyword": "PALAVRA",
    "flow1": "mensagem instantânea de boas-vindas",
    "flow2": [{"step": "Passo 1", "message": "mensagem"}, {"step": "Passo 2", "message": "mensagem"}, {"step": "Passo 3", "message": "mensagem"}],
    "flow3": [{"step": "Follow-up 1", "message": "mensagem"}, {"step": "Follow-up 2", "message": "mensagem"}, {"step": "Follow-up 3", "message": "mensagem"}]
  },
  "seoKeywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"]
}

DADOS DO PROJETO:
- Tema: ${inputs.theme}
- Produto/Serviço: ${inputs.product}
- Objetivo: ${inputs.objective}
- Preço/Investimento: ${inputs.investment}
- Contexto Visual: ${inputs.contextInfo}
- Número de Slides: ${inputs.slideCount}
- Plataforma: ${inputs.platform}
- Tom: ${inputs.tone}
- Nicho: ${inputs.niche}
${inputs.baseText ? `\nCONTEÚDO BASE (use como referência principal — extraia ideias, insights e linguagem deste texto):\n${inputs.baseText}` : ''}

O slide 1 deve ser a CAPA com gancho poderoso.
O slide ${inputs.slideCount} deve ser o FECHAMENTO com CTA emocional.
Os slides intermediários = uma ideia completa cada.
`

  onProgress?.('Gerando copy e estratégia...', 40)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, inputs.platform, inputs.niche, voiceBlueprint),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  onProgress?.('Processando resultado...', 80)

  const parsed = parseJson(getText(res)) as CarouselData

  if (!parsed.strategy || typeof parsed.strategy !== 'object') {
    parsed.strategy = { persona: '', painPoint: '', desire: '', narrativePath: '', consciousnessLevel: '', niche: inputs.niche, hook: '' }
  } else {
    parsed.strategy.persona = parsed.strategy.persona || ''
    parsed.strategy.painPoint = parsed.strategy.painPoint || ''
    parsed.strategy.desire = parsed.strategy.desire || ''
    parsed.strategy.narrativePath = parsed.strategy.narrativePath || ''
    parsed.strategy.consciousnessLevel = parsed.strategy.consciousnessLevel || ''
    parsed.strategy.niche = parsed.strategy.niche || inputs.niche
    parsed.strategy.hook = parsed.strategy.hook || ''
  }

  if (!parsed.caption || typeof parsed.caption !== 'object') {
    parsed.caption = { hook: '', body: '', cta: '', hashtags: '' }
  } else {
    parsed.caption.hook = parsed.caption.hook || ''
    parsed.caption.body = parsed.caption.body || ''
    parsed.caption.cta = parsed.caption.cta || ''
    parsed.caption.hashtags = parsed.caption.hashtags || ''
  }

  const slides: SlideData[] = (parsed.slides || []).map((s, i) => ({
    ...s,
    id: i + 1,
    isGeneratingImage: false,
    style: {},
  }))

  onProgress?.('Pronto!', 100)

  return {
    ...parsed,
    slides,
    format: inputs.platform === 'linkedin' ? '1:1' : '4:5',
    generatedAt: new Date().toISOString(),
  }
}

// ── FORMAT-ONLY: Distributes text into slides WITHOUT rewriting ──

export const generateCarouselFormat = async (
  inputs: ProjectInputs,
  onProgress?: (phase: string, pct: number) => void,
): Promise<CarouselData> => {
  onProgress?.('Analisando conteúdo...', 15)

  const prompt = `
TEXTO DO ESPECIALISTA (use EXATAMENTE estas palavras):
---
${inputs.baseText}
---

Distribua este texto em ${inputs.slideCount} slides para ${inputs.platform}.
Cada slide deve ter um "headline" (frase principal, até 60 chars, EXTRAÍDA do texto) e um "subtitle" (complemento, até 120 chars, EXTRAÍDO do texto).

Retorne JSON:
{
  "strategy": {
    "persona": "detecte do texto",
    "painPoint": "detecte do texto",
    "desire": "detecte do texto",
    "narrativePath": "detecte do texto",
    "consciousnessLevel": "detecte do texto",
    "niche": "${inputs.niche}",
    "hook": "extraia do texto"
  },
  "slides": [
    { "id": 1, "headline": "frase EXATA do texto", "subtitle": "complemento EXATO do texto", "visualPrompt": "descrição visual", "emotion": "emoção" }
  ],
  "caption": {
    "hook": "EXTRAIA do texto — primeira frase mais impactante",
    "body": "EXTRAIA do texto — corpo principal",
    "cta": "EXTRAIA do texto — chamada para ação",
    "hashtags": "#hashtag1 #hashtag2 ...",
    "altText": "descrição acessível"
  },
  "manychat": { "keyword": "", "flow1": "", "flow2": "", "flow3": "" },
  "seoKeywords": []
}

IMPORTANTE: O slide 1 = capa (hook mais forte do texto). Slide ${inputs.slideCount} = fechamento/CTA do texto.
NÃO reescreva. NÃO melhore. DISTRIBUA.`

  onProgress?.('Formatando em slides...', 40)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um FORMATADOR, NÃO um escritor.
O texto abaixo foi criado com a essência única do especialista.
REGRAS ABSOLUTAS:
1. NÃO reescreva NENHUMA frase. Use as palavras EXATAS do texto original.
2. NÃO adicione ideias novas. NÃO "melhore" o texto. NÃO troque vocabulário.
3. DISTRIBUA o conteúdo pelos slides mantendo a progressão lógica.
4. Para a caption: EXTRAIA hook e CTA do próprio texto. NÃO invente.
5. Retorne APENAS JSON válido sem markdown.`,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  onProgress?.('Processando resultado...', 80)

  const parsed = parseJson(getText(res)) as CarouselData

  const slides: SlideData[] = (parsed.slides || []).map((s, i) => ({
    ...s,
    id: i + 1,
    isGeneratingImage: false,
    style: {},
  }))

  onProgress?.('Pronto!', 100)

  return {
    ...parsed,
    slides,
    format: inputs.platform === 'linkedin' ? '1:1' : '4:5',
    generatedAt: new Date().toISOString(),
  }
}

// ── Regenerate single caption section ──

export const regenerateCaptionSection = async (
  section: 'hook' | 'body' | 'cta' | 'hashtags',
  currentCaption: Caption,
  context: { niche: string; tone: Tone; theme?: string },
  voiceBlueprint?: string,
): Promise<string> => {
  const sectionDesc: Record<string, string> = {
    hook: 'a PRIMEIRA LINHA da legenda — o gancho que para o scroll. Curta, direta, emocional.',
    body: 'o CORPO da legenda — com quebras de linha e emojis estratégicos. Desenvolva a ideia com clareza.',
    cta: 'a CHAMADA PARA AÇÃO — o que a pessoa deve fazer. Ex: "Comenta [PALAVRA] que te envio..."',
    hashtags: '20-30 HASHTAGS relevantes para o nicho, separadas por espaço.',
  }

  const prompt = `
Reescreva APENAS ${sectionDesc[section]}

Contexto da legenda atual:
- Hook: ${currentCaption.hook}
- Corpo: ${currentCaption.body}
- CTA: ${currentCaption.cta}
${context.theme ? `- Tema: ${context.theme}` : ''}

Mantenha a coerência com o restante da legenda.
Retorne SOMENTE o texto da seção "${section}", nada mais.`

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um copywriter expert para Instagram. Nicho: ${context.niche}. Tom: ${context.tone}.
${voiceBlueprint ? `BLUEPRINT DA VOZ:\n${voiceBlueprint}` : ''}
Retorne APENAS o texto solicitado, sem JSON, sem aspas, sem marcadores.`,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return getText(res)
}

// ── FORMAT-ONLY for Post ──

export const generatePostFormat = async (
  baseText: string,
  niche: string,
  onProgress?: (phase: string, pct: number) => void,
): Promise<PostData> => {
  onProgress?.('Formatando post...', 20)

  const prompt = `
TEXTO DO ESPECIALISTA:
---
${baseText}
---

Formate este texto como POST ESTÁTICO Instagram (1080x1080).
EXTRAIA do texto (NÃO reescreva):
{
  "headline": "frase EXATA mais impactante do texto (até 50 chars)",
  "subtitle": "complemento EXATO do texto (até 100 chars)",
  "caption": {
    "hook": "EXTRAIA do texto",
    "body": "EXTRAIA do texto",
    "cta": "EXTRAIA do texto",
    "hashtags": "#hashtags relevantes",
    "altText": "descrição acessível"
  },
  "visualPrompt": "descrição visual para o nicho ${niche}",
  "seoKeywords": []
}`

  onProgress?.('Processando...', 60)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um FORMATADOR, NÃO um escritor.
REGRAS: NÃO reescreva. Use as palavras EXATAS. DISTRIBUA o conteúdo em headline + subtitle + caption.
Retorne APENAS JSON válido.`,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const parsed = parseJson(getText(res)) as PostData

  onProgress?.('Pronto!', 100)

  return { ...parsed, layout: 'minimal', generatedAt: new Date().toISOString() }
}

// ── FORMAT-ONLY for Stories ──

export const generateStoriesFormat = async (
  baseText: string,
  _niche: string,
  storyCount: number,
  onProgress?: (phase: string, pct: number) => void,
): Promise<StoriesData> => {
  onProgress?.('Formatando stories...', 20)

  const prompt = `
TEXTO DO ESPECIALISTA:
---
${baseText}
---

Distribua em ${storyCount} STORIES (1080x1920 vertical).
EXTRAIA do texto (NÃO reescreva):
{
  "slides": [
    { "id": 1, "type": "content", "headline": "frase EXATA (até 40 chars)", "body": "complemento EXATO (até 80 chars)", "visualPrompt": "descrição visual" }
  ],
  "caption": {
    "hook": "EXTRAIA do texto",
    "body": "EXTRAIA do texto",
    "cta": "EXTRAIA do texto",
    "hashtags": "",
    "altText": ""
  }
}

Story 1 = gancho. Último = CTA. Intermediários = conteúdo.
Textos CURTOS e EXTRAÍDOS do original.`

  onProgress?.('Processando...', 60)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um FORMATADOR, NÃO um escritor.
REGRAS: NÃO reescreva. Use as palavras EXATAS. DISTRIBUA em stories verticais.
Retorne APENAS JSON válido.`,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const parsed = parseJson(getText(res)) as { slides: StorySlide[]; caption: Caption }

  const slides: StorySlide[] = (parsed.slides || []).map((s: StorySlide, i: number) => ({
    ...s,
    id: i + 1,
    layout: 'minimal' as const,
  }))

  onProgress?.('Pronto!', 100)

  return { slides, caption: parsed.caption, generatedAt: new Date().toISOString() }
}

// ── Voice Blueprint ──

export const generateVoiceBlueprint = async (
  answers: Record<string, string>,
  name: string,
  niche: string
): Promise<string> => {
  const prompt = `Você é um especialista em identidade comunicativa e copywriting.
Com base nas respostas abaixo de ${name} (nicho: ${niche || 'não informado'}), crie um Blueprint da Voz estruturado e detalhado.

RESPOSTAS:
- Como se comunica com seguidores: ${answers.comunicacao || '(não respondido)'}
- Crenças centrais sobre sua área: ${answers.crencas || '(não respondido)'}
- Palavras/expressões que sempre usa: ${answers.palavrasUsa || '(não respondido)'}
- Palavras/abordagens que nunca usaria: ${answers.palavrasNunca || '(não respondido)'}
- Transformação real que entrega: ${answers.transformacao || '(não respondido)'}
- Diferencial no nicho: ${answers.diferencial || '(não respondido)'}
- Como quer que a pessoa se sinta: ${answers.emocao || '(não respondido)'}
- Descrição de um conteúdo perfeito: ${answers.referencia || '(não respondido)'}

Estruture o Blueprint com estas 7 seções obrigatórias:

## TOM E PRESENÇA
[Descreva o tom geral, energia, postura comunicativa]

## VOCABULÁRIO PREFERIDO
[Liste palavras, expressões e construções que fazem parte da sua voz]

## VOCABULÁRIO PROIBIDO
[Liste palavras, abordagens e estilos que devem ser evitados]

## CRENÇAS E POSICIONAMENTOS
[As convicções centrais que guiam o conteúdo]

## NARRATIVA CENTRAL
[O fio condutor da história que ela conta — quem é, de onde veio, para onde vai]

## DIFERENCIAL
[O que torna esta voz única no nicho]

## REGRAS DE OURO
[5 a 7 regras práticas que todo conteúdo deve seguir]

Escreva de forma direta, específica e utilizável. Evite generalidades. Este documento será injetado em prompts de IA para calibrar o conteúdo gerado.`

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return getText(res)
}

// ── Slide Image Generation ──

export const generateSlideImage = async (
  visualPrompt: string,
  format: '1:1' | '9:16' | '4:5' = '4:5',
  expertPhotoBase64?: string
): Promise<string> => {
  const formatDesc = format === '9:16' ? 'vertical retrato (9:16)'
    : format === '4:5' ? 'vertical (4:5)'
    : 'quadrado (1:1)'

  if (expertPhotoBase64) {
    const mimeType = getMimeType(expertPhotoBase64)
    const base64 = stripDataUrl(expertPhotoBase64)

    const res = await geminiCall({
      model: 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
            text: `Esta é uma foto de referência do expert.
MANTENHA EXATAMENTE: rosto, traços, pele, cabelo, aparência física da pessoa.
MUDE COMPLETAMENTE: cenário, fundo, iluminação, ambiente, roupas se necessário.

Gere uma nova fotografia profissional e cinematográfica onde esta pessoa aparece em:
${visualPrompt}

Requisitos técnicos:
- Fotografia realista, alta qualidade, editorial
- Iluminação dramática e emocional
- Formato: ${formatDesc}
- O rosto da pessoa deve ser claramente reconhecível e idêntico à foto original

REGRA ABSOLUTA: A imagem NÃO PODE conter NENHUMA letra, palavra, frase, número ou texto de qualquer tipo. ZERO texto. ZERO letras. Nem desfocadas. Apenas fotografia pura.`
          }
        ]
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    })

    return getImage(res)
  } else {
    const res = await geminiCall({
      model: 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [{
          text: `Gere uma imagem baseada nesta descrição visual:
${visualPrompt}

Estilo: Fotografia cinematográfica profissional, emocional, alta qualidade.
Formato: ${formatDesc}.

REGRA ABSOLUTA — PROIBIDO TEXTO NA IMAGEM:
- A imagem NÃO PODE conter NENHUMA letra, palavra, frase, número, símbolo tipográfico ou caractere escrito.
- ZERO texto. ZERO letras. ZERO palavras. Nem mesmo parcialmente visíveis ou desfocadas.
- Se a descrição mencionar frases ou conteúdo textual, IGNORE o texto e gere APENAS o visual/cenário/atmosfera.
- NÃO gere marcas d'água, logos, títulos, legendas ou qualquer forma de escrita.

A imagem será usada como FUNDO para texto sobreposto depois — por isso precisa ser LIMPA, sem nenhum texto.`
        }]
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    })

    return getImage(res)
  }
}

// ── Post Estático (full generation) ──

export const generatePostCopy = async (
  inputs: PostInputs,
  onProgress?: (phase: string, pct: number) => void,
  voiceBlueprint?: string
): Promise<PostData> => {
  onProgress?.('Criando post estático...', 20)

  const prompt = `
Gere um POST ESTÁTICO para Instagram (formato quadrado 1080x1080).
Retorne APENAS JSON válido:
{
  "headline": "título impactante até 50 chars",
  "subtitle": "subtítulo complementar até 100 chars",
  "caption": {
    "hook": "primeira linha que para o scroll",
    "body": "corpo com quebras de linha e emojis estratégicos",
    "cta": "chamada para ação",
    "hashtags": "#hashtag1 #hashtag2 ... (20-30 hashtags)",
    "altText": "descrição acessível"
  },
  "visualPrompt": "descrição ultra-detalhada da imagem de fundo: cenário, pessoa, iluminação, composição, cores, estilo fotográfico, SEM texto na imagem",
  "seoKeywords": ["palavra1", "palavra2", "palavra3"]
}

DADOS:
- Tema: ${inputs.theme}
- Objetivo: ${inputs.objective}
- Tom: ${inputs.tone}
- Nicho: ${inputs.niche}
${inputs.baseText ? `\nCONTEÚDO BASE (use como referência principal para criar o post):\n${inputs.baseText}` : ''}

O título deve ser CURTO e FORTE. O visual deve ser profissional e condizente com o nicho.`

  onProgress?.('Gerando copy...', 50)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, 'instagram', inputs.niche, voiceBlueprint),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const parsed = parseJson(getText(res)) as PostData

  onProgress?.('Pronto!', 100)

  return {
    ...parsed,
    layout: 'minimal',
    generatedAt: new Date().toISOString(),
  }
}

// ── Clone Master (Analyze Reference) ──

export const analyzeReference = async (
  imageBase64: string,
  niche: string,
  tone: Tone
): Promise<{ colors: string[]; layout: string; typography: string; mood: string; suggestion: string }> => {
  const mimeType = getMimeType(imageBase64)
  const base64 = stripDataUrl(imageBase64)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64 } },
        {
          text: `Analise esta imagem de referência (screenshot de um post/anúncio de redes sociais).
Extraia:
1. Cores predominantes (hex codes)
2. Layout e composição
3. Tipografia (estilo das fontes)
4. Mood/atmosfera
5. Sugestão de como recriar algo similar para o nicho "${niche}" com tom "${tone}"

Retorne APENAS JSON:
{
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "layout": "descrição do layout",
  "typography": "estilo tipográfico",
  "mood": "atmosfera/mood",
  "suggestion": "como recriar para o nicho com identidade própria"
}`
        }
      ]
    }],
  })

  return parseJson(getText(res)) as { colors: string[]; layout: string; typography: string; mood: string; suggestion: string }
}

export const generateFromReference = async (
  analysis: { colors: string[]; layout: string; typography: string; mood: string; suggestion: string },
  theme: string,
  niche: string,
  tone: Tone,
  voiceBlueprint?: string,
  userContent?: string
): Promise<PostData> => {
  const contentBlock = userContent
    ? `\nIMPORTANTE: O usuario forneceu SEU PROPRIO conteudo. Use EXATAMENTE este texto como base para headline e subtitle. NAO reescreva, apenas formate para caber no post:\n"""\n${userContent}\n"""\n`
    : `\nTema: ${theme}\n`

  const prompt = `
Crie um POST ESTÁTICO Instagram (1080x1080) INSPIRADO nesta análise de referência:
- Layout: ${analysis.layout}
- Mood: ${analysis.mood}
- Tipografia: ${analysis.typography}
- Sugestão: ${analysis.suggestion}

MAS com a identidade do especialista (nicho: ${niche}, tom: ${tone}).
${contentBlock}
Retorne APENAS JSON:
{
  "headline": "título impactante até 50 chars${userContent ? ' (extraido do conteudo do usuario)' : ''}",
  "subtitle": "subtítulo até 100 chars${userContent ? ' (extraido do conteudo do usuario)' : ''}",
  "caption": {
    "hook": "primeira linha",
    "body": "corpo com emojis",
    "cta": "chamada para ação",
    "hashtags": "#h1 #h2 ... (20-30)",
    "altText": "descrição acessível"
  },
  "visualPrompt": "descrição da imagem inspirada no mood/layout de referência mas com a identidade do especialista, SEM texto na imagem",
  "seoKeywords": ["kw1", "kw2"]
}`

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(tone, 'instagram', niche, voiceBlueprint),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const parsed = parseJson(getText(res)) as PostData
  return { ...parsed, layout: 'minimal', generatedAt: new Date().toISOString() }
}

// ── Clone Visual (Image-to-Image) ──

export const clonePostVisual = async (
  referenceBase64: string,
  userPhotoBase64: string | undefined,
  userText: string,
  niche: string,
  tone: Tone,
  voiceBlueprint?: string
): Promise<PostData> => {
  if (!userPhotoBase64) throw new Error('Envie sua foto para clonar')

  const refMime = getMimeType(referenceBase64)
  const refData = stripDataUrl(referenceBase64)
  const userMime = getMimeType(userPhotoBase64)
  const userData = stripDataUrl(userPhotoBase64)

  // CLONE em 2 passos: (1) descrever referência → (2) gerar foto sem ver a referência
  let clonedImageUrl: string
  try {
    // PASSO 1: Modelo de texto analisa a referência e extrai APENAS elementos fotográficos
    const descRes = await geminiCall({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: refMime, data: refData } },
          {
            text: `Analyze this image and describe ONLY the PHOTOGRAPHIC elements. Ignore ALL text, typography, logos, buttons, graphics, overlays.

Describe in English, in a single dense paragraph:
1. Person's pose and body position (standing, sitting, angle, hands)
2. Clothing (color, style, details)
3. Background scene (color, environment, objects)
4. Lighting style (soft, dramatic, warm, cool, direction)
5. Color grading/mood (warm tones, cool tones, contrast level)
6. Camera angle and framing (close-up, half-body, full-body, eye-level)
7. Overall aesthetic (professional, casual, editorial, cinematic)

Output ONLY the description paragraph, nothing else. Be very specific about colors and visual details.`
          }
        ]
      }],
    })

    const photoDescription = getText(descRes) || 'Professional portrait, confident pose, dark background, warm cinematic lighting, half-body shot'
    console.log('[CLONE] Photo description:', photoDescription.slice(0, 200))

    // PASSO 2: Gerar foto da pessoa do usuário baseado na DESCRIÇÃO (sem ver a referência)
    const imageRes = await geminiCall({
      model: 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: userMime, data: userData } },
          {
            text: `Create a professional PORTRAIT PHOTOGRAPH of this person matching this exact style:

${photoDescription}

CRITICAL RULES:
1. Output ONLY a raw photograph — as if taken by a professional camera
2. There must be ZERO text, ZERO letters, ZERO words, ZERO typography anywhere
3. There must be ZERO graphics, ZERO buttons, ZERO overlays, ZERO watermarks
4. The output is PURELY a photograph — not a design, not a post, not a graphic
5. Keep the person's face and features accurate to the photo provided
6. Match the described pose, lighting, background, and color grading exactly

Output: 1080x1080 square photograph. Cinematic quality. Absolutely no text or graphics.`
          }
        ]
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    })

    clonedImageUrl = getImage(imageRes)
  } catch (imgErr: unknown) {
    // Retry with simple prompt (no reference at all)
    try {
      const retryRes = await geminiCall({
        model: 'gemini-2.5-flash-image',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: userMime, data: userData } },
            { text: `Create a professional portrait photograph of this person. Dark background, warm cinematic lighting, confident professional pose, half-body shot. Output ONLY a clean photograph — absolutely no text, no graphics, no overlays, no watermarks. Just a raw photo. 1080x1080 square.` }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      clonedImageUrl = getImage(retryRes)
    } catch (retryErr: unknown) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      console.error('[CLONE] Erro ao gerar imagem:', msg)
      throw new Error(`Erro ao clonar: ${msg}`)
    }
  }

  // Use PROFILE palette (not reference image colors) to avoid wrong colors in clone
  const profile = getDefaultProfile()
  const brandColors = profile?.brandKit?.colors || profile?.color_palette
  const style: Record<string, string> = {
    primaryHex: brandColors?.primary || '#d4a574',
    backgroundHex: brandColors?.background || brandColors?.secondary || '#0f0f0f',
    textHex: brandColors?.text || '#ffffff',
    accentHex: brandColors?.accent || brandColors?.primary || '#d4a574',
    fontStyle: 'bold sans-serif',
  }

  // Split user text — headline = first line, subtitle = ALL the rest
  const lines = userText.split('\n').filter(l => l.trim())
  let headline = lines[0] || userText
  if (headline.length > 60) {
    const cut = headline.lastIndexOf(' ', 60)
    headline = headline.slice(0, cut > 20 ? cut : 60)
  }
  const subtitle = lines.length > 1
    ? lines.slice(1).join('\n')
    : userText.slice(headline.length).trim()
  const overflowText = userText.replace(headline, '').replace(subtitle, '').trim()

  // Generate caption
  const captionPrompt = `
Gere a legenda (caption) para um post Instagram.
O CARD mostra: "${headline}" + "${subtitle}"
O texto COMPLETO do especialista é: "${userText.slice(0, 500)}"

A legenda deve:
1. Usar como HOOK uma frase impactante baseada no tema
2. No BODY incluir o conteudo completo do especialista (o que nao coube no card)
3. Fechar com CTA e hashtags

Retorne APENAS JSON:
{
  "hook": "primeira linha impactante",
  "body": "corpo com o conteudo completo + emojis + quebras de linha",
  "cta": "chamada para ação",
  "hashtags": "#h1 #h2 ... (20-30)"
}`

  let caption: Caption = { hook: headline, body: overflowText || subtitle, cta: '', hashtags: '' }
  try {
    const captionRes = await geminiCall({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemPrompt(tone, 'instagram', niche, voiceBlueprint),
      contents: [{ role: 'user', parts: [{ text: captionPrompt }] }],
    })
    const parsed = parseJson(getText(captionRes)) as Caption
    caption = { hook: parsed.hook || headline, body: parsed.body || subtitle, cta: parsed.cta || '', hashtags: parsed.hashtags || '' }
  } catch { /* use defaults */ }

  // Build palette from extracted colors
  const clonePalette = {
    primary: style.primaryHex || '#8b5cf6',
    secondary: style.backgroundHex || '#0f172a',
    accent: style.accentHex || '#f8fafc',
    background: style.backgroundHex || '#0f172a',
    text: style.textHex || '#ffffff',
  }

  const fs = (style.fontStyle || '').toLowerCase()
  const cloneFont = fs.includes('serif') && !fs.includes('sans') ? 'serif'
    : fs.includes('manuscri') || fs.includes('script') ? 'script'
    : 'sans-serif'

  return {
    headline,
    subtitle,
    caption,
    visualPrompt: '',
    imageUrl: clonedImageUrl,
    layout: 'minimal',
    generatedAt: new Date().toISOString(),
    clonePalette,
    cloneFont,
  }
}

// ── Stories (full generation) ──

export const generateStoriesCopy = async (
  inputs: StoriesInputs,
  onProgress?: (phase: string, pct: number) => void,
  voiceBlueprint?: string
): Promise<StoriesData> => {
  onProgress?.('Criando stories...', 20)

  const typesDesc = inputs.types.map(t =>
    t === 'content' ? 'conteúdo educativo/inspirador' :
    t === 'poll' ? 'enquete com 2-4 opções' :
    'caixinha de pergunta'
  ).join(', ')

  const prompt = `
Gere uma SEQUÊNCIA DE ${inputs.storyCount} STORIES para Instagram (formato vertical 1080x1920).
Tipos solicitados: ${typesDesc}

Retorne APENAS JSON:
{
  "slides": [
    {
      "id": 1,
      "type": "content|poll|question",
      "headline": "título forte até 40 chars",
      "body": "texto curto até 80 chars",
      "visualPrompt": "descrição da imagem de fundo vertical, cinematográfica, SEM texto",
      "questionText": "texto da caixinha de pergunta (só se type=question)",
      "pollQuestion": "pergunta da enquete (só se type=poll)",
      "pollOptions": ["opção 1", "opção 2"]
    }
  ],
  "caption": {
    "hook": "texto para compartilhar nos stories",
    "body": "contexto",
    "cta": "chamada",
    "hashtags": "",
    "altText": ""
  }
}

REGRAS:
- Story 1 = GANCHO (para o scroll)
- Stories intermediários = conteúdo/interação
- Último story = CTA
- Safe zones: 50px topo (nome do perfil), 250px base (respostas/CTA)
- Textos CURTOS e IMPACTANTES (vertical = pouco espaço)

DADOS:
- Tema: ${inputs.theme}
- Objetivo: ${inputs.objective}
- Nicho: ${inputs.niche}
- Tom: ${inputs.tone}
${inputs.baseText ? `\nCONTEÚDO BASE (use como referência para criar os stories):\n${inputs.baseText}` : ''}`

  onProgress?.('Gerando stories...', 50)

  const res = await geminiCall({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, 'instagram', inputs.niche, voiceBlueprint),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const parsed = parseJson(getText(res)) as { slides: StorySlide[]; caption: Caption }

  const slides: StorySlide[] = (parsed.slides || []).map((s: StorySlide, i: number) => ({
    ...s,
    id: i + 1,
    layout: 'minimal' as const,
  }))

  onProgress?.('Pronto!', 100)

  return {
    slides,
    caption: parsed.caption,
    generatedAt: new Date().toISOString(),
  }
}
