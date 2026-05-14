import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CarouselData, ProjectInputs, SlideData, Tone, Platform, PostData, PostInputs, StoriesData, StoriesInputs, StorySlide, Caption } from '../types'
import { getDefaultProfile } from './storageService'

let genAI: GoogleGenerativeAI | null = null

export const initGemini = (apiKey: string) => {
  genAI = new GoogleGenerativeAI(apiKey)
}

// Helper: parse JSON com proteção contra respostas malformadas do Gemini
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJsonParse<T = any>(text: string, context: string): T {
  // Tenta extrair JSON de dentro do texto (Gemini às vezes retorna texto extra)
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Tenta encontrar o JSON no texto
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  const toParse = jsonMatch ? jsonMatch[0] : cleaned

  try {
    return JSON.parse(toParse) as T
  } catch (e) {
    const preview = toParse.slice(0, 200)
    throw new Error(`Erro ao processar resposta do Gemini (${context}). A IA retornou um formato inválido. Tente novamente.\n\nDetalhe: ${e instanceof Error ? e.message : 'JSON inválido'}\nResposta: ${preview}...`)
  }
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

export const generateCarouselCopy = async (
  inputs: ProjectInputs,
  onProgress?: (phase: string, pct: number) => void,
  voiceBlueprint?: string
): Promise<CarouselData> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Analisando estratégia...', 15)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, inputs.platform, inputs.niche, voiceBlueprint),
  })

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
    "hook": "1 frase NOVA que abre um loop ou faz uma pergunta que provoca. PROIBIDO copiar o título de qualquer slide (máx 15 palavras).",
    "body": "MÍNIMO 4 FRASES COMPLETAS, MÍNIMO 250 CARACTERES. UMA frase só ou 2 frases = REJEITADO. Ângulo DIFERENTE dos slides — NÃO resuma cards, NÃO use as mesmas palavras dos slides. Escolha UMA abordagem e DESENVOLVA em 4+ frases: (a) pergunta loop + provocação + consequência + reframe, (b) confissão pessoal + espelho + dor não-dita + virada, (c) provocação de crença + por quê dói + o que ninguém contou + reframe, (d) cena/contexto + tensão + virada + insight. Entre 250 e 600 caracteres totais. Use \\n entre frases. EXEMPLO de estrutura: 'Você já parou pra ver quantas vezes repete o mesmo padrão?\\n\\nA gente acha que é falta de esforço.\\n\\nMas no fundo é uma escolha invisível rodando há anos.\\n\\nQuando você vê o programa, ele perde força.'",
    "cta": "Comenta [PALAVRA] que te envio [BENEFÍCIO]",
    "hashtags": "#hashtag1 #hashtag2 ... (máx 15)",
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

