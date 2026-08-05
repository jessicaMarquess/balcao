import type { Estatisticas, RelatorioComparativo, RelatorioDia } from '../../renderer/src/types'
import { getDb } from './index'
import { getSaldoDia } from './saldo'

export function getRelatorioDia(data: string): RelatorioDia {
  const db = getDb()

  const resumo = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(total), 0) as totalGeral,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END), 0) as totalPix,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'cartao' THEN total ELSE 0 END), 0) as totalCartao,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) as totalDinheiro,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'debito' THEN total ELSE 0 END), 0) as totalDebito,
      COUNT(*) as quantidadeVendas
    FROM vendas WHERE data = ?
  `
    )
    .get(data) as Omit<RelatorioDia, 'saldoInicial' | 'maisVendidos' | 'estoquebaixo'>

  const maisVendidos = db
    .prepare(
      `
    SELECT iv.nome_produto, SUM(iv.quantidade) as total_quantidade
    FROM itens_venda iv
    JOIN vendas v ON v.id = iv.venda_id
    WHERE v.data = ?
    GROUP BY iv.nome_produto
    ORDER BY total_quantidade DESC
    LIMIT 5
  `
    )
    .all(data) as { nome_produto: string; total_quantidade: number }[]

  const estoquebaixo = db
    .prepare(
      `
    SELECT id, nome, estoque FROM produtos
    WHERE ativo = 1 AND estoque <= 3
    ORDER BY estoque ASC
    LIMIT 10
  `
    )
    .all() as { id: number; nome: string; estoque: number }[]

  return {
    ...resumo,
    saldoInicial: getSaldoDia(data),
    maisVendidos,
    estoquebaixo
  }
}

export function getRelatorioComparativo(dataInicio: string, dataFim: string): RelatorioComparativo {
  const db = getDb()

  const dias = db
    .prepare(
      `SELECT
        data,
        COUNT(*) as quantidade,
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'cartao' THEN total ELSE 0 END), 0) as total_cartao,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento = 'debito' THEN total ELSE 0 END), 0) as total_debito
      FROM vendas
      WHERE data BETWEEN ? AND ?
      GROUP BY data
      ORDER BY data ASC`
    )
    .all(dataInicio, dataFim) as RelatorioComparativo['dias']

  const maisVendidos = db
    .prepare(
      `SELECT
        iv.nome_produto,
        SUM(iv.quantidade) as total_quantidade,
        SUM(iv.quantidade * iv.preco_unitario) as total_receita
      FROM itens_venda iv
      JOIN vendas v ON v.id = iv.venda_id
      WHERE v.data BETWEEN ? AND ?
      GROUP BY iv.nome_produto
      ORDER BY total_quantidade DESC
      LIMIT 8`
    )
    .all(dataInicio, dataFim) as RelatorioComparativo['maisVendidos']

  const estoqueBaixo = db
    .prepare(
      `SELECT id, nome, estoque FROM produtos
      WHERE ativo = 1 AND estoque <= 3
      ORDER BY estoque ASC LIMIT 8`
    )
    .all() as RelatorioComparativo['estoqueBaixo']

  return { dias, maisVendidos, estoqueBaixo }
}

export function getEstatisticas(dataInicio: string, dataFim: string): Estatisticas {
  const db = getDb()

  const porDiaSemana = db
    .prepare(
      `SELECT
        CAST(strftime('%w', data) AS INTEGER) as dia_semana,
        COUNT(*) as quantidade,
        COALESCE(SUM(total), 0) as total
      FROM vendas
      WHERE data BETWEEN ? AND ?
      GROUP BY dia_semana
      ORDER BY dia_semana`
    )
    .all(dataInicio, dataFim) as Estatisticas['porDiaSemana']

  const maisVendidos = db
    .prepare(
      `SELECT
        iv.nome_produto,
        SUM(iv.quantidade) as total_quantidade,
        SUM(iv.quantidade * iv.preco_unitario) as total_receita
      FROM itens_venda iv
      JOIN vendas v ON v.id = iv.venda_id
      WHERE v.data BETWEEN ? AND ?
      GROUP BY iv.nome_produto
      ORDER BY total_quantidade DESC
      LIMIT 10`
    )
    .all(dataInicio, dataFim) as Estatisticas['maisVendidos']

  const formaPagamento = db
    .prepare(
      `SELECT
        forma_pagamento as forma,
        COUNT(*) as quantidade,
        COALESCE(SUM(total), 0) as total
      FROM vendas
      WHERE data BETWEEN ? AND ?
      GROUP BY forma_pagamento
      ORDER BY total DESC`
    )
    .all(dataInicio, dataFim) as Estatisticas['formaPagamento']

  const resumo = db
    .prepare(
      `SELECT
        COALESCE(SUM(total), 0) as totalGeral,
        COUNT(*) as quantidadeVendas
      FROM vendas WHERE data BETWEEN ? AND ?`
    )
    .get(dataInicio, dataFim) as { totalGeral: number; quantidadeVendas: number }

  return { porDiaSemana, maisVendidos, formaPagamento, ...resumo }
}
