import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

export function getDbPath(): string {
  return join(app.getPath('userData'), 'balcao.db')
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath())
    configurar(db)
    migrar(db)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = undefined as unknown as Database.Database
  }
}

function configurar(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
}

function migrar(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL DEFAULT (date('now')),
      total REAL NOT NULL,
      desconto REAL NOT NULL DEFAULT 0,
      forma_pagamento TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS itens_venda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL REFERENCES vendas(id),
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      nome_produto TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saldo_diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      valor REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lista_compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      concluido INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data);
  `)

  // Migration: adiciona desconto em bancos existentes sem a coluna
  const colunas = db.pragma('table_info(vendas)') as { name: string }[]
  if (!colunas.some((c) => c.name === 'desconto')) {
    db.exec('ALTER TABLE vendas ADD COLUMN desconto REAL NOT NULL DEFAULT 0')
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_itens_venda_id ON itens_venda(venda_id);
  `)

  const colunasLista = db.pragma('table_info(lista_compras)') as { name: string }[]
  if (!colunasLista.some((c) => c.name === 'quantidade')) {
    db.exec('ALTER TABLE lista_compras ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1')
  }
}
