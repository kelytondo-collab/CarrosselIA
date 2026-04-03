import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'data', 'carrossel.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Auto-migrate on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    niche TEXT DEFAULT '',
    tone TEXT DEFAULT 'descontraído',
    bio TEXT DEFAULT '',
    color_palette TEXT DEFAULT '{}',
    brand_kit TEXT DEFAULT '{}',
    photo_base64 TEXT DEFAULT '',
    voice_blueprint TEXT DEFAULT '',
    instagram_handle TEXT DEFAULT '',
    style_pack TEXT DEFAULT 'livre',
    preferred_font TEXT DEFAULT '',
    target_audience TEXT DEFAULT '',
    default_platform TEXT DEFAULT 'instagram',
    default_slide_count INTEGER DEFAULT 8,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'carousel',
    theme TEXT DEFAULT '',
    product TEXT DEFAULT '',
    platform TEXT DEFAULT 'instagram',
    inputs_json TEXT DEFAULT '{}',
    carousel_data TEXT DEFAULT NULL,
    post_data TEXT DEFAULT NULL,
    stories_data TEXT DEFAULT NULL,
    status TEXT DEFAULT 'active',
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS instagram_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    ig_account_id TEXT NOT NULL,
    username TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    connected_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

export default db
