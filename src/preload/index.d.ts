import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Produto,
  Venda,
  ResumoDia,
  NovaVenda,
  NovoProduto,
  ItemCarrinho,
  ItemListaCompras,
  RelatorioDia,
  RelatorioComparativo,
  Estatisticas
} from '../renderer/src/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      produtos: {
        listar: () => Promise<Produto[]>
        criar: (dados: NovoProduto) => Promise<Produto>
        atualizar: (id: number, dados: Partial<NovoProduto>) => Promise<Produto>
        deletar: (id: number) => Promise<boolean>
      }
      vendas: {
        registrar: (dados: NovaVenda) => Promise<Venda>
        listar: (data: string) => Promise<Venda[]>
        resumoDia: (data: string) => Promise<ResumoDia>
        listarPeriodo: (dataInicio: string, dataFim: string) => Promise<Venda[]>
        atualizar: (id: number, dados: { itens: ItemCarrinho[]; forma_pagamento: string; desconto: number }) => Promise<Venda>
        excluir: (id: number) => Promise<boolean>
      }
      dia: {
        getSaldo: (data: string) => Promise<number>
        existeSaldo: (data: string) => Promise<boolean>
        setSaldo: (data: string, valor: number) => Promise<boolean>
        relatorio: (data: string) => Promise<RelatorioDia>
      }
      listaCompras: {
        listar: () => Promise<ItemListaCompras[]>
        adicionar: (nome: string, quantidade: number) => Promise<ItemListaCompras>
        atualizarQuantidade: (id: number, quantidade: number) => Promise<boolean>
        marcarComprado: (id: number, nome: string, quantidade: number) => Promise<boolean>
        deletar: (id: number) => Promise<boolean>
        limparTodos: () => Promise<boolean>
        exportarPdf: (itens: { nome: string; quantidade: number }[]) => Promise<{ cancelado: true } | { sucesso: true } | { sucesso: false; erro: string }>
      }
      relatorio: {
        comparativo: (dataInicio: string, dataFim: string) => Promise<RelatorioComparativo>
        estatisticas: (dataInicio: string, dataFim: string) => Promise<Estatisticas>
      }
      exportar: {
        csv: (dataInicio: string, dataFim: string) => Promise<boolean>
      }
      backup: {
        exportar: () => Promise<{ cancelado: true } | { sucesso: true } | { sucesso: false; erro: string }>
        importar: () => Promise<{ cancelado: true } | { sucesso: true } | { sucesso: false; erro: string }>
      }
    }
  }
}