REGRA DA LEGENDA — CRÍTICA:
A legenda É UMA CAMADA NOVA, NÃO um resumo. Os slides ENTREGAM o conteúdo; a legenda DESACOMODA o leitor.
PROIBIDO: copiar headlines, copiar subtitles, repetir frases dos slides, parafrasear o que está nos cards.
OBRIGATÓRIO: ângulo NOVO — pergunta que abre loop, consequência implícita, contexto pessoal, ou provocação que mexe com crença.
TAMANHO: o body precisa ter 3 a 4 frases (NUNCA uma frase só). Pense entre 60 e 90 palavras no body. Use quebras de linha entre frases pra respirar. Depois fecha com CTA direto.
Se a legenda parecer um resumo dos slides, REESCREVA até virar uma camada de provocação que complementa.
`

  onProgress?.('Gerando copy e estratégia...', 40)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  onProgress?.('Processando resultado...', 80)

  // Strip markdown if present
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse<CarouselData>(jsonText, 'carrossel')

  // Validate strategy fields
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

  // Validate caption fields
  if (!parsed.caption || typeof parsed.caption !== 'object') {
    parsed.caption = { hook: '', body: '', cta: '', hashtags: '' }
  } else {
    parsed.caption.hook = parsed.caption.hook || ''
    parsed.caption.body = parsed.caption.body || ''
    parsed.caption.cta = parsed.caption.cta || ''
    parsed.caption.hashtags = parsed.caption.hashtags || ''
  }

  // Retry body if it came back too short (Gemini sometimes returns 1 sentence)
  if ((parsed.caption.body || '').length < 200) {
    try {
      onProgress?.('Reforçando legenda...', 90)
      const longerBody = await regenerateCaptionSection(
        'body',
        parsed.caption,
        { niche: inputs.niche, tone: inputs.tone, theme: inputs.theme },
      )
      if (longerBody && longerBody.length > (parsed.caption.body || '').length) {
        parsed.caption.body = longerBody
      }
    } catch { /* mantém o body curto se falhar */ }
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
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Analisando conteúdo...', 15)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você tem DUAS funções diferentes nesta tarefa:

1) PARA OS SLIDES — você é um FORMATADOR.
   - NÃO reescreva NENHUMA frase do texto original.
   - Use as palavras EXATAS do especialista. NÃO troque vocabulário. NÃO "melhore".
   - Apenas DISTRIBUA o conteúdo pelos slides mantendo a progressão lógica.

2) PARA A LEGENDA — você é um COPYWRITER que ESCREVE NOVO.
   - A legenda é uma CAMADA NOVA, NÃO um resumo dos slides.
   - PROIBIDO copiar frases, headlines ou subtitles dos slides na legenda.
   - PROIBIDO parafrasear o conteúdo dos cards.
   - A legenda deve INSTIGAR: pergunta que abre loop, consequência implícita, confissão pessoal, ou provocação que mexe com crença.
   - Use o TOM e o VOCABULÁRIO do especialista (que estão no texto), mas com ÂNGULO DIFERENTE.

Retorne APENAS JSON válido sem markdown.`,
  })

  const prompt = `
TEXTO DO ESPECIALISTA (use EXATAMENTE estas palavras nos SLIDES):
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
    "hook": "1 frase NOVA que abre loop ou provoca. PROIBIDO copiar título de slide. Use o tom do especialista, mas é frase ORIGINAL (máx 15 palavras).",
    "body": "MÍNIMO 4 FRASES COMPLETAS, MÍNIMO 250 CARACTERES. UMA frase só ou 2 frases = REJEITADO. Ângulo DIFERENTE dos slides — NÃO resuma cards, NÃO use as mesmas frases. Escolha UMA abordagem e DESENVOLVA em 4+ frases: (a) pergunta loop + provocação + consequência + reframe, (b) confissão pessoal + espelho + dor não-dita + virada, (c) provocação de crença + por quê dói + o que ninguém contou + reframe, (d) cena/contexto + tensão + virada + insight. Entre 250 e 600 caracteres totais. Use \\n entre frases. EXEMPLO de estrutura: 'Você já parou pra ver quantas vezes repete o mesmo padrão?\\n\\nA gente acha que é falta de esforço.\\n\\nMas no fundo é uma escolha invisível rodando há anos.\\n\\nQuando você vê o programa, ele perde força.'",
    "cta": "chamada para ação direta — pode usar a energia do CTA do texto, mas reescreva no formato 'Comenta [PALAVRA] que te envio [BENEFÍCIO]' ou similar curto",
    "hashtags": "#hashtag1 #hashtag2 ... (máx 15)",
    "altText": "descrição acessível"
  },
  "manychat": { "keyword": "", "flow1": "", "flow2": "", "flow3": "" },
  "seoKeywords": []
}

IMPORTANTE:
- O slide 1 = capa (hook mais forte do texto). Slide ${inputs.slideCount} = fechamento/CTA do texto.
- NOS SLIDES: NÃO reescreva. NÃO melhore. DISTRIBUA palavras exatas.
- NA LEGENDA: ESCREVA NOVO. A legenda complementa, NÃO repete. Se a legenda parecer um resumo dos slides, REFAÇA até virar uma camada de provocação.`

  onProgress?.('Formatando em slides...', 40)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  onProgress?.('Processando resultado...', 80)

  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse<CarouselData>(jsonText, 'carrossel')

  // Retry body if Gemini returned too short
  if (parsed.caption && (parsed.caption.body || '').length < 200) {
    try {
      onProgress?.('Reforçando legenda...', 90)
      const longerBody = await regenerateCaptionSection(
        'body',
        parsed.caption,
        { niche: inputs.niche, tone: inputs.tone },
      )
      if (longerBody && longerBody.length > (parsed.caption.body || '').length) {
        parsed.caption.body = longerBody
      }
    } catch { /* keeps short body if retry fails */ }
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

// ── Regenerate single caption section ──

export const regenerateCaptionSection = async (
  section: 'hook' | 'body' | 'cta' | 'hashtags',
  currentCaption: Caption,
  context: { niche: string; tone: Tone; theme?: string },
  voiceBlueprint?: string,
): Promise<string> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um copywriter expert para Instagram. Nicho: ${context.niche}. Tom: ${context.tone}.
${voiceBlueprint ? `BLUEPRINT DA VOZ:\n${voiceBlueprint}` : ''}
Retorne APENAS o texto solicitado, sem JSON, sem aspas, sem marcadores.`,
  })

  const sectionDesc: Record<string, string> = {
    hook: 'a PRIMEIRA LINHA da legenda — 1 frase NOVA que abre um loop ou provoca. PROIBIDO copiar título de slide. Frase original que para o scroll (máx 15 palavras).',
    body: `o CORPO da legenda. REGRAS DE TAMANHO INEGOCIÁVEIS:
- MÍNIMO 4 frases completas, MÍNIMO 250 caracteres. Pode ir até 600 chars.
- UMA frase só é REJEITADO. Duas frases é REJEITADO. Três frases é o piso aceitável.
- Use quebra de linha (\\n) entre frases para respirar.

CONTEÚDO:
- Ângulo NOVO, DIFERENTE dos slides. PROIBIDO resumir cards ou parafrasear slides.
- Escolha UMA destas abordagens e DESENVOLVA em 4+ frases (não uma frase só por abordagem):
  (a) Pergunta que abre loop + provocação que aprofunda + consequência implícita + reframe
  (b) Confissão pessoal + espelho no leitor + dor não-dita + virada/insight
  (c) Provocação que questiona crença + por quê dói + o que ninguém te contou + reframe
  (d) Cena/contexto + tensão + virada + insight final

EXEMPLO DE BODY ACEITÁVEL (estrutura, não conteúdo):
"Você já parou pra ver quantas vezes repete o mesmo padrão sem perceber?\\n\\nA gente acha que é falta de esforço, de foco, de disciplina.\\n\\nMas no fundo é uma escolha invisível rodando há anos, herdada de quem veio antes.\\n\\nQuando você vê o programa, ele perde força. Antes disso, é você contra você mesma."`,
    cta: 'a CHAMADA PARA AÇÃO — curta e direta. Ex: "Comenta [PALAVRA] que te envio..."',
    hashtags: '10-15 HASHTAGS relevantes para o nicho, separadas por espaço.',
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

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

// ── FORMAT-ONLY for Post ──

export const generatePostFormat = async (
  baseText: string,
  niche: string,
  onProgress?: (phase: string, pct: number) => void,
): Promise<PostData> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Formatando post...', 20)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um FORMATADOR, NÃO um escritor.
REGRAS: NÃO reescreva. Use as palavras EXATAS. DISTRIBUA o conteúdo em headline + subtitle + caption.
Retorne APENAS JSON válido.`,
  })

  const prompt = `
TEXTO DO ESPECIALISTA:
---
${baseText}
---

Formate este texto como POST ESTÁTICO Instagram (1080x1350, formato 4:5 vertical).
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

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse(jsonText, 'gemini')

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
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Formatando stories...', 20)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `Você é um FORMATADOR PURO, NÃO um escritor.
REGRA INEGOCIÁVEL: NÃO reescreva NENHUMA palavra. NÃO resuma. NÃO parafraseie. NÃO "melhore".
Use as palavras EXATAS do especialista, na ordem original. Apenas DISTRIBUA o texto entre os stories.
Retorne APENAS JSON válido.`,
  })

  const prompt = `
