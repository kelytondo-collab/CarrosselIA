declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: any[]): void
    exec(sql: string): any[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    get(params?: any[]): any[]
    getAsObject(params?: any[]): Record<string, any>
    free(): boolean
    reset(): void
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export type { Database, Statement }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}
