/* eslint-disable @typescript-eslint/explicit-function-return-type -- Testes JavaScript executados pelo Node embutido no Electron. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { prepararBanco } from '../out/tests/preparacao.js'

function pastaTeste(t) {
  const pasta = mkdtempSync(join(tmpdir(), 'balcao-backup-'))
  t.after(() => rmSync(pasta, { recursive: true, force: true }))
  return pasta
}

function bancoAntigo(pasta) {
  const db = new Database(join(pasta, 'balcao.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('wal_autocheckpoint = 0')
  db.exec(
    'CREATE TABLE vendas (id INTEGER PRIMARY KEY, total REAL); INSERT INTO vendas VALUES (1, 123.45)'
  )
  return db
}

const migrar = (db) => db.exec('ALTER TABLE vendas ADD COLUMN desconto REAL NOT NULL DEFAULT 0')

test('instalação nova cria banco sem exigir backup', async (t) => {
  const pasta = pastaTeste(t)
  const db = await prepararBanco(pasta, '1.1.0', (db) =>
    db.exec('CREATE TABLE vendas (id INTEGER)')
  )
  db.close()
  assert.equal(readFileSync(join(pasta, 'versao-banco.txt'), 'utf8'), '1.1.0')
  assert.equal(existsSync(join(pasta, 'backups')), false)
})

test('preserva histórico da versão 1, incluindo dados presentes no WAL', async (t) => {
  const pasta = pastaTeste(t)
  const antigo = bancoAntigo(pasta)
  assert.ok(existsSync(join(pasta, 'balcao.db-wal')))
  const db = await prepararBanco(pasta, '1.1.0', migrar)
  const [nome] = readdirSync(join(pasta, 'backups'))
  const backup = new Database(join(pasta, 'backups', nome), { readonly: true })
  try {
    assert.equal(backup.prepare('SELECT total FROM vendas').get().total, 123.45)
    assert.equal(
      backup.pragma('table_info(vendas)').some((c) => c.name === 'desconto'),
      false
    )
    assert.deepEqual(db.prepare('SELECT * FROM vendas').get(), {
      id: 1,
      total: 123.45,
      desconto: 0
    })
  } finally {
    backup.close()
    db.close()
    antigo.close()
  }
})

test('reabrir a mesma versão não cria backups repetidos', async (t) => {
  const pasta = pastaTeste(t)
  bancoAntigo(pasta).close()
  ;(await prepararBanco(pasta, '1.1.0', migrar)).close()
  ;(await prepararBanco(pasta, '1.1.0', () => {})).close()
  assert.equal(readdirSync(join(pasta, 'backups')).length, 1)
})

test('falha no backup impede migração e preserva o banco original', async (t) => {
  const pasta = pastaTeste(t)
  bancoAntigo(pasta).close()
  writeFileSync(join(pasta, 'backups'), 'impede criar diretório')
  let migrou = false
  await assert.rejects(
    prepararBanco(pasta, '1.1.0', () => {
      migrou = true
    })
  )
  assert.equal(migrou, false)
  const db = new Database(join(pasta, 'balcao.db'))
  assert.equal(db.prepare('SELECT total FROM vendas').get().total, 123.45)
  db.close()
  assert.equal(existsSync(join(pasta, 'versao-banco.txt')), false)
})

test('falha durante migração desfaz alterações e mantém backup para recuperação', async (t) => {
  const pasta = pastaTeste(t)
  bancoAntigo(pasta).close()
  writeFileSync(join(pasta, 'versao-banco.txt'), '1.0.0')
  await assert.rejects(
    prepararBanco(pasta, '1.1.0', (db) => {
      migrar(db)
      db.exec('DELETE FROM vendas')
      throw new Error('falha simulada')
    })
  )
  const db = new Database(join(pasta, 'balcao.db'))
  assert.equal(db.prepare('SELECT total FROM vendas').get().total, 123.45)
  assert.equal(
    db.pragma('table_info(vendas)').some((c) => c.name === 'desconto'),
    false
  )
  db.close()
  assert.equal(readFileSync(join(pasta, 'versao-banco.txt'), 'utf8'), '1.0.0')
  assert.equal(readdirSync(join(pasta, 'backups')).filter((n) => n.endsWith('.db')).length, 1)
})