TEXTO DO ESPECIALISTA (use EXATAMENTE estas palavras, nada de reescrever):
---
${baseText}
---

Distribua o texto acima em ${storyCount} STORIES (1080x1920 vertical) SEM MODIFICAR uma palavra sequer.

REGRAS DE DISTRIBUIÇÃO:
1. NÃO trunque frases. NÃO corte palavras. NÃO substitua sinônimos. NÃO "encurte".
2. Se uma frase tem 200 caracteres, ela vai inteira pro headline OU body — NÃO tenta cortar pra "caber em 40 chars".
3. Quebre o texto pelos PARÁGRAFOS ou IDEIAS NATURAIS. Cada story = um parágrafo/ideia completa do original.
4. Dentro de cada story: a PRIMEIRA frase do bloco vai em "headline"; o RESTO do bloco vai em "body" (preserve quebras de linha com \\n).
5. Se o texto tem MAIS blocos que ${storyCount}, junte blocos pequenos. Se tem MENOS, mantenha o número de blocos reais (NÃO inventa).

EXTRAIA do texto (preservando exato):
{
  "slides": [
    { "id": 1, "type": "content", "headline": "primeira frase EXATA do bloco (sem cortar, sem reescrever)", "body": "resto do bloco EXATO, com quebras de linha preservadas", "visualPrompt": "descrição visual fotográfica do tema deste story específico — pessoa, cenário, iluminação, emoção, sem texto na imagem" }
  ],
  "caption": {
    "hook": "EXTRAIA do texto — primeira frase impactante",
    "body": "EXTRAIA do texto — parte central, palavras exatas",
    "cta": "EXTRAIA do texto — chamada para ação se houver",
    "hashtags": "",
    "altText": ""
  }
}

