# AUTOR.IA — CLAUDE.md

## O Que E
AUTOR.IA e uma fabrica visual de conteudo que transforma texto/ideias em carrosseis, posts, stories e videos prontos para Instagram. Integrado com Luminae (gerador de conteudo com essencia).

**URL Producao:** https://carrossel.kellytondo.com.br
**Repo:** github.com/kelytondo-collab/CarrosselIA.git (branch: master)
**Stack:** React 19 + Vite 7 + Tailwind 3 + Gemini 2.5 Flash. 100% client-side.

---

## Comandos

```bash
npm run dev        # Dev server (localhost:5173)
npm run build      # Build producao (dist/)
npm run preview    # Preview do build local
npx tsc --noEmit   # Type check sem build
```

**Deploy Vercel (manual):**
```bash
npx vercel --prod
npx vercel alias set <deployment-url> carrossel.kellytondo.com.br
```

---

## Estrutura do Projeto

```
src/
├── App.tsx                          # Router principal + import Luminae via URL hash
├── contexts/
│   └── AppContext.tsx                # Estado global (view, projeto, perfil, API key)
├── types/
│   ├── index.ts                     # Tipos principais (Project, SlideData, PostData, etc.)
│   ├── luminae.ts                   # Tipos do parser Luminae
│   └── stylePacks.ts               # Tipos dos 3 Style Packs
├── services/
│   ├── geminiService.ts             # Chamadas Gemini (carrossel, post, stories, imagem)
│   ├── luminaeParser.ts             # Parser JSON/texto do Luminae
│   ├── storageService.ts            # localStorage (projetos, perfis)
│   ├── imageCache.ts                # IndexedDB (cache imagens geradas)
│   ├── videoRenderer.ts             # Canvas + MediaRecorder (3 tipos de video)
│   └── exportService.ts             # Export PNG/ZIP
├── components/
│   ├── input/
│   │   ├── InputSection.tsx         # Formulario de criacao de carrossel (3 modos)
│   │   ├── ContentModeSelector.tsx  # Seletor Luminae/Colar/Criar
│   │   └── LuminaeImporter.tsx      # Importador de conteudo Luminae
│   ├── preview/
│   │   ├── CarouselPreview.tsx      # Preview carrossel com Style Packs
│   │   ├── SlideCard.tsx            # Slide individual (modo livre)
│   │   └── StyledSlideCard.tsx      # Slide com Style Pack aplicado
│   ├── shared/
│   │   ├── StylePacks.ts            # Config dos 3 packs (cores, fontes, sequencias)
│   │   ├── StyleSelector.tsx        # UI seletor de estilo
│   │   ├── GradientPicker.tsx       # Seletor de gradientes
│   │   └── LayoutTemplates.ts       # 11 templates de layout
│   ├── caption/
│   │   └── CaptionEditor.tsx        # Editor de legenda (hook/body/cta/hashtags)
│   ├── post/
│   │   ├── PostEditor.tsx           # Editor post (Luminae/Criar do Zero)
│   │   └── PostPreview.tsx          # Preview post 1080x1080
│   ├── stories/
│   │   ├── StoriesEditor.tsx        # Editor stories
│   │   └── StoriesPreview.tsx       # Preview stories 1080x1920
│   ├── video/
│   │   ├── QuoteVideoEditor.tsx     # Video citacao (3 fundos: gradiente/IA/video)
│   │   ├── CarouselReelEditor.tsx   # Carrossel → video com transicoes
│   │   ├── ReelsConexaoEditor.tsx   # Reels Conexao (b-roll + legendas sync)
│   │   └── TeleprompterRecorder.tsx # Gravador camera + teleprompter
│   ├── profile/                     # Perfil do especialista
│   ├── settings/                    # Configuracoes (API key)
│   ├── onboarding/                  # Setup inicial
│   ├── dashboard/                   # Dashboard projetos
│   └── layout/
│       └── Sidebar.tsx              # Navegacao lateral
```

---

## Fluxo de Dados

### Import do Luminae (via URL hash)
```
Luminae → base64(JSON) na URL → App.tsx decodifica → cria projeto → navega pra preview
```
- `App.tsx` linhas ~80-130: detecta `#import=` no hash
- Tipos suportados: `carrossel`, `post`, `stories`, `reels_conexao`, `quote_phrase`
- `autoStyle=true`: aplica Style Pack do perfil automaticamente

