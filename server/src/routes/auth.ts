import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import crypto from 'crypto'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-troque-em-producao'

// POST /auth/register
router.post('/register', (req, res) => {
  const { email, name, password } = req.body
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, nome e senha obrigatorios' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no minimo 6 caracteres' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim())
  if (existing) {
    return res.status(409).json({ error: 'Email ja cadastrado' })
  }

  const id = crypto.randomUUID()
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(
    id, email.toLowerCase().trim(), name.trim(), hash
  )

  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' })
  res.status(201).json({ token, user: { id, email: email.toLowerCase().trim(), name: name.trim() } })
})

// POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha obrigatorios' })
  }

  const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou senha incorretos' })
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

// GET /auth/me
router.get('/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' })
  }

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string }
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.userId) as any
    if (!user) return res.status(401).json({ error: 'Usuario nao encontrado' })

    // Also return Instagram connection status
    const ig = db.prepare('SELECT username, expires_at FROM instagram_connections WHERE user_id = ?').get(user.id) as any

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      instagram: ig ? { username: ig.username, expiresAt: ig.expires_at } : null,
    })
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' })
  }
})

export default router

// Middleware helper for protected routes
export function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' })
  }
}
