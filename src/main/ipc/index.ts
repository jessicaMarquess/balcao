import { lerPlanilha, gravarImportacao, type PlanilhaImportacao } from '../db/importacao'
import type { ConfirmacaoImportacao } from '../../shared/importacao'
import { ipcMain, dialog, app, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { join, basename, extname } from 'node:path'
import { copyFileSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { listarProdutos, criarProduto, atualizarProduto, deletarProduto } from '../db/produtos'
import {
  registrarVenda,
  listarVendasPorData,
  resumoDia,
  listarVendasPorPeriodo,
  atualizarVenda,
  excluirVenda
} from '../db/vendas'
import { closeDb, getDb, getDbPath } from '../db'
import { getSaldoDia, setSaldoDia, existeSaldoDia } from '../db/saldo'
import {
  listarItens,
  adicionarItem,
  atualizarQuantidade,
  marcarComprado,
  deletarItem,
  limparTodos
} from '../db/lista-compras'
import { getRelatorioDia, getRelatorioComparativo, getEstatisticas } from '../db/relatorio'
import type { NovaVenda, NovoProduto } from '../../renderer/src/types'

const FORMAS_PAGAMENTO = new Set(['pix', 'cartao', 'dinheiro', 'debito'])
const importacoesPendentes = new Map<number, PlanilhaImportacao>()

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

function validarOrigem(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame
  if (!frame || frame !== event.sender.mainFrame) throw new Error('Origem IPC invalida')

  const url = new URL(frame.url)
  const origemLocal = url.protocol === 'file:'
  const origemDesenvolvimento =
    !app.isPackaged &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')

  if (!origemLocal && !origemDesenvolvimento) throw new Error('Origem IPC nao autorizada')
}

function validarId(valor: unknown, campo = 'id'): asserts valor is number {
  if (!Number.isSafeInteger(valor) || (valor as number) <= 0) throw new Error(`${campo} invalido`)
}

function validarNumero(valor: unknown, campo: string, minimo = 0): asserts valor is number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < minimo) {
    throw new Error(`${campo} invalido`)
  }
}

function validarTexto(valor: unknown, campo: string, maximo = 200): asserts valor is string {
  if (typeof valor !== 'string' || valor.trim().length === 0 || valor.length > maximo) {
    throw new Error(`${campo} invalido`)
  }
}

function validarData(valor: unknown): asserts valor is string {
  if (typeof valor !== 'string' || !DATA_ISO.test(valor)) throw new Error('Data invalida')
  const data = new Date(`${valor}T00:00:00Z`)
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new Error('Data invalida')
  }
}

function validarPeriodo(inicio: unknown, fim: unknown): void {
  validarData(inicio)
  validarData(fim)
  if (inicio > fim) throw new Error('Periodo invalido')
}

function validarProduto(dados: unknown, parcial = false): asserts dados is NovoProduto {
  if (!dados || typeof dados !== 'object') throw new Error('Produto invalido')
  const produto = dados as Partial<NovoProduto>
  if (
    parcial &&
    produto.nome === undefined &&
    produto.preco === undefined &&
    produto.estoque === undefined
  ) {
    throw new Error('Nenhum campo informado')
  }
  if (!parcial || produto.nome !== undefined) validarTexto(produto.nome, 'Nome')
  if (!parcial || produto.preco !== undefined) validarNumero(produto.preco, 'Preco')
  if (!parcial || produto.estoque !== undefined) {
    validarNumero(produto.estoque, 'Estoque')
    if (!Number.isSafeInteger(produto.estoque)) throw new Error('Estoque invalido')
  }
}

function validarVenda(dados: unknown): asserts dados is NovaVenda {
  if (!dados || typeof dados !== 'object') throw new Error('Venda invalida')
  const venda = dados as Partial<NovaVenda>
  validarData(venda.data)
  validarNumero(venda.desconto, 'Desconto')
  if (typeof venda.forma_pagamento !== 'string' || !FORMAS_PAGAMENTO.has(venda.forma_pagamento)) {
    throw new Error('Forma de pagamento invalida')
  }
  if (!Array.isArray(venda.itens) || venda.itens.length === 0 || venda.itens.length > 100) {
    throw new Error('Itens da venda invalidos')
  }
  for (const item of venda.itens) {
    validarId(item.produto_id, 'Produto')
    validarTexto(item.nome_produto, 'Nome do produto')
    validarNumero(item.preco_unitario, 'Preco unitario')
    validarId(item.quantidade, 'Quantidade')
  }
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caractere) => {
    const entidades: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entidades[caractere]
  })
}

