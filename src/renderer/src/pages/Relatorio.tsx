import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus as TrendingFlat, Package } from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { formatCurrency, formatDate, hojeISO, dateToISO } from '@renderer/lib/utils'
import type { DiaSummary, RelatorioComparativo } from '@renderer/types'

type Periodo = 7 | 14 | 30

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function gerarRange(inicio: string, fim: string): string[] {
  const dates: string[] = []
  const cur = new Date(inicio + 'T12:00:00')
  const end = new Date(fim + 'T12:00:00')
  while (cur <= end) {
    dates.push(dateToISO(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function subDias(data: string, n: number): string {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() - n)
  return dateToISO(d)
}

function diaSemana(iso: string): string {
  return DIAS_SEMANA[new Date(iso + 'T12:00:00').getDay()]
}

function diaLabel(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(d)}/${parseInt(m)}`
}

export default function Relatorio(): React.JSX.Element {
  const hoje = hojeISO()
  const [periodo, setPeriodo] = useState<Periodo>(14)
  const [dados, setDados] = useState<RelatorioComparativo | null>(null)

  useEffect(() => {
    const inicio = subDias(hoje, periodo - 1)
    window.api.relatorio.comparativo(inicio, hoje).then(setDados)
  }, [periodo, hoje])

  if (!dados) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Carregando...
      </div>
    )
  }

  const inicio = subDias(hoje, periodo - 1)
  const range = gerarRange(inicio, hoje)
  const mapaVendas = new Map(dados.dias.map((d) => [d.data, d]))
  const diasCompletos = range.map((data) => mapaVendas.get(data) ?? {
    data, total: 0, quantidade: 0,
    total_pix: 0, total_cartao: 0, total_dinheiro: 0, total_debito: 0
  } as DiaSummary)

  const hoje_ = mapaVendas.get(hoje) ?? {
    data: hoje, total: 0, quantidade: 0,
    total_pix: 0, total_cartao: 0, total_dinheiro: 0, total_debito: 0
  } as DiaSummary

  const diasSemHoje = diasCompletos.filter((d) => d.data !== hoje)
  const maxTotal = Math.max(...diasCompletos.map((d) => d.total), 1)
  const totalPeriodo = diasCompletos.reduce((s, d) => s + d.total, 0)
  const diasComVenda = diasCompletos.filter((d) => d.total > 0).length
  const media = diasComVenda > 0 ? totalPeriodo / diasComVenda : 0
  const melhorDia = [...diasCompletos].sort((a, b) => b.total - a.total)[0]

  const ontem = mapaVendas.get(subDias(hoje, 1))
  const variacaoOntem = ontem && ontem.total > 0
    ? ((hoje_.total - ontem.total) / ontem.total) * 100
    : null

  const totalFormas = hoje_.total || 1
  const formas = [
    { label: 'Dinheiro', valor: hoje_.total_dinheiro, cor: 'bg-emerald-500', texto: 'text-emerald-700' },
    { label: 'PIX', valor: hoje_.total_pix, cor: 'bg-violet-500', texto: 'text-violet-700' },
    { label: 'Crédito', valor: hoje_.total_cartao, cor: 'bg-purple-500', texto: 'text-purple-700' },
    { label: 'Débito', valor: hoje_.total_debito, cor: 'bg-blue-500', texto: 'text-blue-700' },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-white">
        <h2 className="text-base font-semibold text-slate-700">Relatório de Vendas</h2>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {([7, 14, 30] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                periodo === p
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 py-5">
        {/* Card de hoje */}
        <div className="rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">
                Hoje — {diaSemana(hoje)}, {formatDate(hoje)}
              </p>
              <p className="text-4xl font-bold">{formatCurrency(hoje_.total)}</p>
              <p className="text-sm text-violet-200 mt-1">
                {hoje_.quantidade} venda{hoje_.quantidade !== 1 ? 's' : ''}
              </p>
            </div>
            {variacaoOntem !== null && (
              <div className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold ${
                variacaoOntem > 0
                  ? 'bg-emerald-400/20 text-emerald-300'
                  : variacaoOntem < 0
                  ? 'bg-red-400/20 text-red-300'
                  : 'bg-white/10 text-white/70'
              }`}>
                {variacaoOntem > 0
                  ? <TrendingUp className="h-4 w-4" />
                  : variacaoOntem < 0
                  ? <TrendingDown className="h-4 w-4" />
                  : <TrendingFlat className="h-4 w-4" />
                }
                {variacaoOntem > 0 ? '+' : ''}{variacaoOntem.toFixed(0)}% vs ontem
              </div>
            )}
          </div>

          {/* Barras de forma de pagamento */}
          {hoje_.total > 0 && (
            <div className="flex flex-col gap-2">
              {formas.filter(f => f.valor > 0).map(({ label, valor, cor }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-violet-200 w-14">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/20">
                    <div
                      className={`h-1.5 rounded-full ${cor} transition-all duration-500`}
                      style={{ width: `${(valor / totalFormas) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white w-20 text-right">
                    {formatCurrency(valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats do período */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Total {periodo}d</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(totalPeriodo)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Média/dia</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(media)}</p>
            <p className="text-xs text-slate-400">{diasComVenda} dia{diasComVenda !== 1 ? 's' : ''} c/ vendas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Melhor dia</p>
            {melhorDia.total > 0 ? (
              <>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(melhorDia.total)}</p>
                <p className="text-xs text-slate-400">{formatDate(melhorDia.data)}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Vendas dos últimos {periodo} dias
          </p>
          <div className="flex items-end gap-1 h-28">
            {diasCompletos.map((dia) => {
              const isHoje = dia.data === hoje
              const altura = maxTotal > 0 ? (dia.total / maxTotal) * 100 : 0
              return (
                <div key={dia.data} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                    {dia.total > 0 && (
                      <div
                        className={`relative w-full rounded-t-md transition-all duration-300 ${
                          isHoje
                            ? 'bg-linear-to-t from-violet-600 to-purple-500'
                            : 'bg-slate-200 group-hover:bg-violet-200'
                        }`}
                        style={{ height: `${Math.max(altura, 4)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                          {formatCurrency(dia.total)}
                        </div>
                      </div>
                    )}
                    {dia.total === 0 && (
                      <div className="w-full rounded-t-md bg-slate-100" style={{ height: '3px' }} />
                    )}
                  </div>
                  <span className={`text-[9px] font-medium ${isHoje ? 'text-violet-600' : 'text-slate-400'}`}>
                    {periodo <= 14 ? diaLabel(dia.data) : diaSemana(dia.data)[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Linha inferior: mais vendidos + forma de pgto período */}
        <div className="grid grid-cols-2 gap-4">
          {/* Mais vendidos no período */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Mais vendidos — {periodo}d
            </p>
            {dados.maisVendidos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma venda no período</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dados.maisVendidos.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 w-4 font-mono">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-700 truncate">{item.nome_produto}</span>
                    <Badge variant="secondary">{item.total_quantidade} un.</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estoque baixo + forma de pgto do período */}
          <div className="flex flex-col gap-3">
            {/* Forma de pgto período */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Por pagamento — {periodo}d
              </p>
              {totalPeriodo === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">—</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: 'Dinheiro', total: dados.dias.reduce((s, d) => s + d.total_dinheiro, 0), cor: 'bg-emerald-400' },
                    { label: 'PIX', total: dados.dias.reduce((s, d) => s + d.total_pix, 0), cor: 'bg-violet-400' },
                    { label: 'Crédito', total: dados.dias.reduce((s, d) => s + d.total_cartao, 0), cor: 'bg-purple-400' },
                    { label: 'Débito', total: dados.dias.reduce((s, d) => s + (d.total_debito ?? 0), 0), cor: 'bg-blue-400' },
                  ].map(({ label, total, cor }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-14">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${cor} transition-all duration-500`}
                          style={{ width: `${(total / totalPeriodo) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-12 text-right">
                        {totalPeriodo > 0 ? `${Math.round((total / totalPeriodo) * 100)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estoque crítico */}
            {dados.estoqueBaixo.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Package className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    Estoque baixo
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dados.estoqueBaixo.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-700 truncate flex-1">{p.nome}</span>
                      <Badge variant={p.estoque === 0 ? 'destructive' : 'warning'}>
                        {p.estoque === 0 ? 'zerado' : `${p.estoque} un.`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparativo dia a dia (últimos 7 dias excluindo hoje) */}
        {diasSemHoje.filter(d => d.total > 0).length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Detalhe por dia
            </p>
            <div className="flex flex-col gap-1.5">
              {[...diasCompletos].reverse().filter(d => d.total > 0).slice(0, 7).map((dia) => {
                const isHoje = dia.data === hoje
                const pctDoMelhor = melhorDia.total > 0 ? (dia.total / melhorDia.total) * 100 : 0
                return (
                  <div key={dia.data} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isHoje ? 'bg-violet-50 border border-violet-100' : ''}`}>
                    <span className={`text-xs font-medium w-16 ${isHoje ? 'text-violet-600' : 'text-slate-400'}`}>
                      {isHoje ? 'Hoje' : diaLabel(dia.data)}
                    </span>
                    <span className="text-xs text-slate-400 w-8">{diaSemana(dia.data)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${isHoje ? 'bg-violet-500' : 'bg-slate-300'}`}
                        style={{ width: `${pctDoMelhor}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-24 text-right ${isHoje ? 'text-violet-700' : 'text-slate-700'}`}>
                      {formatCurrency(dia.total)}
                    </span>
                    <span className="text-xs text-slate-400 w-16 text-right">
                      {dia.quantidade} venda{dia.quantidade !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
