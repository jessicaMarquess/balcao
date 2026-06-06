export interface Produto {
  id: number
  nome: string
  preco: number
  estoque: number
  ativo: number
}

export interface ItemVenda {
  id?: number
  venda_id?: number
  produto_id: number
  nome_produto: string
  quantidade: number
  preco_unitario: number
}

export interface Venda {
  id: number
  data: string
  total: number
  desconto: number
  forma_pagamento: 'pix' | 'cartao' | 'dinheiro'
  created_at: string
  itens?: ItemVenda[]
}

export interface ItemCarrinho {
  produto_id: number
  nome_produto: string
  preco_unitario: number
  quantidade: number
}

export interface ResumoDia {
  total: number
  total_pix: number
  total_cartao: number
  total_dinheiro: number
  quantidade_vendas: number
}

export interface NovaVenda {
  itens: ItemCarrinho[]
  forma_pagamento: 'pix' | 'cartao' | 'dinheiro'
  desconto: number
  data: string
}

export interface NovoProduto {
  nome: string
  preco: number
  estoque: number
}

export interface ItemListaCompras {
  id: number
  nome: string
  quantidade: number
  concluido: number
  created_at: string
}

export interface RelatorioDia {
  totalGeral: number
  totalPix: number
  totalCartao: number
  totalDinheiro: number
  saldoInicial: number
  quantidadeVendas: number
  maisVendidos: { nome_produto: string; total_quantidade: number }[]
  estoquebaixo: { id: number; nome: string; estoque: number }[]
}

export interface DiaSummary {
  data: string
  total: number
  quantidade: number
  total_pix: number
  total_cartao: number
  total_dinheiro: number
}

export interface EstatDiaSemana {
  dia_semana: number
  quantidade: number
  total: number
}

export interface Estatisticas {
  porDiaSemana: EstatDiaSemana[]
  maisVendidos: { nome_produto: string; total_quantidade: number; total_receita: number }[]
  formaPagamento: { forma: string; total: number; quantidade: number }[]
  totalGeral: number
  quantidadeVendas: number
}

export interface RelatorioComparativo {
  dias: DiaSummary[]
  maisVendidos: { nome_produto: string; total_quantidade: number; total_receita: number }[]
  estoqueBaixo: { id: number; nome: string; estoque: number }[]
}
