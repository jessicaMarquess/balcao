import { getDb } from './index'

export interface ItemListaCompras {
  id: number
  nome: string
  quantidade: number
  concluido: number
  created_at: string
}

export function listarItens(): ItemListaCompras[] {
  return getDb()
    .prepare('SELECT * FROM lista_compras ORDER BY concluido ASC, created_at ASC')
    .all() as ItemListaCompras[]
}

export function adicionarItem(nome: string, quantidade = 1): ItemListaCompras {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO lista_compras (nome, quantidade) VALUES (?, ?)')
    .run(nome, Math.max(1, quantidade))
  return db
    .prepare('SELECT * FROM lista_compras WHERE id = ?')
    .get(result.lastInsertRowid) as ItemListaCompras
}

export function atualizarQuantidade(id: number, quantidade: number): void {
  getDb()
    .prepare('UPDATE lista_compras SET quantidade = ? WHERE id = ?')
    .run(Math.max(1, quantidade), id)
}

export function marcarComprado(id: number, nome: string, quantidade: number): void {
  const db = getDb()
  db.prepare(
    'UPDATE produtos SET estoque = estoque + ? WHERE LOWER(nome) = LOWER(?)'
  ).run(quantidade, nome)
  db.prepare('DELETE FROM lista_compras WHERE id = ?').run(id)
}

export function deletarItem(id: number): void {
  getDb().prepare('DELETE FROM lista_compras WHERE id = ?').run(id)
}

export function limparTodos(): void {
  getDb().prepare('DELETE FROM lista_compras').run()
}
