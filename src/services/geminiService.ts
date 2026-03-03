import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CarouselData, ProjectInputs, SlideData, Tone, Platform } from '../types'

let genAI: GoogleGenerativeAI | null = null

export const initGemini = (apiKey: string) => {
  genAI = new GoogleGenerativeAI(apiKey)
}

const buildSystemPrompt = (tone: Tone, platform: Platform, niche: string): string => `
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
`

export const generateCarouselCopy = async (
  inputs: ProjectInputs,
  onProgress?: (phase: string, pct: number) => void
): Promise<CarouselData> => {
  if (!genAI) throw new Error('Configure sua chave Gemini nas configurações')

  onProgress?.('Analisando estratégia...', 15)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(inputs.tone, inputs.platform, inputs.niche),
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
      "visualPrompt": "descrição ultra-detalhada da imagem: cenário, iluminação, composição, emoção, estilo fotográfico, cores, SEM texto na imagem",
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
- Texto Base/Referência: ${inputs.baseText}
- Número de Slides: ${inputs.slideCount}
- Plataforma: ${inputs.platform}
- Tom: ${inputs.tone}
- Nicho: ${inputs.niche}

O slide 1 deve ser a CAPA com gancho poderoso.
O slide ${inputs.slideCount} deve ser o FECHAMENTO com CTA emocional.
Os slides intermediários = uma ideia completa cada.
`

  onProgress?.('Gerando copy e estratégia...', 40)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  onProgress?.('Processando resultado...', 80)

  // Strip markdown if present
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(jsonText) as CarouselData

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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-preview-image-generation' })

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
- SEM texto, marcas d'água ou logos na imagem
- O rosto da pessoa deve ser claramente reconhecível e idêntico à foto original`
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
          text: `${visualPrompt}

Estilo: Fotografia cinematográfica profissional, emocional, alta qualidade.
Formato: ${formatDesc}.
SEM texto, marcas d'água ou logos na imagem.`
        }]
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    } as any)

    return extractImage(result)
  }
}
