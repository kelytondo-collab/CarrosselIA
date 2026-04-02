// Numerology calculation service — ported from Luminae (~/astroverbum/src/lib/numerology.ts)
// Cabalistic system: letter → number mapping

const LETTER_VALUES: Record<string, number> = {
  a: 1, i: 1, j: 1, q: 1, y: 1,
  b: 2, k: 2, r: 2,
  c: 3, g: 3, l: 3, s: 3,
  d: 4, m: 4, t: 4,
  e: 5, h: 5, n: 5, x: 5,
  u: 6, v: 6, w: 6,
  o: 7, z: 7,
  f: 8, p: 8,
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y'])

function reduceToSingleDigit(n: number): number {
  if (n === 11 || n === 22) return n
  if (n < 10) return n
  const sum = String(n).split('').reduce((acc, d) => acc + parseInt(d), 0)
  return reduceToSingleDigit(sum)
}

function reduceAlways(n: number): number {
  if (n < 10) return n
  const sum = String(n).split('').reduce((acc, d) => acc + parseInt(d), 0)
  return reduceAlways(sum)
}

function sumDigits(str: string): number {
  return str.split('').reduce((acc, ch) => {
    const d = parseInt(ch)
    return isNaN(d) ? acc : acc + d
  }, 0)
}

export function calcDestino(dateStr: string): number {
  const digits = dateStr.replace(/-/g, '')
  return reduceToSingleDigit(sumDigits(digits))
}

export function calcExpressao(fullName: string): number {
  const letters = fullName.toLowerCase().replace(/[^a-z]/g, '')
  const total = letters.split('').reduce((acc, ch) => acc + (LETTER_VALUES[ch] || 0), 0)
  return reduceToSingleDigit(total)
}

export function calcImpressao(fullName: string): number {
  const consonants = fullName.toLowerCase().replace(/[^a-z]/g, '').split('').filter(ch => !VOWELS.has(ch))
  const total = consonants.reduce((acc, ch) => acc + (LETTER_VALUES[ch] || 0), 0)
  return reduceAlways(total)
}

export function calcMotivacao(fullName: string): number {
  const vowels = fullName.toLowerCase().replace(/[^a-z]/g, '').split('').filter(ch => VOWELS.has(ch))
  const total = vowels.reduce((acc, ch) => acc + (LETTER_VALUES[ch] || 0), 0)
  return reduceToSingleDigit(total)
}

export function calcMissao(destino: number, expressao: number): number {
  return reduceToSingleDigit(destino + expressao)
}

export interface NumerologyProfile {
  destino: number
  expressao: number
  impressao: number
  motivacao: number
  missao: number
}

export function calcProfile(fullName: string, birthDate: string): NumerologyProfile {
  const destino = calcDestino(birthDate)
  const expressao = calcExpressao(fullName)
  const impressao = calcImpressao(fullName)
  const motivacao = calcMotivacao(fullName)
  const missao = calcMissao(destino, expressao)
  return { destino, expressao, impressao, motivacao, missao }
}

// Energy of the day
export function calcEnergyOfDay(date: Date = new Date()): number {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return calcDestino(dateStr)
}

// Energy of the month
export function calcEnergyOfMonth(date: Date = new Date()): number {
  const m = date.getMonth() + 1
  const y = date.getFullYear()
  return reduceToSingleDigit(sumDigits(`${y}${String(m).padStart(2, '0')}`))
}

// Personal day energy (birth date + current date)
export function calcPersonalDay(birthDate: string, date: Date = new Date()): number {
  const destino = calcDestino(birthDate)
  const dayEnergy = calcEnergyOfDay(date)
  return reduceToSingleDigit(destino + dayEnergy)
}

// Number meanings for display
export interface NumberMeaning {
  title: string
  keywords: string[]
  description: string
  communicationStyle: string
  contentSignature: string
  magnetism: string
  shadow: string
}

export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: {
    title: 'O Pioneiro',
    keywords: ['Lideranca', 'Independencia', 'Iniciativa', 'Coragem', 'Originalidade'],
    description: 'Lider nato. Abre caminhos onde ninguem viu. Inspira pela ousadia.',
    communicationStyle: 'Frases curtas e diretas. Abre com afirmacao forte. Ritmo acelerado, sem rodeios.',
    contentSignature: 'O conteudo que desafia e abre caminho. Provoca acao imediata.',
    magnetism: 'Puxa pela coragem. As pessoas sentem que ousam mais perto de voce.',
    shadow: 'Impaciencia, autoritarismo, dificuldade de ouvir.',
  },
  2: {
    title: 'O Diplomatico',
    keywords: ['Sensibilidade', 'Cooperacao', 'Intuicao', 'Empatia', 'Harmonia'],
    description: 'Conector emocional. Cria pontes entre pessoas e ideias.',
    communicationStyle: 'Tom acolhedor, perguntas que abrem reflexao. Ritmo suave com profundidade.',
    contentSignature: 'O conteudo que acolhe e conecta. Faz a pessoa sentir que nao esta sozinha.',
    magnetism: 'Atrai pela seguranca emocional. Perto de voce, as pessoas se sentem compreendidas.',
    shadow: 'Dependencia emocional, indecisao, auto-anulacao.',
  },
  3: {
    title: 'O Comunicador',
    keywords: ['Criatividade', 'Expressao', 'Entusiasmo', 'Alegria', 'Versatilidade'],
    description: 'Artista da palavra. Transforma qualquer tema em algo envolvente.',
    communicationStyle: 'Colorido, metaforas, storytelling natural. Ritmo variado e envolvente.',
    contentSignature: 'O conteudo que encanta e inspira. Transforma o complexo em belo.',
    magnetism: 'Atrai pela leveza. As pessoas se sentem mais vivas perto de voce.',
    shadow: 'Superficialidade, dispersao, medo do silencio.',
  },
  4: {
    title: 'O Construtor',
    keywords: ['Estrutura', 'Disciplina', 'Seguranca', 'Metodo', 'Confiabilidade'],
    description: 'O que constroi com base solida. Confiavel e metodico.',
    communicationStyle: 'Passo a passo claro. Listas, frameworks, processos. Tom seguro e didatico.',
    contentSignature: 'O conteudo que organiza o caos. Da estrutura ao que parecia impossivel.',
    magnetism: 'Atrai pela seguranca. As pessoas confiam em voce para guia-las.',
    shadow: 'Rigidez, perfeccionismo paralisante, medo de improvisar.',
  },
  5: {
    title: 'O Libertador',
    keywords: ['Liberdade', 'Aventura', 'Mudanca', 'Versatilidade', 'Ousadia'],
    description: 'Agente de mudanca. Quebra padroes e inspira transformacao.',
    communicationStyle: 'Dinamico, provocador, inquieto. Muda de angulo rapidamente.',
    contentSignature: 'O conteudo que sacode. Tira da zona de conforto sem pedir licenca.',
    magnetism: 'Atrai pela energia. As pessoas sentem que algo muda perto de voce.',
    shadow: 'Inconstancia, fuga de compromissos, excesso de estímulos.',
  },
  6: {
    title: 'O Mentor',
    keywords: ['Responsabilidade', 'Cuidado', 'Harmonia', 'Servico', 'Beleza'],
    description: 'O que cuida e orienta. Referencia de equilibrio e sabedoria pratica.',
    communicationStyle: 'Tom caloroso, conselhos praticos. Fala como quem se importa de verdade.',
    contentSignature: 'O conteudo que nutre. Voce sai mais forte do que entrou.',
    magnetism: 'Atrai pelo cuidado genuino. As pessoas se sentem cuidadas por voce.',
    shadow: 'Controle disfarçado de cuidado, auto-sacrificio, perfeccionismo estetico.',
  },
  7: {
    title: 'O Mistico',
    keywords: ['Sabedoria', 'Introspeccao', 'Analise', 'Profundidade', 'Espiritualidade'],
    description: 'O pensador profundo. Ve o que ninguem ve e traduz em clareza.',
    communicationStyle: 'Reflexivo, pausado, com camadas de significado. Cada frase tem peso.',
    contentSignature: 'O conteudo que faz pensar. Nao da respostas faceis — da verdade.',
    magnetism: 'Atrai pelo misterio. As pessoas querem entender o que voce sabe.',
    shadow: 'Isolamento, arrogancia intelectual, dificuldade de se abrir.',
  },
  8: {
    title: 'O Realizador',
    keywords: ['Poder', 'Abundancia', 'Estrategia', 'Autoridade', 'Resultado'],
    description: 'O que faz acontecer. Transforma visao em resultado tangivel.',
    communicationStyle: 'Assertivo, orientado a resultado. Fala de impacto, numeros, transformacao concreta.',
    contentSignature: 'O conteudo que entrega resultado. Sem rodeios, sem enrolacao.',
    magnetism: 'Atrai pelo poder. As pessoas querem o resultado que voce ja tem.',
    shadow: 'Workaholismo, frieza emocional, confundir valor com status.',
  },
  9: {
    title: 'O Humanitario',
    keywords: ['Compaixao', 'Universalidade', 'Sabedoria', 'Altruismo', 'Visao'],
    description: 'O visionario com alma. Ve o quadro completo e inspira evolucao.',
    communicationStyle: 'Elevado, inspirador, com visao ampla. Fala para a humanidade, nao so para um.',
    contentSignature: 'O conteudo que eleva. Faz a pessoa se sentir parte de algo maior.',
    magnetism: 'Atrai pela grandeza. As pessoas se sentem elevadas perto de voce.',
    shadow: 'Dispersao por causas alheias, dificuldade no concreto, escapismo espiritual.',
  },
  11: {
    title: 'O Iluminador',
    keywords: ['Inspiracao', 'Intuicao', 'Visao', 'Sensibilidade', 'Missao'],
    description: 'Canal de mensagens profundas. Numero mestre — intensidade amplificada.',
    communicationStyle: 'Canalizado, quase profetico. Palavras que arrepiam e ficam na memoria.',
    contentSignature: 'O conteudo que desperta. Nao ensina — ativa algo que ja estava la.',
    magnetism: 'Atrai pelo despertar. As pessoas sentem que voce ve a alma delas.',
    shadow: 'Ansiedade, pressao por perfeicao, medo da propria luz.',
  },
  22: {
    title: 'O Mestre Construtor',
    keywords: ['Visao', 'Manifestacao', 'Legado', 'Estrutura', 'Impacto'],
    description: 'Combina visao 11 com construcao 4. Materializa o impossivel.',
    communicationStyle: 'Visionario e pratico ao mesmo tempo. Mostra o sonho E o caminho.',
    contentSignature: 'O conteudo que constroi legado. Mostra como o impossivel se torna real.',
    magnetism: 'Atrai pelo legado. As pessoas querem construir junto com voce.',
    shadow: 'Carga imensa, auto-cobranca, dificuldade de delegar.',
  },
}

