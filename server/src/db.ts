import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_PATH = join(DATA_DIR, 'carrossel.db')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

// Wrapper that mimics better-sqlite3 API
class DbWrapper {
  private db!: any
  private ready: Promise<void>

  constructor() {
    this.ready = this.init()
  }

  private async init() {
    const SQL = await initSqlJs()
    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH)
      this.db = new SQL.Database(buffer)
    } else {
      this.db = new SQL.Database()
    }
    this.save()
  }

  async waitReady() {
    await this.ready
  }

  private save() {
    const data = this.db.export()
    writeFileSync(DB_PATH, Buffer.from(data))
  }

  exec(sql: string) {
    this.db.run(sql)
    this.save()
  }

  prepare(sql: string) {
    const db = this.db
    const self = this
    return {
      get(...params: any[]): any {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        let result: any = undefined
        if (stmt.step()) {
          result = stmt.getAsObject()
        }
        stmt.free()
        return result
      },
      all(...params: any[]): any[] {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        const results: any[] = []
        while (stmt.step()) {
          results.push(stmt.getAsObject())
        }
        stmt.free()
        return results
      },
      run(...params: any[]) {
        db.run(sql, params)
        self.save()
      },
    }
  }
}

const db = new DbWrapper()

// Initialize tables after db is ready
async function migrate() {
  await db.waitReady()

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
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
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS instagram_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      ig_account_id TEXT NOT NULL,
      username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      connected_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

export { migrate }
export default db
