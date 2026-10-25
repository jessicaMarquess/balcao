import { useSearchParams } from 'react-router-dom'
import { MensagemErro } from '@renderer/components/ui/mensagem-erro'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft, Download } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { FiltroPeriodo } from '@renderer/components/FiltroPeriodo'
import { Badge } from '@renderer/components/ui/badge'
import { formatCurrency, formatDate, hojeISO, dateToISO } from '@renderer/lib/utils'
import type { Venda } from '@renderer/types'

const DIAS_POR_PAGINA = 10

const LABEL_PAGAMENTO: Record<string, string> = {
  pix: 'PIX',
  cartao: 'Crédito',
  dinheiro: 'Dinheiro',
  debito: 'Débito'
}

const BADGE_PAGAMENTO: Record<string, 'default' | 'success' | 'secondary' | 'warning'> = {
  pix: 'default',
  cartao: 'secondary',
  dinheiro: 'success',
  debito: 'warning'
}

function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dateToISO(d)
}

interface GrupoDia {
  data: string
  vendas: Venda[]
  total: number
  totalPix: number
  totalCartao: number
  totalDinheiro: number
  totalDebito: number
}

function agruparPorDia(vendas: Venda[]): GrupoDia[] {
  const mapa = new Map<string, Venda[]>()
  for (const venda of vendas) {
    const lista = mapa.get(venda.data) ?? []
    lista.push(venda)
    mapa.set(venda.data, lista)
  }
  return Array.from(mapa.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([data, vendas]) => ({
      data,
      vendas,
      total: vendas.reduce((s, v) => s + v.total, 0),
      totalPix: vendas.filter((v) => v.forma_pagamento === 'pix').reduce((s, v) => s + v.total, 0),
      totalCartao: vendas
        .filter((v) => v.forma_pagamento === 'cartao')
        .reduce((s, v) => s + v.total, 0),
      totalDinheiro: vendas
        .filter((v) => v.forma_pagamento === 'dinheiro')
        .reduce((s, v) => s + v.total, 0),
      totalDebito: vendas
        .filter((v) => v.forma_pagamento === 'debito')
        .reduce((s, v) => s + v.total, 0)
    }))
}

