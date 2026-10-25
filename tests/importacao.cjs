/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/explicit-function-return-type -- Teste Node CommonJS executado pelo runtime nativo do Electron. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const Module = require('node:module')
if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process')
  const result = spawnSync(require('electron'), [__filename], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  })
  process.exit(result.status ?? 1)
}
const ts = require('typescript')
const XLSX = require('xlsx')
const root = path.resolve(__dirname, '..')
const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'balcao-importacao-'))
function carregar(arquivo, mocks = {}) {
  const filename = path.join(root, arquivo)
  const mod = new Module(filename)
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = mod.require.bind(mod)
  mod.require = (id) => (id in mocks ? mocks[id] : original(id))
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
    }).outputText,
    filename
  )
  return mod.exports
}
const banco = carregar('src/main/db/index.ts', { electron: { app: { getPath: () => temporario } } })
try {
  const { lerPlanilha, gravarImportacao } = carregar('src/main/db/importacao.ts')
  const { atualizarVenda, excluirVenda } = carregar('src/main/db/vendas.ts', { './index': banco })
  banco.getDb()
  banco.closeDb()
  const aberto = banco.getDb() // Migração é idempotente.
  assert.ok(
    aberto
      .prepare('PRAGMA table_info(vendas)')
      .all()
      .some((c) => c.name === 'importada')
  )
  const totaisEsperados = {
    '01': 95,
    '03': 308,
    '04': 505,
    '05': 180,
    '06': 219,
    '07': 265,
    '08': 361
  }
  let vendas = 0
  let total = 0
  for (const arquivo of fs.readdirSync(path.join(root, 'arquivos_testes'))) {
    const buffer = fs.readFileSync(path.join(root, 'arquivos_testes', arquivo))
    if (arquivo.endsWith(' dia.ods')) {
      assert.throws(() => lerPlanilha(buffer, arquivo), /vazia/)
      continue
    }
    const previa = lerPlanilha(buffer, arquivo)
    const dados = {
      token: previa.token,
      data: '2025-11-01',
      linhas: previa.linhas.map((l, indice) => ({
        indice,
        quantidade: l.quantidade,
        pagamento: l.pagamento
      }))
    }
    if (previa.tipo === 'compras') {
      assert.ok(previa.avisos.some((a) => a.includes('categorias')))
      // Importa só uma descrição escolhida na prévia, sem categorias automáticas.
      const indice = previa.linhas.findIndex((l) => l.nome === 'Porta documentos de carro')
      dados.linhas = [{ indice, quantidade: 2, pagamento: 'dinheiro' }]
      gravarImportacao(aberto, previa, dados)
      assert.equal(
        aberto
          .prepare('SELECT quantidade FROM lista_compras WHERE nome = ?')
          .get('Porta documentos de carro').quantidade,
        2
      )
    } else {
      const dia = arquivo.match(/dia (\d+)/)[1]
      dados.data = `2025-11-${dia}`
      assert.throws(
        () => gravarImportacao(aberto, previa, { ...dados, data: '2025-02-30' }),
        /data válida/
      )
      assert.throws(
        () =>
          gravarImportacao(aberto, previa, {
            ...dados,
            linhas: [{ ...dados.linhas[0], quantidade: -1 }]
          }),
        /maior ou igual/
      )
      const soma = previa.linhas.reduce((s, l) => s + l.total, 0)
      assert.equal(soma, totaisEsperados[dia], arquivo)
      if (dia === '03')
        assert.equal(previa.linhas.filter((l) => l.pagamento === 'debito').length, 2)
      if (dia === '08')
        assert.equal(previa.linhas.filter((l) => l.pagamento === 'cartao').length, 1)
      vendas += previa.linhas.length
      total += soma
      gravarImportacao(aberto, previa, dados)
    }
    assert.throws(() => gravarImportacao(aberto, previa, dados), /já foi importado/)
  }
  assert.equal(aberto.prepare('SELECT COUNT(*) n FROM vendas').get().n, vendas)
  assert.equal(aberto.prepare('SELECT SUM(total) n FROM vendas').get().n, total)
  assert.equal(aberto.prepare('SELECT SUM(estoque) n FROM produtos').get().n, 0)
  const venda = aberto.prepare('SELECT id FROM vendas LIMIT 1').get()
  const item = aberto
    .prepare(
      'SELECT produto_id, nome_produto, quantidade, preco_unitario FROM itens_venda WHERE venda_id = ?'
    )
    .get(venda.id)
  aberto.prepare('UPDATE produtos SET estoque=7 WHERE id=?').run(item.produto_id)
  atualizarVenda(venda.id, {
    itens: [{ ...item, quantidade: 3 }],
    desconto: 0,
    forma_pagamento: 'pix'
  })
  excluirVenda(venda.id)
  assert.equal(
    aberto.prepare('SELECT estoque FROM produtos WHERE id=?').get(item.produto_id).estoque,
    7
  )
  // Erros em valores, retiradas e múltiplas colunas não são ignorados.
  const base = fs.readdirSync(path.join(root, 'arquivos_testes')).find((f) => f.includes('dia 01'))
  for (const [celula, valor, erro] of [
    ['G11', -10, /maior ou igual/],
    ['H11', 10, /retiradas/],
    ['C11', 10, /várias colunas/]
  ]) {
    const livro = XLSX.read(fs.readFileSync(path.join(root, 'arquivos_testes', base)))
    livro.Sheets['Controle Loja'][celula] = { t: 'n', v: valor }
    assert.throws(
      () => lerPlanilha(XLSX.write(livro, { type: 'buffer', bookType: 'ods' }), 'invalida.ods'),
      erro
    )
  }
  // Falha durante a transação não deixa dados ou marca de importação parciais.
  const arquivo = fs.readFileSync(path.join(root, 'arquivos_testes', base))
  const previa = { ...lerPlanilha(arquivo, 'rollback.ods'), hash: 'rollback' }
  const antes = aberto.prepare('SELECT COUNT(*) n FROM vendas').get().n
  aberto.exec(
    "CREATE TEMP TRIGGER falhar_importacao BEFORE INSERT ON importacoes BEGIN SELECT RAISE(ABORT, 'teste rollback'); END"
  )
  assert.throws(
    () =>
      gravarImportacao(aberto, previa, {
        token: previa.token,
        data: '2025-11-01',
        linhas: [{ indice: 0, quantidade: 1, pagamento: 'pix' }]
      }),
    /rollback/
  )
  assert.equal(aberto.prepare('SELECT COUNT(*) n FROM vendas').get().n, antes)
  console.log(
    `OK: 9 arquivos verificados; ${vendas} vendas, total R$ ${total}; datas, negativos, duplicatas, estoque e rollback validados.`
  )
} finally {
  banco.closeDb()
  fs.rmSync(temporario, { recursive: true, force: true })
}
