import { getDb } from './index'

export function getSaldoDia(data: string): number {
  const row = getDb().prepare('SELECT valor FROM saldo_diario WHERE data = ?').get(data) as
    | { valor: number }
    | undefined
  return row?.valor ?? 0
}

export function existeSaldoDia(data: string): boolean {
  const row = getDb().prepare('SELECT 1 FROM saldo_diario WHERE data = ?').get(data)
  return row !== undefined
}

export function setSaldoDia(data: string, valor: number): void {
  getDb()
    .prepare(
      'INSERT INTO saldo_diario (data, valor) VALUES (?, ?) ON CONFLICT(data) DO UPDATE SET valor = excluded.valor'
    )
    .run(data, valor)
}
