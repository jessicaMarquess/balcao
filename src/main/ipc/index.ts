import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { listarProdutos, criarProduto, atualizarProduto, deletarProduto } from '../db/produtos'
import { registrarVenda, listarVendasPorData, resumoDia, listarVendasPorPeriodo, atualizarVenda, excluirVenda } from '../db/vendas'
import { getSaldoDia, setSaldoDia, existeSaldoDia } from '../db/saldo'
import { listarItens, adicionarItem, atualizarQuantidade, toggleItem, deletarItem, limparConcluidos, limparTodos } from '../db/lista-compras'
import { getRelatorioDia, getRelatorioComparativo, getEstatisticas } from '../db/relatorio'
import type { NovaVenda, NovoProduto } from '../../renderer/src/types'

export function registrarHandlers(): void {
  // Produtos
  ipcMain.handle('produtos:listar', () => listarProdutos())
  ipcMain.handle('produtos:criar', (_e, dados: NovoProduto) => criarProduto(dados))
  ipcMain.handle('produtos:atualizar', (_e, id: number, dados: Partial<NovoProduto>) =>
    atualizarProduto(id, dados)
  )
  ipcMain.handle('produtos:deletar', (_e, id: number) => {
    deletarProduto(id)
    return true
  })

  // Vendas
  ipcMain.handle('vendas:registrar', (_e, dados: NovaVenda) => registrarVenda(dados))
  ipcMain.handle('vendas:listar', (_e, data: string) => listarVendasPorData(data))
  ipcMain.handle('vendas:resumo-dia', (_e, data: string) => resumoDia(data))
  ipcMain.handle('vendas:listar-periodo', (_e, dataInicio: string, dataFim: string) =>
    listarVendasPorPeriodo(dataInicio, dataFim)
  )
  ipcMain.handle('vendas:atualizar', (_e, id: number, dados: { itens: NovaVenda['itens']; forma_pagamento: string; desconto: number }) =>
    atualizarVenda(id, dados)
  )
  ipcMain.handle('vendas:excluir', (_e, id: number) => {
    excluirVenda(id)
    return true
  })

  // Saldo diário
  ipcMain.handle('dia:get-saldo', (_e, data: string) => getSaldoDia(data))
  ipcMain.handle('dia:existe-saldo', (_e, data: string) => existeSaldoDia(data))
  ipcMain.handle('dia:set-saldo', (_e, data: string, valor: number) => {
    setSaldoDia(data, valor)
    return true
  })

  // Relatório do dia
  ipcMain.handle('dia:relatorio', (_e, data: string) => getRelatorioDia(data))
  ipcMain.handle('relatorio:comparativo', (_e, dataInicio: string, dataFim: string) =>
    getRelatorioComparativo(dataInicio, dataFim)
  )
  ipcMain.handle('relatorio:estatisticas', (_e, dataInicio: string, dataFim: string) =>
    getEstatisticas(dataInicio, dataFim)
  )

  // Lista de compras
  ipcMain.handle('lista-compras:listar', () => listarItens())
  ipcMain.handle('lista-compras:adicionar', (_e, nome: string, quantidade: number) =>
    adicionarItem(nome, quantidade)
  )
  ipcMain.handle('lista-compras:atualizar-quantidade', (_e, id: number, quantidade: number) => {
    atualizarQuantidade(id, quantidade)
    return true
  })
  ipcMain.handle('lista-compras:toggle', (_e, id: number) => {
    toggleItem(id)
    return true
  })
  ipcMain.handle('lista-compras:deletar', (_e, id: number) => {
    deletarItem(id)
    return true
  })
  ipcMain.handle('lista-compras:limpar-concluidos', () => {
    limparConcluidos()
    return true
  })
  ipcMain.handle('lista-compras:limpar-todos', () => {
    limparTodos()
    return true
  })
  ipcMain.handle('lista-compras:exportar-pdf', async (_e, itens: { nome: string; quantidade: number }[]) => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR')
    const dataNome = dataFormatada.replace(/\//g, '-')
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar lista de compras',
      defaultPath: join(app.getPath('documents'), `lista-compras-${dataNome}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { cancelado: true }

    const linhasItens = itens
      .map(
        (i) => `<div class="item">
          <div class="check"></div>
          <span class="nome">${i.nome}</span>
          <span class="qtd">(${i.quantidade})</span>
        </div>`
      )
      .join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: sans-serif; font-size: 13px; color: #111; background: white; padding: 32px; }
      .pagina { font-size: 11px; color: #888; margin-bottom: 8px; }
      .card { border: 1px solid #bbb; border-radius: 6px; padding: 24px; }
      .titulo { font-size: 14px; font-weight: 600; margin-bottom: 20px; }
      .item { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
      .check { width: 14px; height: 14px; border: 1.5px solid #555; border-radius: 2px; flex-shrink: 0; }
      .nome { flex: 1; }
      .qtd { color: #888; }
    </style></head><body>
      <div class="pagina">Página 01</div>
      <div class="card">
        <div class="titulo">Lista de compras dia ${dataFormatada}</div>
        ${linhasItens}
      </div>
    </body></html>`

    const win = new BrowserWindow({ show: false })
    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const buffer = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: false })
      writeFileSync(filePath, buffer)
      return { sucesso: true }
    } catch (err) {
      return { sucesso: false, erro: err instanceof Error ? err.message : String(err) }
    } finally {
      win.destroy()
    }
  })

  // Exportar CSV
  ipcMain.handle('exportar:csv', async (_e, dataInicio: string, dataFim: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar vendas',
      defaultPath: join(app.getPath('documents'), `vendas-${dataInicio}-${dataFim}.csv`),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })

    if (canceled || !filePath) return false

    const vendas = listarVendasPorPeriodo(dataInicio, dataFim)
    const linhas = ['ID,Data,Forma Pagamento,Total,Produto,Quantidade,Preço Unitário,Subtotal']

    for (const venda of vendas) {
      for (const item of venda.itens ?? []) {
        linhas.push(
          [
            venda.id,
            venda.data,
            venda.forma_pagamento,
            venda.total.toFixed(2),
            `"${item.nome_produto}"`,
            item.quantidade,
            item.preco_unitario.toFixed(2),
            (item.quantidade * item.preco_unitario).toFixed(2)
          ].join(',')
        )
      }
    }

    writeFileSync(filePath, linhas.join('\n'), 'utf-8')
    return true
  })
}
