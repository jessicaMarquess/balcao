import type { NovoProduto, Produto } from '../../renderer/src/types'
import { getDb } from './index'

export function listarProdutos(): Produto[] {
  return getDb()
    .prepare('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome ASC')
    .all() as Produto[]
}

export function criarProduto(dados: NovoProduto): Produto {
  const db = getDb()
  const stmt = db.prepare('INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)')
  const result = stmt.run(dados.nome, dados.preco, dados.estoque)
  return db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid) as Produto
}

export function atualizarProduto(id: number, dados: Partial<NovoProduto>): Produto {
  const db = getDb()
  const campos: string[] = []
  const valores: unknown[] = []

  if (dados.nome !== undefined) {
    campos.push('nome = ?')
    valores.push(dados.nome)
  }
  if (dados.preco !== undefined) {
    campos.push('preco = ?')
    valores.push(dados.preco)
  }
  if (dados.estoque !== undefined) {
    campos.push('estoque = ?')
    valores.push(dados.estoque)
  }

  valores.push(id)
  db.prepare(`UPDATE produtos SET ${campos.join(', ')} WHERE id = ?`).run(...valores)
  return db.prepare('SELECT * FROM produtos WHERE id = ?').get(id) as Produto
}

export function deletarProduto(id: number): void {
  getDb().prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(id)
}