### Geracao com Gemini
```
InputSection/PostEditor → geminiService.ts → Gemini 2.5 Flash → JSON → storageService → Preview
```
- API key do usuario salva em localStorage
- Chamada direta do browser (sem backend)

### Persistencia
- **Projetos**: localStorage (`postativo_projects`, `postativo_profiles`)
- **Imagens**: IndexedDB (`postativo_images`) — chave: `${projectId}_slide_${index}`
- **Import Luminae**: localStorage temporario (limpo apos import)

---

## 3 Style Packs

| Pack | Fonts | Cores | Paleta Usuario |
|------|-------|-------|----------------|
| **Presenca Dourada** | Inter | Dark #1a1008 / Light #faf5ee / Gold #d4a574 | Substitui TODAS as cores |
| **Diario Artesanal** | Cormorant + Caveat | Kraft #e8d5b7 / Paper #faf6f0 / Amber #d97706 | So muda accent |
| **Impacto Editorial** | Bebas Neue | Black #111111 / White #fafafa / Red #ef4444 | So muda accent |

Config em `src/components/shared/StylePacks.ts`.
Renderizador em `src/components/preview/StyledSlideCard.tsx`.

---

## 3 Tipos de Video

### 1. Video Citacao (`QuoteVideoEditor.tsx`)
- Frase animada (word-by-word/line-by-line/fade-in)
- 3 fundos: gradiente, imagem IA, video importado
- Formatos: Reel (9:16) ou Feed (4:5)

### 2. Carrossel Reel (`CarouselReelEditor.tsx`)
- Slides do carrossel viram video com transicoes
- Transicoes: fade, slide-left, slide-up, zoom-in, zoom-out
- Pode usar imagens dos slides como fundo

### 3. Reels Conexao (`ReelsConexaoEditor.tsx` + `TeleprompterRecorder.tsx`)
- Teleprompter: camera + frases coloridas por arco emocional
- Timestamps REAIS capturados durante gravacao
- Legendas sincronizam com a fala
- Arcos: fachada (azul), contraste (amber), verdade (rosa), convite (verde)

Renderer em `src/services/videoRenderer.ts` (Canvas + MediaRecorder → WebM).

---

## Regras Importantes

1. **NUNCA reescrever conteudo do Luminae** — modo FORMAT-ONLY preserva palavras EXATAS
2. **Clone foi REMOVIDO** (30/03/2026) — Gemini nao clona rosto. Codigo morto em geminiService.ts
3. **Paleta do usuario**: Presenca Dourada aceita paleta completa; Artesanal/Editorial so accent
4. **Imagens IndexedDB**: sempre restaurar no mount dos editores (`imageCache.ts`)
5. **Export PNG**: usa html-to-image (domtoimage) com escala 2x para 1080px
6. **Sem backend**: tudo roda no browser. Unica API externa = Gemini (chave do usuario)

---

## Integracao Luminae

| Tipo Luminae | Destino AUTOR.IA | Botao no Luminae |
|--------------|------------------|------------------|
| Carrossel Instagram | CarouselPreview | "Carrossel Pronto" (auto) / "Abrir no AUTOR.IA" (manual) |
| Post Instagram | PostPreview | "Abrir no AUTOR.IA" |
| Stories Instagram | StoriesPreview | "Abrir no AUTOR.IA" |
| Reels Conexao | ReelsConexaoEditor | "Gravar no AUTOR.IA" |
| Citacao/Frase | PostPreview | "Abrir no AUTOR.IA" |

**Formato do payload (JSON via URL hash):**
```json
{
  "tipo": "carrossel | post | stories | reels_conexao",
  "slides": [{ "headline": "...", "subtitle": "...", "type": "capa|dor|conteudo|lista|cta" }],
  "caption": { "hook": "...", "body": "...", "cta": "...", "hashtags": "..." },
  "autoStyle": true,
  "phrases": [{ "phrase": "...", "keywords": ["..."], "arc": "verdade", "pause": 2 }],
  "recordingTip": "...",
  "musicMood": "..."
}
```

---

## Versao

**AUTOR.IA v2.2** (30/03/2026)
- v1.0: Carrossel basico
- v2.0: 6 fases (Luminae parser, gradientes, CaptionEditor, IndexedDB, video, Luminae post/stories)
- v2.1: Video Citacao 3 fundos, Reel com imagens, paleta Ouro, font scale
- v2.2: Reels Conexao + teleprompter, sync fala-legenda, arco emocional, Style Packs + paleta, One-Click Setup, JSON semantico, edicao inline, clone removido
