import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Abre o banco existente e só executa migrações depois de um backup consistente. */
export async function prepararBanco(
  pasta: string,
  versao: string,
  migrar: (db: Database.Database) => void
): Promise<Database.Database> {
  mkdirSync(pasta, { recursive: true })
  const caminho = join(pasta, 'balcao.db')
  const existente = existsSync(caminho)
  const marcador = join(pasta, 'versao-banco.txt')
  const anterior = existsSync(marcador) ? readFileSync(marcador, 'utf8').trim() : null
  const db = new Database(caminho)

  try {
    if (existente && anterior !== versao) {
      const pastaBackups = join(pasta, 'backups')
      mkdirSync(pastaBackups, { recursive: true })
      const nome = `antes-da-versao-${versao.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}`
      const temporario = join(pastaBackups, `${nome}.tmp`)
      try {
        // A API de backup inclui dados ainda presentes no WAL do SQLite.
        await db.backup(temporario)
        const copia = new Database(temporario)
        try {
          // A cópia deve ser um arquivo único, sem depender de WAL/SHM auxiliares.
          copia.pragma('journal_mode = DELETE')
          if (copia.pragma('quick_check', { simple: true }) !== 'ok') {
            throw new Error('O backup do banco não passou na verificação de integridade')
          }
        } finally {
          copia.close()
        }
        renameSync(temporario, join(pastaBackups, `${nome}.db`))
      } finally {
        rmSync(temporario, { force: true })
      }
    }

    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('foreign_keys = ON')
    db.transaction(() => migrar(db))()
    const marcadorTemporario = `${marcador}.tmp`
    writeFileSync(marcadorTemporario, versao, 'utf8')
    renameSync(marcadorTemporario, marcador)
    return db
  } catch (erro) {
    db.close()
    throw erro
  }
}
