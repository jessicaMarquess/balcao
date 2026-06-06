import { useState, useEffect } from 'react'
import { formatCurrency, hojeISO, dateToISO } from '@renderer/lib/utils'
import type { Estatisticas } from '@renderer/types'

type Periodo = 'semana' | 'mes' | 'ano'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const FORMAS_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão'
}

const FORMAS_COR: Record<string, { bar: string; bg: string; text: string; border: string }> = {
  dinheiro: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  pix: { bar: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  cartao: { bar: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
}

const PERIODO_LABELS: Record<Periodo, string> = {
  semana: 'Semana',
  mes: 'Mês',
  ano: 'Ano'
}

function getRangeFromPeriodo(periodo: Periodo, hoje: string): { inicio: string; fim: string } {
  const d = new Date(hoje + 'T12:00:00')
  if (periodo === 'semana') {
    const s = new Date(d)
    s.setDate(d.getDate() - 6)
    return { inicio: dateToISO(s), fim: hoje }
  }
  if (periodo === 'mes') {
    return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje }
  }
  return { inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje }
}

const MEDALHA_ESTILOS = [
  'bg-amber-400 text-white',
  'bg-slate-300 text-slate-700',
  'bg-amber-600 text-white'
]

export default function Estatisticas(): React.JSX.Element {
  const hoje = hojeISO()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [dados, setDados] = useState<Estatisticas | null>(null)

  useEffect(() => {
    const { inicio, fim } = getRangeFromPeriodo(periodo, hoje)
    setDados(null)
    window.api.relatorio.estatisticas(inicio, fim).then(setDados)
  }, [periodo, hoje])

  // Gera array completo de 7 dias com totais
  const diasSemana = DIAS.map((_, idx) => {
    const found = dados?.porDiaSemana.find((d) => d.dia_semana === idx)
    return { dia: idx, total: found?.total ?? 0, quantidade: found?.quantidade ?? 0 }
  })

  const maxDia = Math.max(...diasSemana.map((d) => d.total), 1)
  const melhoresDias = [...diasSemana]
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  const totalGeral = dados?.totalGeral ?? 0

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-white shrink-0">
        <h2 className="text-base font-semibold text-slate-700">Estatísticas</h2>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['semana', 'mes', 'ano'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                periodo === p
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {!dados ? (
        <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
          Carregando...
        </div>
      ) : dados.quantidadeVendas === 0 ? (
        <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
          Nenhuma venda registrada neste período
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-6">
          {/* ── Gráfico dias da semana ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Vendas por dia da semana
            </p>
            <div className="flex items-end gap-2 h-36">
              {diasSemana.map(({ dia, total }) => {
                const altura = (total / maxDia) * 100
                const isTop = melhoresDias[0]?.dia === dia
                return (
                  <div key={dia} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                      {total > 0 ? (
                        <div
                          className={`relative w-full rounded-t-lg transition-all duration-500 ${
                            isTop
                              ? 'bg-linear-to-t from-violet-600 to-purple-500'
                              : 'bg-violet-200 group-hover:bg-violet-400'
                          }`}
                          style={{ height: `${Math.max(altura, 5)}%` }}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10 flex-col items-center">
                            <span className="font-bold">{formatCurrency(total)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full rounded-t-lg bg-slate-100" style={{ height: '3px' }} />
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${isTop ? 'text-violet-600' : 'text-slate-400'}`}>
                      {DIAS[dia]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Melhores dias da semana ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Melhor dia da semana de vendas
            </p>
            {melhoresDias.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-3">
                {melhoresDias.map((d, i) => {
                  const pct = (d.total / melhoresDias[0].total) * 100
                  return (
                    <div
                      key={d.dia}
                      className={`rounded-xl border p-4 transition-all ${
                        i === 0
                          ? 'border-violet-200 bg-violet-50'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${MEDALHA_ESTILOS[i]}`}>
                            {i + 1}
                          </span>
                          <span className={`text-sm font-bold ${i === 0 ? 'text-violet-700' : 'text-slate-700'}`}>
                            {DIAS_FULL[d.dia]}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${i === 0 ? 'text-violet-700' : 'text-slate-600'}`}>
                          {formatCurrency(d.total)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${i === 0 ? 'bg-violet-500' : 'bg-slate-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {d.quantidade} venda{d.quantidade !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Produtos mais vendidos ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Produtos mais vendidos
              </p>
              <span className="text-xs text-slate-300">{PERIODO_LABELS[periodo]}</span>
            </div>
            {dados.maisVendidos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum produto vendido</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dados.maisVendidos.map((item, i) => {
                  const maxQtd = dados.maisVendidos[0].total_quantidade
                  const pct = (item.total_quantidade / maxQtd) * 100
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 font-mono w-5 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700 truncate font-medium">{item.nome_produto}</span>
                          <span className="text-xs text-slate-500 ml-2 shrink-0">{item.total_quantidade} un.</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-100">
                          <div
                            className="h-1 rounded-full bg-violet-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 w-20 text-right shrink-0">
                        {formatCurrency(item.total_receita)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Método de pagamento ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Método de pagamento mais usado
              </p>
              <span className="text-xs text-slate-300">{PERIODO_LABELS[periodo]}</span>
            </div>
            {dados.formaPagamento.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Cards de forma */}
                <div className="grid grid-cols-3 gap-2">
                  {dados.formaPagamento.map((f) => {
                    const cor = FORMAS_COR[f.forma] ?? FORMAS_COR['dinheiro']
                    const pct = totalGeral > 0 ? Math.round((f.total / totalGeral) * 100) : 0
                    return (
                      <div key={f.forma} className={`rounded-xl border p-3 text-center ${cor.bg} ${cor.border}`}>
                        <p className={`text-xs font-semibold mb-1 ${cor.text}`}>
                          {FORMAS_LABEL[f.forma] ?? f.forma}
                        </p>
                        <p className={`text-lg font-bold ${cor.text}`}>{pct}%</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(f.total)}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Barras de proporção */}
                <div className="flex flex-col gap-2.5">
                  {dados.formaPagamento.map((f) => {
                    const cor = FORMAS_COR[f.forma] ?? FORMAS_COR['dinheiro']
                    const pct = totalGeral > 0 ? (f.total / totalGeral) * 100 : 0
                    return (
                      <div key={f.forma} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-14">
                          {FORMAS_LABEL[f.forma] ?? f.forma}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100">
                          <div
                            className={`h-2.5 rounded-full ${cor.bar} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">
                          {f.quantidade}x
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total no período</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
