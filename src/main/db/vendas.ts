import { getDb } from './index'
import type { Venda, ItemVenda, ItemCarrinho, NovaVenda, ResumoDia } from '../../renderer/src/types'

export function registrarVenda(dados: NovaVenda): Venda {
  const db = getDb()
  const subtotal = dados.itens.reduce((acc, item) => acc + item.preco_unitario * item.quantidade, 0)
  const desconto = Math.min(dados.desconto ?? 0, subtotal)
  const total = Math.max(0, subtotal - desconto)

  const registrar = db.transaction(() => {
    const venda = db
      .prepare(
        'INSERT INTO vendas (data, total, desconto, forma_pagamento, created_at) VALUES (?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
      )
      .run(dados.data, total, desconto, dados.forma_pagamento)

    const vendaId = venda.lastInsertRowid

    const stmtItem = db.prepare(
      'INSERT INTO itens_venda (venda_id, produto_id, nome_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)'
    )
    const stmtEstoque = db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?')

    for (const item of dados.itens) {
      stmtItem.run(vendaId, item.produto_id, item.nome_produto, item.quantidade, item.preco_unitario)
      stmtEstoque.run(item.quantidade, item.produto_id)
    }

    return db.prepare('SELECT * FROM vendas WHERE id = ?').get(vendaId) as Venda
  })

  return registrar()
}

export function listarVendasPorData(data: string): Venda[] {
  const db = getDb()
  const vendas = db
    .prepare('SELECT * FROM vendas WHERE data = ? ORDER BY created_at DESC')
    .all(data) as Venda[]

  const stmtItens = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?')
  return vendas.map((v) => ({ ...v, itens: stmtItens.all(v.id) as ItemVenda[] }))
}

export function resumoDia(data: string): ResumoDia {
  const row = getDb()
    .prepare(`
      SELECT
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'cartao' THEN total ELSE 0 END), 0) as total_cartao,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'debito' THEN total ELSE 0 END), 0) as total_debito,
        COUNT(*) as quantidade_vendas
      FROM vendas WHERE data = ?
    `)
    .get(data)

  return row as ResumoDia
}

export function atualizarVenda(
  id: number,
  dados: { itens: ItemCarrinho[]; forma_pagamento: string; desconto: number }
): Venda {
  const db = getDb()
  const vendaAtual = db.prepare('SELECT * FROM vendas WHERE id = ?').get(id) as Venda
  if (!vendaAtual) throw new Error('Venda não encontrada')

  const itensAtuais = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?').all(id) as ItemVenda[]

  const subtotal = dados.itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const desconto = Math.min(dados.desconto, subtotal)
  const total = Math.max(0, subtotal - desconto)

  const atualizar = db.transaction(() => {
    // Restaura estoque dos itens antigos
    const stmtRestaurar = db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?')
    for (const item of itensAtuais) {
      stmtRestaurar.run(item.quantidade, item.produto_id)
    }

    // Remove itens antigos
    db.prepare('DELETE FROM itens_venda WHERE venda_id = ?').run(id)

    // Insere novos itens e debita estoque
    const stmtItem = db.prepare(
      'INSERT INTO itens_venda (venda_id, produto_id, nome_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)'
    )
    const stmtDebitar = db.prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ?')

    for (const item of dados.itens) {
      stmtItem.run(id, item.produto_id, item.nome_produto, item.quantidade, item.preco_unitario)
      stmtDebitar.run(item.quantidade, item.produto_id)
    }

    // Atualiza venda
    db.prepare('UPDATE vendas SET total = ?, desconto = ?, forma_pagamento = ? WHERE id = ?').run(
      total,
      desconto,
      dados.forma_pagamento,
      id
    )

    return db.prepare('SELECT * FROM vendas WHERE id = ?').get(id) as Venda
  })

  return atualizar()
}

export function excluirVenda(id: number): void {
  const db = getDb()
  const itens = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?').all(id) as ItemVenda[]

  const excluir = db.transaction(() => {
    const stmtRestaurar = db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id = ?')
    for (const item of itens) {
      stmtRestaurar.run(item.quantidade, item.produto_id)
    }
    db.prepare('DELETE FROM itens_venda WHERE venda_id = ?').run(id)
    db.prepare('DELETE FROM vendas WHERE id = ?').run(id)
  })

  excluir()
}

export function listarVendasPorPeriodo(dataInicio: string, dataFim: string): Venda[] {
  const db = getDb()
  const vendas = db
    .prepare('SELECT * FROM vendas WHERE data BETWEEN ? AND ? ORDER BY data DESC, created_at DESC')
    .all(dataInicio, dataFim) as Venda[]

  const stmtItens = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?')
  return vendas.map((v) => ({ ...v, itens: stmtItens.all(v.id) as ItemVenda[] }))
}
