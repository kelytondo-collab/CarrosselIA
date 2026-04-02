import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'autor-ia.db')

let db = null

export async function initDb() {
  const SQL = await initSqlJs()

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
    console.log('[DB] Loaded existing database')
  } else {
    db = new SQL.Database()
    console.log('[DB] Created new database')
  }

  // Schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      birth_date TEXT,
      niche TEXT,
      role TEXT DEFAULT 'user',
      plan TEXT DEFAULT 'trial',
      posts_used_this_month INTEGER DEFAULT 0,
      posts_limit INTEGER DEFAULT 999,
      profiles_limit INTEGER DEFAULT 1,
      trial_ends_at TEXT,
      subscription_id TEXT,
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      extra_posts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      niche TEXT,
      target_audience TEXT,
      tone TEXT DEFAULT 'profissional',
      bio TEXT,
      color_palette TEXT,
      brand_kit TEXT,
      voice_blueprint TEXT,
      numerology_data TEXT,
      instagram_handle TEXT,
      style_pack_id TEXT DEFAULT 'livre',
      default_platform TEXT DEFAULT 'instagram',
      default_slide_count INTEGER DEFAULT 8,
      preferred_font TEXT,
      photo_base64 TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Migration: add photo_base64 if missing (existing DBs)
  try { db.run('ALTER TABLE profiles ADD COLUMN photo_base64 TEXT') } catch { /* column already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      profile_id INTEGER,
      type TEXT DEFAULT 'carousel',
      name TEXT NOT NULL,
      theme TEXT,
      product TEXT,
      platform TEXT,
      inputs_json TEXT,
      carousel_data TEXT,
      post_data TEXT,
      stories_data TEXT,
      status TEXT DEFAULT 'active',
      is_favorite INTEGER DEFAULT 0,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      credits_used INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_email TEXT,
      referred_user_id INTEGER,
      status TEXT DEFAULT 'pending',
      reward_given INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code)')
  db.run('CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_log(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)')

  save()
  return db
}

export function save() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

export function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function get(sql, params = []) {
  const rows = all(sql, params)
  return rows[0] || null
}

export function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  const changes = db.getRowsModified()
  // Get last insert rowid BEFORE save (which also runs SQL)
  let lastId = null
  try {
    const result = db.exec('SELECT last_insert_rowid() as id')
    if (result.length > 0 && result[0].values.length > 0) {
      lastId = result[0].values[0][0]
    }
  } catch { /* ignore */ }
  save()
  return { changes, lastId }
}

export function getDb() {
  return db
}
