import { formatCurrency } from '@renderer/lib/utils'
import type { Estatisticas } from '@renderer/types'
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const MEDALHA_ESTILOS = [
  'bg-amber-400 text-white',
  'bg-slate-300 text-slate-700',
  'bg-amber-600 text-white'
]

export default function VendasPorSemana({ dados }: { dados: Estatisticas }): React.JSX.Element {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          ? 'bg-linear-to-t from-brand-600 to-brand-alt-500'
                          : 'bg-brand-200 group-hover:bg-brand-400'
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
                <span
                  className={`text-xs font-semibold ${isTop ? 'text-brand-600' : 'text-slate-400'}`}
                >
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
                    i === 0 ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${MEDALHA_ESTILOS[i]}`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`text-sm font-bold ${i === 0 ? 'text-brand-700' : 'text-slate-700'}`}
                      >
                        {DIAS_FULL[d.dia]}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold ${i === 0 ? 'text-brand-700' : 'text-slate-600'}`}
                    >
                      {formatCurrency(d.total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === 0 ? 'bg-brand-500' : 'bg-slate-400'}`}
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
    </div>
  )
}
