import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { NovaVenda, NovoProduto, ItemCarrinho } from '../renderer/src/types'

const api = {
  produtos: {
    listar: () => ipcRenderer.invoke('produtos:listar'),
    criar: (dados: NovoProduto) => ipcRenderer.invoke('produtos:criar', dados),
    atualizar: (id: number, dados: Partial<NovoProduto>) =>
      ipcRenderer.invoke('produtos:atualizar', id, dados),
    deletar: (id: number) => ipcRenderer.invoke('produtos:deletar', id)
  },
  vendas: {
    registrar: (dados: NovaVenda) => ipcRenderer.invoke('vendas:registrar', dados),
    listar: (data: string) => ipcRenderer.invoke('vendas:listar', data),
    resumoDia: (data: string) => ipcRenderer.invoke('vendas:resumo-dia', data),
    listarPeriodo: (dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('vendas:listar-periodo', dataInicio, dataFim),
    atualizar: (id: number, dados: { itens: ItemCarrinho[]; forma_pagamento: string; desconto: number }) =>
      ipcRenderer.invoke('vendas:atualizar', id, dados),
    excluir: (id: number) => ipcRenderer.invoke('vendas:excluir', id)
  },
  dia: {
    getSaldo: (data: string) => ipcRenderer.invoke('dia:get-saldo', data),
    existeSaldo: (data: string) => ipcRenderer.invoke('dia:existe-saldo', data),
    setSaldo: (data: string, valor: number) => ipcRenderer.invoke('dia:set-saldo', data, valor),
    relatorio: (data: string) => ipcRenderer.invoke('dia:relatorio', data)
  },
  relatorio: {
    comparativo: (dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('relatorio:comparativo', dataInicio, dataFim),
    estatisticas: (dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('relatorio:estatisticas', dataInicio, dataFim)
  },
  listaCompras: {
    listar: () => ipcRenderer.invoke('lista-compras:listar'),
    adicionar: (nome: string, quantidade: number) =>
      ipcRenderer.invoke('lista-compras:adicionar', nome, quantidade),
    atualizarQuantidade: (id: number, quantidade: number) =>
      ipcRenderer.invoke('lista-compras:atualizar-quantidade', id, quantidade),
    marcarComprado: (id: number, nome: string, quantidade: number) =>
      ipcRenderer.invoke('lista-compras:marcar-comprado', id, nome, quantidade),
    deletar: (id: number) => ipcRenderer.invoke('lista-compras:deletar', id),
    limparTodos: () => ipcRenderer.invoke('lista-compras:limpar-todos'),
    exportarPdf: (itens: { nome: string; quantidade: number }[]) =>
      ipcRenderer.invoke('lista-compras:exportar-pdf', itens)
  },
  exportar: {
    csv: (dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('exportar:csv', dataInicio, dataFim)
  },
  backup: {
    exportar: () => ipcRenderer.invoke('backup:exportar'),
    importar: () => ipcRenderer.invoke('backup:importar')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
