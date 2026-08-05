import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { formatCurrency, formatDate, hojeISO, dateToISO } from '@renderer/lib/utils'
import type { Venda } from '@renderer/types'

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
      totalCartao: vendas.filter((v) => v.forma_pagamento === 'cartao').reduce((s, v) => s + v.total, 0),
      totalDinheiro: vendas.filter((v) => v.forma_pagamento === 'dinheiro').reduce((s, v) => s + v.total, 0),
      totalDebito: vendas.filter((v) => v.forma_pagamento === 'debito').reduce((s, v) => s + v.total, 0)
    }))
}

export default function Historico(): React.JSX.Element {
  const hoje = hojeISO()
  const [dataInicio, setDataInicio] = useState(diasAtras(6))
  const [dataFim, setDataFim] = useState(hoje)
  const [grupos, setGrupos] = useState<GrupoDia[]>([])
  const [diasAbertos, setDiasAbertos] = useState<Set<string>>(new Set([hoje]))
  const [vendasAbertas, setVendasAbertas] = useState<Set<number>>(new Set())
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    carregarVendas()
  }, [dataInicio, dataFim])

  async function carregarVendas(): Promise<void> {
    const lista = await window.api.vendas.listarPeriodo(dataInicio, dataFim)
    setGrupos(agruparPorDia(lista))
  }

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
    setExportando(true)
    try {
      await window.api.exportar.csv(dataInicio, dataFim)
    } finally {
      setExportando(false)
    }
  }

  const totalGeral = grupos.reduce((s, g) => s + g.total, 0)
  const totalVendas = grupos.reduce((s, g) => s + g.vendas.length, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-bold text-slate-800">Histórico de Vendas</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>De</span>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            <span>até</span>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-40 h-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCSV}
            disabled={exportando || grupos.length === 0}
          >
            <Download className="h-4 w-4" />
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      {/* Resumo geral do período */}
      {grupos.length > 0 && (
        <div className="flex gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-sm">
          <span className="text-slate-500">{grupos.length} dia{grupos.length !== 1 ? 's' : ''}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{totalVendas} venda{totalVendas !== 1 ? 's' : ''}</span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-800">{formatCurrency(totalGeral)}</span>
        </div>
      )}

      {/* Lista de dias */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p>Nenhuma venda neste período</p>
          </div>
        ) : (
          grupos.map((grupo) => {
            const diaAberto = diasAbertos.has(grupo.data)
            return (
              <div key={grupo.data} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                {/* Cabeçalho do dia */}
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => toggleDia(grupo.data)}
                >
                  {diaAberto ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 w-32 text-left">
                    {formatDate(grupo.data)}
                    {grupo.data === hoje && (
                      <span className="ml-2 text-xs font-normal text-blue-500">hoje</span>
                    )}
                  </span>
                  <span className="text-sm text-slate-400 flex-1 text-left">
                    {grupo.vendas.length} venda{grupo.vendas.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-3 text-sm">
                    {grupo.totalDinheiro > 0 && (
                      <span className="text-green-600">Din. {formatCurrency(grupo.totalDinheiro)}</span>
                    )}
                    {grupo.totalPix > 0 && (
                      <span className="text-blue-600">PIX {formatCurrency(grupo.totalPix)}</span>
                    )}
                    {grupo.totalCartao > 0 && (
                      <span className="text-purple-600">Créd. {formatCurrency(grupo.totalCartao)}</span>
                    )}
                    {grupo.totalDebito > 0 && (
                      <span className="text-blue-600">Déb. {formatCurrency(grupo.totalDebito)}</span>
                    )}
                    <span className="font-bold text-slate-800 w-28 text-right">
                      {formatCurrency(grupo.total)}
                    </span>
                  </div>
                </button>

                {/* Vendas do dia */}
                {diaAberto && (
                  <div className="border-t border-slate-100 flex flex-col divide-y divide-slate-100">
                    {grupo.vendas.map((venda) => {
                      const vendaAberta = vendasAbertas.has(venda.id)
                      return (
                        <div key={venda.id}>
                          <button
                            className="flex w-full items-center gap-3 px-8 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                            onClick={() => toggleVenda(venda.id)}
                          >
                            {vendaAberta ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            )}
                            <span className="text-slate-400 w-16 text-left">#{venda.id}</span>
                            <span className="text-slate-500 flex-1 text-left">
                              {new Date(venda.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <Badge variant={BADGE_PAGAMENTO[venda.forma_pagamento]}>
                              {LABEL_PAGAMENTO[venda.forma_pagamento]}
                            </Badge>
                            <span className="font-semibold text-slate-800 w-28 text-right">
                              {formatCurrency(venda.total)}
                            </span>
                          </button>

                          {vendaAberta && venda.itens && (
                            <div className="px-16 pb-3 bg-slate-50">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-slate-400">
                                    <th className="pb-1.5 font-medium">Produto</th>
                                    <th className="pb-1.5 font-medium text-right">Qtd</th>
                                    <th className="pb-1.5 font-medium text-right">Unit.</th>
                                    <th className="pb-1.5 font-medium text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {venda.itens.map((item, i) => (
                                    <tr key={i}>
                                      <td className="py-1 text-slate-600">{item.nome_produto}</td>
                                      <td className="py-1 text-right text-slate-500">{item.quantidade}</td>
                                      <td className="py-1 text-right text-slate-500">{formatCurrency(item.preco_unitario)}</td>
                                      <td className="py-1 text-right font-medium text-slate-700">
                                        {formatCurrency(item.quantidade * item.preco_unitario)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
    </div>
  )
}