Story 1 = gancho (início do texto). Último = fechamento/CTA. Intermediários = conteúdo principal.
Texto INTEGRAL, palavras EXATAS, SEM REESCREVER.`

  onProgress?.('Processando...', 60)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse(jsonText, 'gemini')

  const slides: StorySlide[] = (parsed.slides || []).map((s: StorySlide, i: number) => ({
    ...s,
    id: i + 1,
    layout: 'minimal' as const,
  }))

  onProgress?.('Pronto!', 100)

  return { slides, caption: parsed.caption, generatedAt: new Date().toISOString() }
}

export const generateVoiceBlueprint = async (
  answers: Record<string, string>,
  name: string,
  niche: string
): Promise<string> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

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

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

// Extrai base64 puro (sem o prefixo data:image/...;base64,)
function stripDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, '')
}

// Detecta o mimeType de um data URL
function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match ? match[1] : 'image/jpeg'
}

// Extrai a imagem gerada da resposta Gemini
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImage(result: any): string {
  let imageUri = ''
  for (const part of result.response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUri = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      break
    }
  }
  if (!imageUri) throw new Error('Imagem não gerada pelo modelo')
  return imageUri
}

export const generateSlideImage = async (
  visualPrompt: string,
  format: '1:1' | '9:16' | '4:5' = '4:5',
  expertPhotoBase64?: string // Se fornecido → image-to-image mantendo o rosto
): Promise<string> => {
  if (!genAI) throw new Error('Configure sua chave Gemini')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

  const formatDesc = format === '9:16' ? 'vertical retrato (9:16)'
    : format === '4:5' ? 'vertical (4:5)'
    : 'quadrado (1:1)'

  if (expertPhotoBase64) {
    // ── IMAGE-TO-IMAGE: mantém o rosto do expert, muda o cenário ──
    const mimeType = getMimeType(expertPhotoBase64)
    const base64 = stripDataUrl(expertPhotoBase64)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.generateContent({
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
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    } as any)

    return extractImage(result)
  } else {
    // ── TEXT-TO-IMAGE: sem foto de referência ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.generateContent({
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
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    } as any)

    return extractImage(result)
  }
}

// ── Post Estático ──

export const generatePostCopy = async (
  inputs: PostInputs,
  onProgress?: (phase: string, pct: number) => void,
  voiceBlueprint?: string
): Promise<PostData> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Criando post estático...', 20)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, 'instagram', inputs.niche, voiceBlueprint),
  })

  const prompt = `
