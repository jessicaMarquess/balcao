import { is } from '@electron-toolkit/utils'
import { getDb } from './index'

const PRODUTOS_SEED = [
  { nome: 'Capa para iPhone 15', preco: 25.0, estoque: 30 },
  { nome: 'Capa para Samsung A54', preco: 22.0, estoque: 25 },
  { nome: 'Película de Vidro iPhone 15', preco: 15.0, estoque: 50 },
  { nome: 'Película de Vidro Samsung A54', preco: 12.0, estoque: 50 },
  { nome: 'Cabo USB-C 1m', preco: 18.0, estoque: 40 },
  { nome: 'Cabo Lightning 1m', preco: 18.0, estoque: 35 },
  { nome: 'Carregador 20W USB-C', preco: 45.0, estoque: 20 },
  { nome: 'Fone de Ouvido Bluetooth', preco: 89.0, estoque: 15 },
  { nome: 'Caixa de Som Bluetooth Mini', preco: 120.0, estoque: 10 },
  { nome: 'Caixa de Som Bluetooth Grande', preco: 250.0, estoque: 5 },
  { nome: 'Controle Remoto Universal TV', preco: 35.0, estoque: 20 },
  { nome: 'Receptor de TV Digital', preco: 180.0, estoque: 8 },
  { nome: 'Adaptador USB-C para HDMI', preco: 55.0, estoque: 12 },
  { nome: 'Suporte de Celular para Carro', preco: 30.0, estoque: 25 },
  { nome: 'Powerbank 10000mAh', preco: 95.0, estoque: 10 },
  { nome: 'Mouse sem Fio', preco: 60.0, estoque: 15 },
  { nome: 'Teclado Bluetooth', preco: 110.0, estoque: 8 },
  { nome: 'Smartwatch Básico', preco: 199.0, estoque: 6 },
  { nome: 'Película de Privacidade', preco: 20.0, estoque: 30 },
  { nome: 'Cabo HDMI 2m', preco: 28.0, estoque: 20 },
]

const FORMAS_PAGAMENTO = ['pix', 'cartao', 'dinheiro', 'debito'] as const

function dataString(diasAtras: number): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function aleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function escolher<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function rodarSeedDesenvolvimento(): void {
  if (!is.dev) return

  const db = getDb()
  const jaTemProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos').get() as {
    total: number
  }
  if (jaTemProdutos.total > 0) return

  const inserirProduto = db.prepare(
    'INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)'
  )
  const inserirVenda = db.prepare(
    "INSERT INTO vendas (data, total, desconto, forma_pagamento, created_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))"
  )
  const inserirItem = db.prepare(
    'INSERT INTO itens_venda (venda_id, produto_id, nome_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)'
  )
  const atualizarEstoque = db.prepare(
    'UPDATE produtos SET estoque = estoque - ? WHERE id = ?'
  )
  const inserirSaldo = db.prepare(
    'INSERT OR IGNORE INTO saldo_diario (data, valor) VALUES (?, ?)'
  )
  const getEstoque = db.prepare('SELECT estoque FROM produtos WHERE id = ?') as {
    get: (id: number) => { estoque: number } | undefined
  }

  const seed = db.transaction(() => {
    // Insere produtos
    const ids: number[] = []
    for (const p of PRODUTOS_SEED) {
      const r = inserirProduto.run(p.nome, p.preco, p.estoque)
      ids.push(Number(r.lastInsertRowid))
    }

    // Gera vendas para os últimos 30 dias (excluindo hoje)
    for (let dia = 30; dia >= 1; dia--) {
      const data = dataString(dia)
      const qtdVendas = aleatorio(3, 12)

      // Saldo inicial do dia (caixa)
      inserirSaldo.run(data, aleatorio(100, 500))

      for (let v = 0; v < qtdVendas; v++) {
        const forma = escolher(FORMAS_PAGAMENTO)
        const qtdItens = aleatorio(1, 3)
        const desconto = Math.random() < 0.15 ? aleatorio(5, 20) : 0

        const itensDaVenda: { produtoId: number; nome: string; preco: number; qtd: number }[] = []
        for (let i = 0; i < qtdItens; i++) {
          const idx = aleatorio(0, PRODUTOS_SEED.length - 1)
          const produtoId = ids[idx]
          const produto = PRODUTOS_SEED[idx]
          const estoqueAtual = getEstoque.get(produtoId)?.estoque ?? 0
          if (estoqueAtual <= 0) continue
          const qtd = Math.min(aleatorio(1, 2), estoqueAtual)
          itensDaVenda.push({ produtoId, nome: produto.nome, preco: produto.preco, qtd })
        }

        if (itensDaVenda.length === 0) continue

        const subtotal = itensDaVenda.reduce((s, i) => s + i.preco * i.qtd, 0)
        const descontoReal = Math.min(desconto, subtotal)
        const total = Math.max(0, subtotal - descontoReal)

        const venda = inserirVenda.run(data, total, descontoReal, forma)
        const vendaId = venda.lastInsertRowid

        for (const item of itensDaVenda) {
          inserirItem.run(vendaId, item.produtoId, item.nome, item.qtd, item.preco)
          atualizarEstoque.run(item.qtd, item.produtoId)
        }
      }
    }
  })

  seed()
  console.log('[seed] Banco populado com dados de desenvolvimento.')
}
