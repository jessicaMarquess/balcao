import { read, utils } from 'xlsx'
import { createHash, randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  ConfirmacaoImportacao,
  LinhaImportacao,
  PreviaImportacao
} from '../../shared/importacao'

export interface PlanilhaImportacao extends PreviaImportacao {
  hash: string
}
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}
function numero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw new Error(`${campo}: informe um número maior ou igual a 0 na planilha.`)
  }
  return valor
}
function quantidade(valor: unknown, campo: string): number {
  const n = numero(valor, campo)
  if (!Number.isSafeInteger(n) || n < 1)
    throw new Error(`${campo}: a quantidade deve ser inteira e maior que 0.`)
  return n
}
export function lerPlanilha(buffer: Buffer, arquivo: string): PlanilhaImportacao {
  if (buffer.length > 10 * 1024 * 1024) throw new Error('A planilha deve ter no máximo 10 MB.')
  const livro = read(buffer, { type: 'buffer', sheetRows: 5001 })
  const controle = livro.Sheets['Controle Loja']
  const compras = livro.Sheets['Lista de Compras']
  if (!controle && !compras)
    throw new Error(
      'Planilha não reconhecida. Use o modelo Movimento Loja ou Agenda Financeira da J&C.'
    )
  const aba = controle ?? compras
  const linhas = utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: null, blankrows: true })
  if (linhas.length > 5000) throw new Error('A planilha excede o limite de 5.000 linhas.')
  const resultado: PlanilhaImportacao = {
    token: randomUUID(),
    hash: createHash('sha256').update(buffer).digest('hex'),
    arquivo,
    tipo: controle ? 'vendas' : 'compras',
    linhas: [],
    saldo: 0,
    avisos: []
  }
  if (controle) {
    const cabecalho = linhas.findIndex(
      (r) => texto(r[1]) === 'Descrição/Número' && texto(r[2]) === 'PIX'
    )
    if (cabecalho < 0) throw new Error('Cabeçalho de vendas não encontrado.')
    resultado.saldo = numero(linhas[0]?.[9] ?? 0, 'Saldo inicial')
    resultado.avisos.push(
      'Informe a data completa: o nome do arquivo não informa mês e ano.',
      'Cada linha será uma venda histórica, sem alterar o estoque atual. Confira as formas de pagamento sugeridas.'
    )
    for (let i = cabecalho + 1; i < linhas.length; i++) {
      const r = linhas[i]
      const nome = texto(r[1])
      const valores = [2, 3, 4, 5, 6, 8].map((col) =>
        numero(typeof r[col] === 'string' && !texto(r[col]) ? 0 : (r[col] ?? 0), `Linha ${i + 1}`)
      )
      if (r[7] !== null && r[7] !== undefined && numero(r[7], `Retirada na linha ${i + 1}`) > 0) {
        throw new Error(
          `Linha ${i + 1}: retiradas ainda não são suportadas. Nenhum dado foi importado.`
        )
      }
      if (!nome && valores.every((v) => v === 0)) continue
      if (!nome || nome.length > 200)
        throw new Error(`Linha ${i + 1}: descrição ausente ou acima de 200 caracteres.`)
      const preenchidos = valores.filter((v) => v > 0)
      if (preenchidos.length > 1)
        throw new Error(
          `Linha ${i + 1}: há valores em várias colunas. Separe os pagamentos antes de importar.`
        )
      const total = valores.reduce((a, b) => a + b, 0)
      const descricao = `${nome} ${texto(r[9])}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
      const pagamento =
        valores[0] > 0
          ? 'pix'
          : /\bdebito\b/.test(descricao)
            ? 'debito'
            : valores[5] > 0 || /\bcredito\b/.test(descricao)
              ? 'cartao'
              : 'dinheiro'
      resultado.linhas.push({
        linha: i + 1,
        nome,
        quantidade: quantidade(r[0], `Linha ${i + 1}`),
        total,
        pagamento
      })
    }
  } else {
    resultado.avisos.push(
      'Revise e selecione apenas produtos: esta aba contém categorias e anotações. Quantidades em branco foram sugeridas como 1.',
      'As abas de contas a pagar, mapa financeiro, notas e recibos não serão importadas.'
    )
    const cabecalho = linhas.findIndex((r) => texto(r[0]) === 'Quant.' && texto(r[1]) === 'Produto')
    if (cabecalho < 0) throw new Error('Cabeçalho da lista de compras não encontrado.')
    for (let i = cabecalho + 1; i < linhas.length; i++) {
      for (const coluna of [0, 3]) {
        const nome = texto(linhas[i][coluna + 1])
        if (!nome) continue
        if (nome.length > 200) throw new Error(`Linha ${i + 1}: nome acima de 200 caracteres.`)
        resultado.linhas.push({
          linha: i + 1,
          nome,
          quantidade: quantidade(linhas[i][coluna] ?? 1, `Linha ${i + 1}`),
          total: 0,
          pagamento: 'dinheiro'
        })
      }
    }
  }
  if (!resultado.linhas.length)
    throw new Error('Esta planilha está vazia. Nenhum registro para importar.')
  return resultado
}

export function gravarImportacao(
  db: Database.Database,
  previa: PlanilhaImportacao,
  dados: ConfirmacaoImportacao
): number {
  if (
    !dados ||
    dados.token !== previa.token ||
    !Array.isArray(dados.linhas) ||
    !dados.linhas.length ||
    dados.linhas.length > previa.linhas.length
  )
    throw new Error('Selecione os registros que deseja importar.')
  if (previa.tipo === 'vendas') {
    if (typeof dados.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data))
      throw new Error('Informe uma data válida para as vendas.')
    const d = new Date(`${dados.data}T00:00:00Z`)
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== dados.data)
      throw new Error('Informe uma data válida para as vendas.')
  }
  const indices = new Set<number>()
  const escolhidas = dados.linhas.map((item): LinhaImportacao => {
    if (
      !item ||
      !Number.isSafeInteger(item.indice) ||
      !previa.linhas[item.indice] ||
      indices.has(item.indice)
    )
      throw new Error('Seleção de linhas inválida.')
    indices.add(item.indice)
    if (!['pix', 'dinheiro', 'cartao', 'debito'].includes(item.pagamento))
      throw new Error('Forma de pagamento inválida.')
    return {
      ...previa.linhas[item.indice],
      quantidade: quantidade(item.quantidade, 'Quantidade'),
      pagamento: item.pagamento
    }
  })
  return db.transaction(() => {
    if (db.prepare('SELECT hash FROM importacoes WHERE hash = ?').get(previa.hash))
      throw new Error('Este arquivo já foi importado. Nenhum registro foi duplicado.')
    const buscar = db.prepare(
      'SELECT id FROM produtos WHERE nome = ? COLLATE NOCASE ORDER BY id LIMIT 1'
    )
    const criar = db.prepare('INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, 0)')
    for (const linha of escolhidas) {
      if (previa.tipo === 'compras') {
        db.prepare('INSERT INTO lista_compras (nome, quantidade) VALUES (?, ?)').run(
          linha.nome,
          linha.quantidade
        )
        continue
      }
      const produto = buscar.get(linha.nome) as { id: number } | undefined
      const preco = linha.total / linha.quantidade
      const id = produto?.id ?? Number(criar.run(linha.nome, preco).lastInsertRowid)
      const venda = db
        .prepare(
          'INSERT INTO vendas (data, total, desconto, forma_pagamento, importada) VALUES (?, ?, 0, ?, 1)'
        )
        .run(dados.data, linha.total, linha.pagamento)
      db.prepare(
        'INSERT INTO itens_venda (venda_id, produto_id, nome_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)'
      ).run(venda.lastInsertRowid, id, linha.nome, linha.quantidade, preco)
    }
    if (previa.tipo === 'vendas')
      db.prepare('INSERT OR IGNORE INTO saldo_diario (data, valor) VALUES (?, ?)').run(
        dados.data,
        previa.saldo
      )
    db.prepare('INSERT INTO importacoes (hash, arquivo) VALUES (?, ?)').run(
      previa.hash,
      previa.arquivo
    )
    return escolhidas.length
  })()
}