// Content type suggestion based on day energy
export function suggestContentType(energy: number): { type: string; label: string; description: string } {
  const suggestions: Record<number, { type: string; label: string; description: string }> = {
    1: { type: 'provocacao', label: 'Provocacao', description: 'Dia de liderar. Publique algo que desafie o status quo.' },
    2: { type: 'conexao', label: 'Conexao', description: 'Dia de acolher. Conte uma historia que gere identificacao.' },
    3: { type: 'criatividade', label: 'Criatividade', description: 'Dia de criar. Experimente um formato novo e ousado.' },
    4: { type: 'ensino', label: 'Ensino', description: 'Dia de ensinar. Publique um passo a passo ou framework.' },
    5: { type: 'transformacao', label: 'Transformacao', description: 'Dia de sacudir. Quebre uma crenca limitante.' },
    6: { type: 'mentoria', label: 'Mentoria', description: 'Dia de cuidar. De um conselho profundo e pratico.' },
    7: { type: 'reflexao', label: 'Reflexao', description: 'Dia de profundidade. Compartilhe um insight revelador.' },
    8: { type: 'venda', label: 'Venda', description: 'Dia de resultado. Mostre prova social ou case de sucesso.' },
    9: { type: 'inspiracao', label: 'Inspiracao', description: 'Dia de elevar. Publique algo que inspire visao de futuro.' },
    11: { type: 'despertar', label: 'Despertar', description: 'Dia mestre. Canalize algo profundo e transformador.' },
    22: { type: 'legado', label: 'Legado', description: 'Dia mestre. Compartilhe sua visao de construcao e impacto.' },
  }
  return suggestions[energy] || suggestions[1]
}