export function registrarHandlers(): void {
  // Produtos
  ipcMain.handle('produtos:listar', (event) => {
    validarOrigem(event)
    return listarProdutos()
  })
  ipcMain.handle('produtos:criar', (event, dados: NovoProduto) => {
    validarOrigem(event)
    validarProduto(dados)
    return criarProduto({ ...dados, nome: dados.nome.trim() })
  })
  ipcMain.handle('produtos:atualizar', (event, id: number, dados: Partial<NovoProduto>) => {
    validarOrigem(event)
    validarId(id)
    validarProduto(dados, true)
    return atualizarProduto(
      id,
      dados.nome === undefined ? dados : { ...dados, nome: dados.nome.trim() }
    )
  })
  ipcMain.handle('produtos:deletar', (_e, id: number) => {
    validarOrigem(_e)
    validarId(id)
    deletarProduto(id)
    return true
  })

  // Vendas
  ipcMain.handle('vendas:registrar', (event, dados: NovaVenda) => {
    validarOrigem(event)
    validarVenda(dados)
    return registrarVenda(dados)
  })
  ipcMain.handle('vendas:listar', (event, data: string) => {
    validarOrigem(event)
    validarData(data)
    return listarVendasPorData(data)
  })
  ipcMain.handle('vendas:resumo-dia', (event, data: string) => {
    validarOrigem(event)
    validarData(data)
    return resumoDia(data)
  })
  ipcMain.handle('vendas:listar-periodo', (event, dataInicio: string, dataFim: string) => {
    validarOrigem(event)
    validarPeriodo(dataInicio, dataFim)
    return listarVendasPorPeriodo(dataInicio, dataFim)
  })
  ipcMain.handle(
    'vendas:atualizar',
    (
      _e,
      id: number,
      dados: { itens: NovaVenda['itens']; forma_pagamento: string; desconto: number }
    ) => {
      validarOrigem(_e)
      validarId(id)
      validarVenda({ ...dados, data: '2000-01-01' })
      return atualizarVenda(id, dados)
    }
  )
  ipcMain.handle('vendas:excluir', (_e, id: number) => {
    validarOrigem(_e)
    validarId(id)
    excluirVenda(id)
    return true
  })

  // Saldo diário
  ipcMain.handle('dia:get-saldo', (_e, data: string) => {
    validarOrigem(_e)
    validarData(data)
    return getSaldoDia(data)
  })
  ipcMain.handle('dia:existe-saldo', (_e, data: string) => {
    validarOrigem(_e)
    validarData(data)
    return existeSaldoDia(data)
  })
  ipcMain.handle('dia:set-saldo', (_e, data: string, valor: number) => {
    validarOrigem(_e)
    validarData(data)
    validarNumero(valor, 'Saldo')
    setSaldoDia(data, valor)
    return true
  })

  // Relatório do dia
  ipcMain.handle('dia:relatorio', (_e, data: string) => {
    validarOrigem(_e)
    validarData(data)
    return getRelatorioDia(data)
  })
  ipcMain.handle('relatorio:comparativo', (_e, dataInicio: string, dataFim: string) => {
    validarOrigem(_e)
    validarPeriodo(dataInicio, dataFim)
    return getRelatorioComparativo(dataInicio, dataFim)
  })
  ipcMain.handle('relatorio:estatisticas', (_e, dataInicio: string, dataFim: string) => {
    validarOrigem(_e)
    validarPeriodo(dataInicio, dataFim)
    return getEstatisticas(dataInicio, dataFim)
  })

  // Lista de compras
  ipcMain.handle('lista-compras:listar', (event) => {
    validarOrigem(event)
    return listarItens()
  })
  ipcMain.handle('lista-compras:adicionar', (_e, nome: string, quantidade: number) => {
    validarOrigem(_e)
    validarTexto(nome, 'Nome')
    validarId(quantidade, 'Quantidade')
    return adicionarItem(nome.trim(), quantidade)
  })
  ipcMain.handle('lista-compras:atualizar-quantidade', (_e, id: number, quantidade: number) => {
    validarOrigem(_e)
    validarId(id)
    validarId(quantidade, 'Quantidade')
    atualizarQuantidade(id, quantidade)
    return true
  })
  ipcMain.handle(
    'lista-compras:marcar-comprado',
    (_e, id: number, nome: string, quantidade: number) => {
      validarOrigem(_e)
      validarId(id)
      validarTexto(nome, 'Nome')
      validarId(quantidade, 'Quantidade')
      marcarComprado(id, nome, quantidade)
      return true
    }
  )
  ipcMain.handle('lista-compras:deletar', (_e, id: number) => {
    validarOrigem(_e)
    validarId(id)
    deletarItem(id)
    return true
  })
  ipcMain.handle('lista-compras:limpar-todos', (event) => {
    validarOrigem(event)
    limparTodos()
    return true
  })
  ipcMain.handle(
    'lista-compras:exportar-pdf',
    async (_e, itens: { nome: string; quantidade: number }[]) => {
      validarOrigem(_e)
      if (!Array.isArray(itens) || itens.length > 1000) throw new Error('Lista invalida')
      for (const item of itens) {
        validarTexto(item?.nome, 'Nome')
        validarId(item?.quantidade, 'Quantidade')
      }
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
          <span class="nome">${escaparHtml(i.nome)}</span>
          <span class="qtd">(${i.quantidade})</span>
        </div>`
        )
        .join('')

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
    <style>
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

      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      })
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
    }
  )

  // Backup
  ipcMain.handle('backup:exportar', async (event) => {
    validarOrigem(event)
    const dataFormatada = new Date().toISOString().slice(0, 10)
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar backup',
      defaultPath: join(app.getPath('documents'), `balcao-backup-${dataFormatada}.db`),
      filters: [{ name: 'Backup do Balcão', extensions: ['db'] }]
    })
    if (canceled || !filePath) return { cancelado: true }
    try {
      copyFileSync(getDbPath(), filePath)
      return { sucesso: true }
    } catch (err) {
      return { sucesso: false, erro: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('backup:importar', async (event) => {
    validarOrigem(event)
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Restaurar backup ou importar planilha',
      filters: [
        { name: 'Backup ou planilha', extensions: ['db', 'ods'] },
        { name: 'Planilha OpenDocument', extensions: ['ods'] },
        { name: 'Backup do Balcão', extensions: ['db'] }
      ],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { cancelado: true }
    try {
      importacoesPendentes.delete(event.sender.id)
      if (extname(filePaths[0]).toLowerCase() === '.ods') {
        if (statSync(filePaths[0]).size > 10 * 1024 * 1024)
          throw new Error('A planilha deve ter no máximo 10 MB.')
        const planilha = lerPlanilha(readFileSync(filePaths[0]), basename(filePaths[0]))
        importacoesPendentes.set(event.sender.id, planilha)
        const { token, arquivo, tipo, linhas, saldo, avisos } = planilha
        const previa = { token, arquivo, tipo, linhas, saldo, avisos }
        return { previa }
      }
      if (extname(filePaths[0]).toLowerCase() !== '.db')
        throw new Error('Selecione um arquivo .db ou .ods.')
      closeDb()
      copyFileSync(filePaths[0], getDbPath())
      getDb()
      return { sucesso: true }
    } catch (err) {
      getDb()
      return { sucesso: false, erro: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('backup:confirmar-planilha', (event, dados: ConfirmacaoImportacao) => {
    validarOrigem(event)
    try {
      const previa = importacoesPendentes.get(event.sender.id)
      if (!previa) throw new Error('Selecione a planilha novamente.')
      gravarImportacao(getDb(), previa, dados)
      importacoesPendentes.delete(event.sender.id)
      return { sucesso: true }
    } catch (err) {
      return {
        sucesso: false,
        erro: err instanceof Error ? err.message : 'Não foi possível importar a planilha.'
      }
    }
  })

  // Exportar CSV
  ipcMain.handle('exportar:csv', async (_e, dataInicio: string, dataFim: string) => {
    validarOrigem(_e)
    validarPeriodo(dataInicio, dataFim)
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