export default function Historico(): React.JSX.Element {
  const hoje = hojeISO()
  const [parametros, setParametros] = useSearchParams()
  const dataInicio = parametros.get('inicio') ?? diasAtras(6)
  const dataFim = parametros.get('fim') ?? hoje
  const importados = Number(parametros.get('importados'))
  const [erro, setErro] = useState('')
  const [consultaConcluida, setConsultaConcluida] = useState('')
  const consultaAtual = `${dataInicio}/${dataFim}`
  const [paginacao, setPaginacao] = useState({ periodo: consultaAtual, pagina: 1 })
  const listaRef = useRef<HTMLDivElement>(null)
  const carregando =
    !!dataInicio && !!dataFim && dataInicio <= dataFim && consultaConcluida !== consultaAtual
  function alterarPeriodo(inicio: string, fim: string): void {
    setPaginacao({ periodo: `${inicio}/${fim}`, pagina: 1 })
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        novos.set('inicio', inicio)
        novos.set('fim', fim)
        novos.delete('importados')
        return novos
      },
      { replace: true }
    )
  }
  const [grupos, setGrupos] = useState<GrupoDia[]>([])
  const [diasAbertos, setDiasAbertos] = useState<Set<string>>(new Set([dataInicio]))
  const [vendasAbertas, setVendasAbertas] = useState<Set<number>>(new Set())
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (!dataInicio || !dataFim || dataInicio > dataFim) return
    let ativo = true
    window.api.vendas
      .listarPeriodo(dataInicio, dataFim)
      .then((lista) => {
        if (ativo) {
          setGrupos(agruparPorDia(lista))
          setErro('')
        }
      })
      .catch(() => {
        if (ativo)
          setErro('Não foi possível carregar as vendas. Tente abrir o histórico novamente.')
      })
      .finally(() => {
        if (ativo) setConsultaConcluida(consultaAtual)
      })
    return () => {
      ativo = false
    }
  }, [dataInicio, dataFim, consultaAtual])

  function toggleDia(data: string): void {
    setDiasAbertos((prev) => {
      const novo = new Set(prev)
      novo.has(data) ? novo.delete(data) : novo.add(data)
      return novo
    })
  }

  function toggleVenda(id: number): void {
    setVendasAbertas((prev) => {
      const novo = new Set(prev)
      novo.has(id) ? novo.delete(id) : novo.add(id)
      return novo
    })
  }

  async function exportarCSV(): Promise<void> {
    if (!dataInicio || !dataFim || dataInicio > dataFim) return
    setExportando(true)
    try {
      await window.api.exportar.csv(dataInicio, dataFim)
    } catch {
      setErro('Não foi possível exportar o CSV. Tente novamente.')
    } finally {
      setExportando(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(grupos.length / DIAS_POR_PAGINA))
  const paginaAtual = Math.min(
    paginacao.periodo === consultaAtual ? paginacao.pagina : 1,
    totalPaginas
  )
  const primeiroIndice = (paginaAtual - 1) * DIAS_POR_PAGINA
  const gruposPagina = grupos.slice(primeiroIndice, primeiroIndice + DIAS_POR_PAGINA)

  function mudarPagina(pagina: number): void {
    setPaginacao({ periodo: consultaAtual, pagina: Math.max(1, Math.min(pagina, totalPaginas)) })
    listaRef.current?.scrollTo({ top: 0 })
    listaRef.current?.focus({ preventScroll: true })
  }

  const totalGeral = grupos.reduce((s, g) => s + g.total, 0)
  const totalVendas = grupos.reduce((s, g) => s + g.vendas.length, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="shrink-0 space-y-4 border-b border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Histórico de Vendas</h1>
        <FiltroPeriodo inicio={dataInicio} fim={dataFim} onAplicar={alterarPeriodo} />
        <Button
          variant="outline"
          className="h-12 px-4 text-base"
          onClick={exportarCSV}
          disabled={
            exportando ||
            carregando ||
            grupos.length === 0 ||
            !dataInicio ||
            !dataFim ||
            dataInicio > dataFim
          }
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          {exportando ? 'Exportando...' : 'Exportar CSV'}
        </Button>
      </header>

      {dataInicio && dataFim && dataInicio > dataFim && (
        <p role="alert" className="px-6 py-4 text-base text-red-700">
          A data final deve ser igual ou posterior à data inicial.
        </p>
      )}
      {(!dataInicio || !dataFim) && (
        <p className="px-6 py-4 text-base text-slate-700">
          Preencha as duas datas para atualizar os resultados.
        </p>
      )}
      {Number.isSafeInteger(importados) && importados > 0 && (
        <p
          role="status"
          className="border-b border-emerald-200 bg-emerald-50 px-6 py-4 text-base text-emerald-900"
        >
          Importação concluída: {importados} registros adicionados em {formatDate(dataInicio)}.
        </p>
      )}
      <MensagemErro mensagem={erro} />
      {carregando && (
        <p role="status" className="px-6 py-4 text-base text-slate-600">
          Carregando vendas...
        </p>
      )}
      {/* Resumo geral do período */}
      {grupos.length > 0 && (
        <div className="flex gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-sm">
          <span className="text-slate-500">
            {grupos.length} dia{grupos.length !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">
            {totalVendas} venda{totalVendas !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-800">{formatCurrency(totalGeral)}</span>
        </div>
      )}

      {/* Lista de dias */}
      <div
        ref={listaRef}
        id="historico-dias"
        tabIndex={-1}
        role="region"
        aria-label="Dias com vendas"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 focus:outline-none"
      >
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p>
              {carregando
                ? 'Aguarde o carregamento.'
                : erro
                  ? 'Os registros não puderam ser consultados.'
                  : 'Nenhuma venda neste período. Confira as datas acima.'}
            </p>
          </div>
        ) : (
          gruposPagina.map((grupo) => {
            const diaAberto = diasAbertos.has(grupo.data)
            return (
              <div
                key={grupo.data}
                className="shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* Cabeçalho do dia */}
                <button
                  id={`dia-${grupo.data}`}
                  aria-expanded={diaAberto}
                  aria-controls={`vendas-${grupo.data}`}
                  className="grid w-full grid-cols-[20px_1fr_auto] items-center gap-4 p-4 text-left hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600 sm:p-6"
                  onClick={() => toggleDia(grupo.data)}
                >
                  {diaAberto ? (
                    <ChevronDown aria-hidden="true" className="h-5 w-5 text-violet-700" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="h-5 w-5 text-violet-700" />
                  )}
                  <span className="min-w-0 space-y-2">
                    <span className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                      {formatDate(grupo.data)}
                      {grupo.data === hoje && (
                        <span className="rounded bg-violet-100 px-2 py-1 text-sm font-medium text-violet-800">
                          Hoje
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-slate-600">
                      {grupo.vendas.length}{' '}
                      {grupo.vendas.length === 1 ? 'venda registrada' : 'vendas registradas'}
                    </span>
                  </span>
                  <span className="space-y-2 text-right">
                    <span className="block text-sm text-slate-600">Total do dia</span>
                    <span className="block text-xl font-bold tabular-nums text-slate-900">
                      {formatCurrency(grupo.total)}
                    </span>
                  </span>
                </button>
                <div
                  className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:px-6"
                  aria-label="Totais por forma de pagamento"
                >
                  {grupo.totalDinheiro > 0 && (
                    <span>
                      Dinheiro{' '}
                      <strong className="ml-2 font-semibold tabular-nums text-slate-800">
                        {formatCurrency(grupo.totalDinheiro)}
                      </strong>
                    </span>
                  )}
                  {grupo.totalPix > 0 && (
                    <span>
                      PIX{' '}
                      <strong className="ml-2 font-semibold tabular-nums text-slate-800">
                        {formatCurrency(grupo.totalPix)}
                      </strong>
                    </span>
                  )}
                  {grupo.totalCartao > 0 && (
                    <span>
                      Crédito{' '}
                      <strong className="ml-2 font-semibold tabular-nums text-slate-800">
                        {formatCurrency(grupo.totalCartao)}
                      </strong>
                    </span>
                  )}
                  {grupo.totalDebito > 0 && (
                    <span>
                      Débito{' '}
                      <strong className="ml-2 font-semibold tabular-nums text-slate-800">
                        {formatCurrency(grupo.totalDebito)}
                      </strong>
                    </span>
                  )}
                </div>

                {/* Vendas do dia */}
                {diaAberto && (
                  <div
                    id={`vendas-${grupo.data}`}
                    role="region"
                    aria-labelledby={`dia-${grupo.data}`}
                    className="border-t border-slate-200 flex flex-col divide-y divide-slate-200"
                  >
                    {grupo.vendas.map((venda) => {
                      const vendaAberta = vendasAbertas.has(venda.id)
                      return (
                        <div key={venda.id}>
                          <button
                            id={`venda-${venda.id}`}
                            aria-expanded={vendaAberta}
                            aria-controls={`itens-venda-${venda.id}`}
                            className="grid w-full grid-cols-[20px_1fr_auto] items-center gap-4 px-4 py-4 text-left hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-600 sm:px-6"
                            onClick={() => toggleVenda(venda.id)}
                          >
                            {vendaAberta ? (
                              <ChevronDown aria-hidden="true" className="h-5 w-5 text-slate-600" />
                            ) : (
                              <ChevronRight aria-hidden="true" className="h-5 w-5 text-slate-600" />
                            )}
                            <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <span className="text-base font-semibold text-slate-800">
                                Venda #{venda.id}
                              </span>
                              <span className="text-sm tabular-nums text-slate-600">
                                às{' '}
                                {new Date(venda.created_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </span>
                            <span className="flex flex-wrap items-center justify-end gap-4">
                              <Badge
                                className="text-sm"
                                variant={BADGE_PAGAMENTO[venda.forma_pagamento]}
                              >
                                {LABEL_PAGAMENTO[venda.forma_pagamento]}
                              </Badge>
                              <span className="text-base font-semibold tabular-nums text-slate-900">
                                {formatCurrency(venda.total)}
                              </span>
                            </span>
                          </button>

                          {vendaAberta && venda.itens && (
                            <div
                              id={`itens-venda-${venda.id}`}
                              role="region"
                              aria-labelledby={`venda-${venda.id}`}
                              className="border-t border-slate-200 bg-slate-50 p-4 sm:p-6"
                            >
                              <h3 className="mb-4 text-base font-semibold text-slate-800">
                                Itens da venda
                              </h3>
                              <div
                                className="overflow-x-auto rounded-lg border border-slate-200 bg-white"
                                tabIndex={0}
                                role="region"
                                aria-label={`Itens e valores da venda ${venda.id}`}
                              >
                                <table className="w-full min-w-[560px] text-base">
                                  <caption className="sr-only">
                                    Produtos, quantidades e valores da venda {venda.id}
                                  </caption>
                                  <thead>
                                    <tr className="border-b border-slate-200 bg-slate-100 text-left text-sm text-slate-600">
                                      <th scope="col" className="px-4 py-3 font-semibold">
                                        Produto
                                      </th>
                                      <th
                                        scope="col"
                                        className="w-28 px-4 py-3 font-semibold text-right"
                                      >
                                        Quantidade
                                      </th>
                                      <th
                                        scope="col"
                                        className="w-40 px-4 py-3 font-semibold text-right"
                                      >
                                        Valor unitário
                                      </th>
                                      <th
                                        scope="col"
                                        className="w-40 px-4 py-3 font-semibold text-right"
                                      >
                                        Subtotal
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {venda.itens.map((item, i) => (
                                      <tr key={i}>
                                        <td className="px-4 py-4 font-medium text-slate-800">
                                          {item.nome_produto}
                                        </td>
                                        <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                                          {item.quantidade}
                                        </td>
                                        <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                                          {formatCurrency(item.preco_unitario)}
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-900">
                                          {formatCurrency(item.quantidade * item.preco_unitario)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="border-t border-slate-200">
                                    {venda.desconto > 0 && (
                                      <>
                                        <tr>
                                          <th
                                            scope="row"
                                            colSpan={3}
                                            className="px-4 pt-4 pb-2 text-right text-sm font-medium text-slate-600"
                                          >
                                            Subtotal dos itens
                                          </th>
                                          <td className="px-4 pt-4 pb-2 text-right tabular-nums text-slate-700">
                                            {formatCurrency(
                                              venda.itens.reduce(
                                                (total, item) =>
                                                  total + item.quantidade * item.preco_unitario,
                                                0
                                              )
                                            )}
                                          </td>
                                        </tr>
                                        <tr>
                                          <th
                                            scope="row"
                                            colSpan={3}
                                            className="px-4 pb-4 text-right text-sm font-medium text-slate-600"
                                          >
                                            Desconto
                                          </th>
                                          <td className="px-4 pb-4 text-right tabular-nums text-slate-700">
                                            − {formatCurrency(venda.desconto)}
                                          </td>
                                        </tr>
                                      </>
                                    )}
                                    <tr className="border-t border-violet-100 bg-violet-50">
                                      <th
                                        scope="row"
                                        colSpan={3}
                                        className="px-4 py-4 text-right text-base font-semibold text-slate-900"
                                      >
                                        Total da venda
                                      </th>
                                      <td className="px-4 py-4 text-right text-lg font-bold tabular-nums text-violet-900">
                                        {formatCurrency(venda.total)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      {grupos.length > 0 && (
        <nav
          aria-label="Paginação do histórico"
          className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4"
        >
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-base text-slate-600"
          >
            Dias {primeiroIndice + 1}–{Math.min(primeiroIndice + DIAS_POR_PAGINA, grupos.length)} de{' '}
            {grupos.length}
            <span className="ml-4 font-medium text-slate-800">
              Página {paginaAtual} de {totalPaginas}
            </span>
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="h-12 px-4 text-base"
              aria-controls="historico-dias"
              disabled={carregando || paginaAtual <= 1}
              onClick={() => mudarPagina(paginaAtual - 1)}
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" /> Anterior
            </Button>
            <Button
              variant="outline"
              className="h-12 px-4 text-base"
              aria-controls="historico-dias"
              disabled={carregando || paginaAtual >= totalPaginas}
              onClick={() => mudarPagina(paginaAtual + 1)}
            >
              Próxima <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}
