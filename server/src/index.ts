import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { migrate } from './db.js'
import authRouter from './routes/auth.js'
import profilesRouter from './routes/profiles.js'
import projectsRouter from './routes/projects.js'
import instagramRouter from './routes/instagram.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = parseInt(process.env.PORT || '3475')
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://carrossel.kellytondo.com.br'

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))

// Serve uploaded images as static files
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

// Routes
app.use('/auth', authRouter)
app.use('/api/profiles', profilesRouter)
app.use('/api/projects', projectsRouter)
app.use('/auth', instagramRouter)  // OAuth: /auth/instagram, /auth/instagram/callback
app.use('/api', instagramRouter)   // Protected: /api/instagram/*, /api/upload-images, /api/publish/*

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Cleanup old uploaded images every 30 minutes
import { readdirSync, unlinkSync, statSync } from 'fs'

setInterval(() => {
  const uploadsDir = join(__dirname, '..', 'uploads')
  try {
    const files = readdirSync(uploadsDir)
    const now = Date.now()
    for (const file of files) {
      if (file === '.gitkeep') continue
      const filepath = join(uploadsDir, file)
      const stat = statSync(filepath)
      if (now - stat.mtimeMs > 30 * 60 * 1000) {
        unlinkSync(filepath)
      }
    }
  } catch { /* uploads dir may not exist yet */ }
}, 30 * 60 * 1000)

// Initialize DB and start server
migrate().then(() => {
  app.listen(PORT, () => {
    console.log(`[carrossel-api] Rodando na porta ${PORT}`)
  })
}).catch(err => {
  console.error('[carrossel-api] Erro ao inicializar DB:', err)
  process.exit(1)
})
