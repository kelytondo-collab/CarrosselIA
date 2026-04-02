import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb } from './db.js'
import { initGeminiProxy, handleGeminiProxy } from './services/geminiProxy.js'
import { authMiddleware } from './middleware/auth.js'

// Routes
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profiles.js'
import projectRoutes from './routes/projects.js'
import usageRoutes from './routes/usage.js'
import paymentRoutes from './routes/payments.js'
import referralRoutes from './routes/referral.js'
import luminaeRoutes from './routes/luminae-sync.js'
import demoRoutes from './routes/demo.js'

const app = express()
const PORT = process.env.PORT || 3080

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'https://carrossel.kellytondo.com.br',
    'https://autoria.kellytondo.com.br',
  ],
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'autor-ia-api', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/usage', usageRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/referral', referralRoutes)
app.use('/api/luminae', luminaeRoutes)
app.use('/api/demo', demoRoutes)

// Gemini proxy — authenticated
app.post('/api/gemini/generate', authMiddleware, handleGeminiProxy)

// Plans — public
app.get('/api/plans', (req, res) => {
  res.json({
    plans: [
      { id: 'essencial', name: 'Essencial', value: 79, posts: 20, profiles: 1, features: ['20 posts/mes', '1 perfil', '3 Style Packs', 'Exportar imagens'] },
      { id: 'profissional', name: 'Profissional', value: 197, posts: 'Ilimitado', profiles: 1, features: ['Posts ilimitados', '1 perfil', 'Todos os formatos', 'Essencia Engine', 'Calendario de Essencia', 'Suporte prioritario'] },
      { id: 'agencia', name: 'Agencia', value: 397, posts: 'Ilimitado', profiles: 3, features: ['Posts ilimitados', 'Ate 3 perfis', 'Todos os formatos', 'Essencia Engine', 'Calendario de Essencia', 'Dashboard de Performance', 'Suporte VIP'] },
    ],
  })
})

// Monthly usage reset — check daily
function checkMonthlyReset() {
  const now = new Date()
  if (now.getDate() === 1 && now.getHours() === 0) {
    import('./routes/usage.js').then(mod => mod.resetMonthlyUsage())
  }
}

// Start server
async function start() {
  try {
    await initDb()
    initGeminiProxy()

    app.listen(PORT, () => {
      console.log(`[AUTOR.IA API] Running on port ${PORT}`)
      console.log(`[AUTOR.IA API] Health: http://localhost:${PORT}/api/health`)
    })

    // Check monthly reset every hour
    setInterval(checkMonthlyReset, 3600000)
  } catch (err) {
    console.error('[AUTOR.IA API] Failed to start:', err)
    process.exit(1)
  }
}

start()