Gere um POST ESTÁTICO para Instagram (formato 4:5 vertical, 1080x1350).
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

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse(jsonText, 'gemini')

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
  if (!genAI) throw new Error('Configure sua chave Gemini')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const mimeType = getMimeType(imageBase64)
  const base64 = stripDataUrl(imageBase64)

  const result = await model.generateContent({
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

  const text = result.response.text().trim()
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  return safeJsonParse(jsonText, 'análise')
}

export const generateFromReference = async (
  analysis: { colors: string[]; layout: string; typography: string; mood: string; suggestion: string },
  theme: string,
  niche: string,
  tone: Tone,
  voiceBlueprint?: string,
  userContent?: string
): Promise<PostData> => {
  if (!genAI) throw new Error('Configure sua chave Gemini')

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(tone, 'instagram', niche, voiceBlueprint),
  })

  const contentBlock = userContent
    ? `\nIMPORTANTE: O usuario forneceu SEU PROPRIO conteudo. Use EXATAMENTE este texto como base para headline e subtitle. NAO reescreva, apenas formate para caber no post:\n"""\n${userContent}\n"""\n`
    : `\nTema: ${theme}\n`

  const prompt = `
Crie um POST ESTÁTICO Instagram (1080x1350, formato 4:5 vertical) INSPIRADO nesta análise de referência:
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

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse(jsonText, 'gemini')

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
  if (!genAI) throw new Error('Configure sua chave Gemini')
  if (!userPhotoBase64) throw new Error('Envie sua foto para clonar')

  const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })
  const refMime = getMimeType(referenceBase64)
  const refData = stripDataUrl(referenceBase64)
  const userMime = getMimeType(userPhotoBase64)
  const userData = stripDataUrl(userPhotoBase64)

  // CLONE em 2 passos: (1) descrever referência → (2) gerar foto sem ver a referência
  // Isso evita que o Gemini copie texto da referência na imagem gerada
  let clonedImageUrl: string
  try {
    // PASSO 1: Modelo de texto analisa a referência e extrai APENAS elementos fotográficos
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const descResult = await textModel.generateContent({
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

    const photoDescription = descResult.response?.text?.() || 'Professional portrait, confident pose, dark background, warm cinematic lighting, half-body shot'
    console.log('[CLONE] Photo description:', photoDescription.slice(0, 200))

    // PASSO 2: Gerar foto da pessoa do usuário baseado na DESCRIÇÃO (sem ver a referência)
    const imageResult = await imageModel.generateContent({
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

Output: 1080x1350 portrait photograph (4:5 ratio). Cinematic quality. Absolutely no text or graphics.`
          }
        ]
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    } as any)

    clonedImageUrl = extractImage(imageResult)
  } catch (imgErr: unknown) {
    // Retry with simple prompt (no reference at all)
    try {
      const retryResult = await imageModel.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: userMime, data: userData } },
            { text: `Create a professional portrait photograph of this person. Dark background, warm cinematic lighting, confident professional pose, half-body shot. Output ONLY a clean photograph — absolutely no text, no graphics, no overlays, no watermarks. Just a raw photo. 1080x1350 portrait (4:5 ratio).` }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
      } as any)
      clonedImageUrl = extractImage(retryResult)
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

  // Step 2: Split user text — headline = first line, subtitle = ALL the rest (card auto-scales font)
  const lines = userText.split('\n').filter(l => l.trim())
  // Headline: first line (or first sentence up to 60 chars)
  let headline = lines[0] || userText
  if (headline.length > 60) {
    const cut = headline.lastIndexOf(' ', 60)
    headline = headline.slice(0, cut > 20 ? cut : 60)
  }
  // Subtitle: EVERYTHING else — the card will auto-scale the font to fit
  const subtitle = lines.length > 1
    ? lines.slice(1).join('\n')
    : userText.slice(headline.length).trim()
  // Everything that didn't fit on the card goes to caption body
  const overflowText = userText.replace(headline, '').replace(subtitle, '').trim()

  // Generate caption that includes the overflow text
  const textModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(tone, 'instagram', niche, voiceBlueprint),
  })

  const captionPrompt = `
Gere a legenda (caption) CURTA para um post Instagram.
O CARD já mostra: "${headline}" + "${subtitle}"

A legenda NÃO repete o que está no card. Ela COMPLEMENTA com um insight rápido e chama pra ação.

Regras:
1. HOOK: 1 frase curta e direta (máx 15 palavras)
2. BODY: 2-3 frases que complementam SEM repetir o card. Máx 50 palavras. Sem emojis excessivos.
3. CTA: chamada para ação curta e direta
4. Máx 15 hashtags

Retorne APENAS JSON:
{
  "hook": "frase curta que para o scroll",
  "body": "2-3 frases complementares e diretas",
  "cta": "chamada para ação",
  "hashtags": "#h1 #h2 ... (máx 15)"
}`

  let caption = { hook: headline, body: overflowText || subtitle, cta: '', hashtags: '' }
  try {
    const captionResult = await textModel.generateContent(captionPrompt)
    const captionText = captionResult.response.text().trim()
    const jsonText = captionText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = safeJsonParse(jsonText, 'gemini')
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

  // Map font style to available font
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

// ── Stories ──

export const generateStoriesCopy = async (
  inputs: StoriesInputs,
  onProgress?: (phase: string, pct: number) => void,
  voiceBlueprint?: string
): Promise<StoriesData> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Criando stories...', 20)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, 'instagram', inputs.niche, voiceBlueprint),
  })

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

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = safeJsonParse(jsonText, 'gemini')

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
