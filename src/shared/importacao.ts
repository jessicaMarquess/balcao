export type PagamentoImportacao = 'dinheiro' | 'pix' | 'cartao' | 'debito'
export interface LinhaImportacao {
  linha: number
  nome: string
  quantidade: number
  total: number
  pagamento: PagamentoImportacao
}
export interface PreviaImportacao {
  token: string
  arquivo: string
  tipo: 'vendas' | 'compras'
  linhas: LinhaImportacao[]
  saldo: number
  avisos: string[]
}
export interface ConfirmacaoImportacao {
  token: string
  data: string
  linhas: { indice: number; quantidade: number; pagamento: PagamentoImportacao }[]
}
export type ResultadoImportacao =
  | { cancelado: true }
  | { sucesso: true }
  | { sucesso: false; erro: string }
  | { previa: PreviaImportacao }
