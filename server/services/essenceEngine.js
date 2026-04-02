// Essence Engine — ported from Luminae (~/astroverbum/src/lib/)
// Numerology + Zodiac/Venus + Creative Essence for demo carousel generation

// ============================================================
// NUMEROLOGY (from numerology.ts)
// ============================================================

const LETTER_VALUES = {
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

function reduceToSingleDigit(n) {
  if (n === 11 || n === 22) return n
  if (n < 10) return n
  const sum = String(n).split('').reduce((acc, d) => acc + parseInt(d), 0)
  return reduceToSingleDigit(sum)
}

function reduceAlways(n) {
  if (n < 10) return n
  const sum = String(n).split('').reduce((acc, d) => acc + parseInt(d), 0)
  return reduceAlways(sum)
}

function sumDigits(str) {
  return str.split('').reduce((acc, ch) => {
    const d = parseInt(ch)
    return isNaN(d) ? acc : acc + d
  }, 0)
}

function calcDestino(dateStr) {
  const digits = dateStr.replace(/-/g, '')
  return reduceToSingleDigit(sumDigits(digits))
}

function calcExpressao(fullName) {
  const letters = fullName.toLowerCase().replace(/[^a-z]/g, '')
  const total = letters.split('').reduce((acc, ch) => acc + (LETTER_VALUES[ch] || 0), 0)
  return reduceToSingleDigit(total)
}

function calcImpressao(fullName) {
  const consonants = fullName.toLowerCase().replace(/[^a-z]/g, '').split('').filter(ch => !VOWELS.has(ch))
  const total = consonants.reduce((acc, ch) => acc + (LETTER_VALUES[ch] || 0), 0)
  return reduceAlways(total)
}

function calcMotivacao(fullName) {
  const vowels = fullName.toLowerCase().replace(/[^a-z]/g, '').split('').filter(ch => VOWELS.has(ch))
  const total = vowels.reduce((acc, ch) => acc + (LETTER_VALUES[ch] || 0), 0)
  return reduceToSingleDigit(total)
}

function calcMissao(destino, expressao) {
  return reduceToSingleDigit(destino + expressao)
}

export function calcProfile(fullName, birthDate) {
  const destino = calcDestino(birthDate)
  const expressao = calcExpressao(fullName)
  const impressao = calcImpressao(fullName)
  const motivacao = calcMotivacao(fullName)
  const missao = calcMissao(destino, expressao)
  return { destino, expressao, impressao, motivacao, missao }
}

// ============================================================
// VENUS SIGN (from zodiac.ts)
// ============================================================

const VENUS_SIGNS = {
  'Áries': {
    name: 'Vênus em Áries',
    magnetism: 'Magnético pela espontaneidade e coragem. Atrai por ser direto, autêntico e sem filtro.',
    contentTone: 'Urgente, ousado, provocativo. Faz o público agir imediatamente.',
    attractionStyle: 'Você atrai pelo desafio e pela energia de "quem ousar, conquista".',
    formats: 'Vídeos curtos com impacto, posts de 1 frase poderosa, lives espontâneas.',
  },
  'Touro': {
    name: 'Vênus em Touro',
    magnetism: 'Magnético pela sensorialidade e confiança. Atrai pelo que é belo, sólido e de valor real.',
    contentTone: 'Calmo, sensorial, luxuoso. Cria desejo e confiança ao mesmo tempo.',
    attractionStyle: 'Você atrai por mostrar resultados tangíveis, beleza estética e consistência.',
    formats: 'Fotos de alta qualidade, tutoriais detalhados, conteúdo de bastidores bonito.',
  },
  'Gêmeos': {
    name: 'Vênus em Gêmeos',
    magnetism: 'Magnético pela inteligência e wit. Atrai pela conversa, pela leveza e pelo humor inteligente.',
    contentTone: 'Dinâmico, curioso, leve. Educa enquanto entretém, sem pesar.',
    attractionStyle: 'Você atrai por fazer o público pensar de forma diferente e se sentir mais inteligente.',
    formats: 'Carrosséis informativos, threads, perguntas e respostas, podcasts, duetos.',
  },
  'Câncer': {
    name: 'Vênus em Câncer',
    magnetism: 'Magnético pelo acolhimento e profundidade emocional. Atrai por fazer o outro se sentir visto.',
    contentTone: 'Íntimo, protetor, nostálgico. Cria laços emocionais duradouros.',
    attractionStyle: 'Você atrai por criar um espaço seguro onde o público se sente compreendido.',
    formats: 'Histórias pessoais, depoimentos, conteúdo sobre família/comunidade.',
  },
  'Leão': {
    name: 'Vênus em Leão',
    magnetism: 'Magnético pelo carisma e pela grandiosidade. Atrai pela presença que ilumina qualquer ambiente.',
    contentTone: 'Grandioso, celebrativo, inspirador. Faz o público se sentir especial.',
    attractionStyle: 'Você atrai por celebrar a vida e o público. Seu conteúdo é uma performance magnética.',
    formats: 'Vídeos com presença forte, bastidores glamourosos, celebrações.',
  },
  'Virgem': {
    name: 'Vênus em Virgem',
    magnetism: 'Magnético pela precisão e pelo cuidado genuíno. Atrai por dar atenção aos detalhes.',
    contentTone: 'Prático, útil, cuidadoso. Transforma a vida real do público com informação aplicável.',
    attractionStyle: 'Você atrai por ser o especialista em quem o público confia para resolver problemas reais.',
    formats: 'Guias passo a passo, checklists, análises detalhadas.',
  },
  'Libra': {
    name: 'Vênus em Libra',
    magnetism: 'Magnético pela elegância e pelo equilíbrio. Atrai pela beleza, justiça e harmonia que irradia.',
    contentTone: 'Harmonioso, estético, diplomático. Cria conexão e beleza em tudo que toca.',
    attractionStyle: 'Você atrai por fazer o público se sentir valorizado, ouvido e em harmonia.',
    formats: 'Conteúdo visualmente impecável, temas de relacionamentos, colaborações.',
  },
  'Escorpião': {
    name: 'Vênus em Escorpião',
    magnetism: 'Magnético pelo mistério e pela intensidade. Atrai por ir fundo onde outros têm medo.',
    contentTone: 'Intenso, revelador, transformador. Expõe verdades que mexem com as pessoas.',
    attractionStyle: 'Você atrai por revelar o que está nas sombras, criando fascinação e lealdade profunda.',
    formats: 'Conteúdo sobre tabus, bastidores íntimos, verdades difíceis.',
  },
  'Sagitário': {
    name: 'Vênus em Sagitário',
    magnetism: 'Magnético pelo otimismo e pela visão expansiva. Atrai por abrir mundos e possibilidades.',
    contentTone: 'Aventureiro, filosófico, esperançoso. Inspira o público a sonhar maior.',
    attractionStyle: 'Você atrai por ser o guia que mostra que é possível ir além.',
    formats: 'Vlogs de experiências, conteúdo filosófico, storytelling de jornadas.',
  },
  'Capricórnio': {
    name: 'Vênus em Capricórnio',
    magnetism: 'Magnético pela autoridade e pelo resultado comprovado. Atrai pela solidez e pelo legado.',
    contentTone: 'Sério, estruturado, ambicioso. Faz o público sentir que aprende com quem chegou lá.',
    attractionStyle: 'Você atrai por demonstrar expertise real e resultados concretos.',
    formats: 'Estudos de caso, resultados comprovados, conteúdo sobre metas e conquistas.',
  },
  'Aquário': {
    name: 'Vênus em Aquário',
    magnetism: 'Magnético pela originalidade e pela visão de futuro. Atrai por ser diferente de todos.',
    contentTone: 'Inovador, coletivo, vanguardista. Faz o público se sentir parte de algo maior.',
    attractionStyle: 'Você atrai por quebrar padrões e criar senso de comunidade.',
    formats: 'Conteúdo sobre inovação, comunidade, causas sociais, formatos experimentais.',
  },
  'Peixes': {
    name: 'Vênus em Peixes',
    magnetism: 'Magnético pela empatia transcendente. Atrai por tocar a alma onde as palavras não chegam.',
    contentTone: 'Poético, espiritual, onírico. Cria experiências que o público carrega para sempre.',
    attractionStyle: 'Você atrai por ser um espelho da alma do público.',
    formats: 'Conteúdo poético, espiritual, arte, músicas, histórias metafóricas.',
  },
}

// NUMBER_MEANINGS — full version for essence engine
const NUMBER_MEANINGS = {
  1: {
    title: 'O Pioneiro',
    keywords: ['Liderança', 'Independência', 'Iniciativa', 'Coragem'],
    communicationStyle: 'Frases curtas e diretas. Abre com afirmação forte, não com pergunta. Ritmo acelerado, sem rodeios.',
    woundPattern: 'Ferida de ter que fazer tudo sozinho. De não poder ser frágil.',
    authorityType: 'Autoridade de quem FEZ primeiro. Não teoriza — mostra o caminho porque já andou nele.',
    contentSignature: 'Conteúdo que INICIA movimento. Provoca ação imediata.',
    magnetism: 'Puxa pela coragem. As pessoas sentem que perto desse número elas OUSAM mais.',
    shadow: 'Isolamento por não saber pedir ajuda. Arrogância disfarçada de autossuficiência.',
    shadowKeywords: ['Solidão', 'Controle', 'Impaciência'],
  },
  2: {
    title: 'O Diplomata',
    keywords: ['Harmonia', 'Cooperação', 'Intuição', 'Empatia'],
    communicationStyle: 'Frases que incluem o outro. Tom conversacional, como se estivesse ao lado.',
    woundPattern: 'Ferida de ter se anulado para manter a paz. De ter sido invisível enquanto cuidava de todos.',
    authorityType: 'Autoridade de quem ENTENDE o outro profundamente. Lidera porque as pessoas se sentem vistas.',
    contentSignature: 'Conteúdo que faz o leitor se sentir COMPREENDIDO.',
    magnetism: 'Puxa pelo acolhimento. As pessoas sentem que podem baixar a guarda.',
    shadow: 'Anulação em nome da harmonia. Dependência emocional da aprovação alheia.',
    shadowKeywords: ['Anulação', 'Codependência', 'Passividade'],
  },
  3: {
    title: 'O Comunicador',
    keywords: ['Expressão', 'Criatividade', 'Alegria', 'Carisma'],
    communicationStyle: 'Narrativo e envolvente. Conta histórias naturalmente. Alterna entre leveza e profundidade.',
    woundPattern: 'Ferida de não ter sido levado a sério. De ouvir "você fala bonito mas não faz".',
    authorityType: 'Autoridade de quem TRANSFORMA o complexo em acessível.',
    contentSignature: 'Conteúdo que é PRAZER de consumir. Mesmo assuntos pesados ficam interessantes.',
    magnetism: 'Puxa pela identificação expressiva. As pessoas sentem que esse número DIZ o que elas gostariam de saber dizer.',
    shadow: 'Dispersão criativa — muitas ideias, pouca execução. Superficialidade por querer agradar.',
    shadowKeywords: ['Dispersão', 'Superficialidade', 'Fuga'],
  },
  4: {
    title: 'O Construtor',
    keywords: ['Estrutura', 'Disciplina', 'Método', 'Consistência'],
    communicationStyle: 'Estruturado e sequencial. Usa listas, passos, frameworks. Cada frase tem função.',
    woundPattern: 'Ferida de ter vivido o caos e precisar construir ordem a partir do nada.',
    authorityType: 'Autoridade de quem CONSTRUIU do zero. Mostra o processo, não só o resultado.',
    contentSignature: 'Conteúdo que o leitor APLICA imediatamente. Sempre sai com próximo passo claro.',
    magnetism: 'Puxa pela segurança. As pessoas sentem que com esse número o chão é firme.',
    shadow: 'Rigidez que se confunde com disciplina. Medo do caos que impede inovação.',
    shadowKeywords: ['Rigidez', 'Julgamento', 'Inflexibilidade'],
  },
  5: {
    title: 'O Explorador',
    keywords: ['Liberdade', 'Mudança', 'Versatilidade', 'Aventura'],
    communicationStyle: 'Dinâmico e surpreendente. Muda de ângulo no meio do texto. Provocação intelectual.',
    woundPattern: 'Ferida de ter sido preso — em expectativas, papéis, lugares que não pertencia.',
    authorityType: 'Autoridade de quem EXPERIMENTOU na prática. Não leu sobre — viveu.',
    contentSignature: 'Conteúdo que SACODE. Tira o leitor da zona de conforto com perspectivas inesperadas.',
    magnetism: 'Puxa pela liberdade. As pessoas sentem que perto desse número podem se reinventar.',
    shadow: 'Inconstância disfarçada de liberdade. Medo de compromisso profundo.',
    shadowKeywords: ['Inconstância', 'Fuga', 'Abandono'],
  },
  6: {
    title: 'O Cuidador',
    keywords: ['Amor', 'Responsabilidade', 'Cura', 'Proteção'],
    communicationStyle: 'Caloroso e envolvente. Tom de quem está cuidando enquanto fala. Valida antes de confrontar.',
    woundPattern: 'Ferida de ter cuidado de todos e não ter sido cuidado.',
    authorityType: 'Autoridade de quem CUIDA de verdade — não por marketing, mas por natureza.',
    contentSignature: 'Conteúdo que CUIDA do leitor. A pessoa sente que alguém pensou nela especificamente.',
    magnetism: 'Puxa pelo cuidado genuíno. As pessoas sentem que são vistas como seres humanos.',
    shadow: 'Sacrifício como identidade. Controle disfarçado de proteção.',
    shadowKeywords: ['Martírio', 'Controle afetivo', 'Ressentimento'],
  },
  7: {
    title: 'O Sábio',
    keywords: ['Análise', 'Espiritualidade', 'Introspecção', 'Verdade'],
    communicationStyle: 'Preciso e cirúrgico. Cada palavra é escolhida. Profundidade sem ser pesado.',
    woundPattern: 'Ferida de não ser compreendido. De ver o que outros não veem.',
    authorityType: 'Autoridade de quem MERGULHOU onde outros não vão.',
    contentSignature: 'Conteúdo que faz o leitor PARAR e pensar. Cada texto tem camada escondida.',
    magnetism: 'Puxa pela profundidade. As pessoas sentem que esse número sabe algo que elas buscam.',
    shadow: 'Isolamento intelectual. Arrogância do conhecimento.',
    shadowKeywords: ['Isolamento', 'Elitismo', 'Paralisia'],
  },
  8: {
    title: 'O Realizador',
    keywords: ['Poder', 'Abundância', 'Autoridade', 'Estratégia'],
    communicationStyle: 'Orientado a resultado. Abre com dados ou conquistas. Fecha com ação clara.',
    woundPattern: 'Ferida de ter passado por escassez. De ter trabalhado duro sem resultado.',
    authorityType: 'Autoridade de quem GEROU resultado mensurável.',
    contentSignature: 'Conteúdo que PROVA. Nunca é só opinião — tem dados, resultados, evidências.',
    magnetism: 'Puxa pela ambição saudável. Possível ter resultado SEM perder a alma.',
    shadow: 'Obsessão por resultados que atropela pessoas.',
    shadowKeywords: ['Obsessão', 'Medo de escassez', 'Materialismo'],
  },
  9: {
    title: 'O Humanitário',
    keywords: ['Compaixão', 'Sabedoria', 'Legado', 'Transformação'],
    communicationStyle: 'Amplo e universal. Fala para muitos mas cada um sente que é pessoal.',
    woundPattern: 'Ferida de ter perdido algo importante. De ter se dado tanto que esvaziou.',
    authorityType: 'Autoridade de quem ATRAVESSOU ciclos completos.',
    contentSignature: 'Conteúdo que TRANSFORMA em nível profundo. O leitor muda algo DENTRO de si.',
    magnetism: 'Puxa pela sensação de propósito. As pessoas sentem que a vida tem significado.',
    shadow: 'Dificuldade de receber. Complexo de salvador.',
    shadowKeywords: ['Martírio', 'Autossabotagem', 'Esgotamento'],
  },
  11: {
    title: 'O Iluminado',
    keywords: ['Intuição', 'Inspiração', 'Visão', 'Magnetismo'],
    communicationStyle: 'Intuitivo e magnético. Verdades que surpreendem até quem escreveu. Cria transe com palavras.',
    woundPattern: 'Ferida de ser "demais" para o mundo. De enxergar o que outros não enxergam.',
    authorityType: 'Autoridade de quem CANALIZA verdade. As pessoas SENTEM.',
    contentSignature: 'Conteúdo que ARREPIA. O leitor sente no corpo. Frases que ecoam dias depois.',
    magnetism: 'Puxa pela verdade transcendente. Sensibilidade com poder de expressão é rara e irresistível.',
    shadow: 'Ansiedade por captar demais. Oscilação entre gênio e autodestruição.',
    shadowKeywords: ['Ansiedade', 'Hipersensibilidade', 'Pressão interna'],
  },
  22: {
    title: 'O Mestre Construtor',
    keywords: ['Visão global', 'Construção', 'Legado', 'Impacto'],
    communicationStyle: 'Visionário mas concreto. Pinta o quadro grande E mostra os tijolos.',
    woundPattern: 'Ferida de ter uma visão gigante e se sentir pequeno diante dela.',
    authorityType: 'Autoridade de quem CONSTRUIU algo que escala.',
    contentSignature: 'Conteúdo que mostra SISTEMA. Conecta o detalhe ao todo.',
    magnetism: 'Puxa pela visão de legado. Capacidade de transformar visão em realidade.',
    shadow: 'Pressão esmagadora de materializar a visão.',
    shadowKeywords: ['Pressão', 'Perfeccionismo', 'Workaholismo'],
  },
}

// Venus sign calculation from birth date (orbital mechanics)
function normalizeAngle(a) {
  return ((a % 360) + 360) % 360
}

function getJulianDay(dateStr) {
  const parts = dateStr.split('-').map(Number)
  let year = parts[0], month = parts[1]
  const day = parts[2]
  if (month <= 2) { year--; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5
}

export function getVenusSign(birthDate) {
  const JD = getJulianDay(birthDate)
  const T = (JD - 2451545.0) / 36525
  const toRad = d => (d * Math.PI) / 180
  const toDeg = r => (r * 180) / Math.PI

  const Lv = normalizeAngle(181.979801 + 58517.8156760 * T)
  const wv = 131.563703
  const ev = 0.00677323
  const Mv = toRad(normalizeAngle(Lv - wv))
  const Cv = 2 * ev * Math.sin(Mv)
  const lv = normalizeAngle(Lv + toDeg(Cv))

  const Le = normalizeAngle(100.466457 + 35999.3728565 * T)
  const we = 102.937348
  const ee = 0.01671022
  const Me = toRad(normalizeAngle(Le - we))
  const Ce = 2 * ee * Math.sin(Me)
  const le = normalizeAngle(Le + toDeg(Ce))

  const Rv = 0.72333199
  const Re = 1.00000011

  const dx = Rv * Math.cos(toRad(lv)) - Re * Math.cos(toRad(le))
  const dy = Rv * Math.sin(toRad(lv)) - Re * Math.sin(toRad(le))
  const lambda = normalizeAngle(toDeg(Math.atan2(dy, dx)))

  const signs = ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes']
  return signs[Math.floor(lambda / 30)]
}

// ============================================================
// ESSENCE ENGINE (from essence-engine.ts)
// ============================================================

function getMeaning(n) {
  return NUMBER_MEANINGS[n] || NUMBER_MEANINGS[1]
}

function getVenus(sign) {
  return VENUS_SIGNS[sign] || null
}

function findDominantNumbers(profile) {
  const counts = {}
  const nums = [profile.destino, profile.expressao, profile.impressao, profile.motivacao, profile.missao]
  for (const n of nums) counts[n] = (counts[n] || 0) + 1
  const sorted = Object.entries(counts)
    .sort(([a, ca], [b, cb]) => cb - ca || Number(b) - Number(a))
    .map(([n]) => Number(n))
  return sorted.slice(0, 2)
}

export function generateEssencePromptBlock(fullName, birthDate) {
  const p = calcProfile(fullName, birthDate)
  const venusSign = getVenusSign(birthDate)
  const venus = getVenus(venusSign)
  const firstName = fullName.split(' ')[0]

  const destinoM = getMeaning(p.destino)
  const expressaoM = getMeaning(p.expressao)
  const impressaoM = getMeaning(p.impressao)
  const motivacaoM = getMeaning(p.motivacao)
  const missaoM = getMeaning(p.missao)
  const dominant = findDominantNumbers(p)

  const shadows = dominant.map(n => {
    const m = getMeaning(n)
    return `${m.title}: ${m.shadow} (${m.shadowKeywords.join(', ')})`
  })

  return `=== ESSÊNCIA ÚNICA DE ${firstName.toUpperCase()} ===
Números: Destino ${p.destino} (${destinoM.title}) | Expressão ${p.expressao} (${expressaoM.title}) | Impressão ${p.impressao} (${impressaoM.title}) | Motivação ${p.motivacao} (${motivacaoM.title}) | Missão ${p.missao} (${missaoM.title})
Vênus: ${venus?.name || venusSign}

## DNA DE COMUNICAÇÃO
COMO ESTA PESSOA ESCREVE NATURALMENTE:
${expressaoM.communicationStyle}
${venus ? `MAGNETISMO NATURAL (Vênus): ${venus.contentTone} ${venus.attractionStyle}` : ''}

## FERIDA QUE RESSOA
Ferida de Destino (${destinoM.title}): ${destinoM.woundPattern}
Ferida que reconhece nos outros (${impressaoM.title}): ${impressaoM.woundPattern}

## ASSINATURA DE AUTORIDADE
Autoridade primária (Missão — ${missaoM.title}): ${missaoM.authorityType}
Autoridade de caminho (Destino — ${destinoM.title}): ${destinoM.authorityType}

## PADRÃO DE MAGNETISMO
Magnetismo interno (Motivação — ${motivacaoM.title}): ${motivacaoM.magnetism}
${venus ? `Magnetismo externo (Vênus): ${venus.attractionStyle}` : ''}
Assinatura de conteúdo (${motivacaoM.title}): ${motivacaoM.contentSignature}

## PROFUNDIDADE DE SOMBRA
${shadows.join('\n')}

## REGRAS INEGOCIÁVEIS
- Cada conteúdo DEVE soar como se SÓ ${firstName} pudesse ter escrito
- Se outro especialista poderia assinar, REESCREVA
- NUNCA mencione numerologia, números, Vênus ou signos no conteúdo — eles guiam o TOM, não aparecem no TEXTO`
}

export { NUMBER_MEANINGS, VENUS_SIGNS }
