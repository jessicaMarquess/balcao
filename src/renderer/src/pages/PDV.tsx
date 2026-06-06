import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { formatCurrency, hojeISO } from '@renderer/lib/utils'
import VendaModal from '@renderer/components/VendaModal'
import EditarVendaModal from '@renderer/components/EditarVendaModal'
import type { Venda } from '@renderer/types'

type Filtro = 'todos' | 'dinheiro' | 'pix' | 'cartao'

const LABEL_PAGAMENTO: Record<string, string> = {
  pix: 'PIX',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro'
}

const BADGE_PAGAMENTO: Record<string, 'default' | 'success' | 'secondary'> = {
  pix: 'default',
  cartao: 'secondary',
  dinheiro: 'success'
}

function formatarDataPT(iso: string): string {
  const [year, month, day] = iso.split('-')
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `Dia ${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`
}

export default function PDV(): React.JSX.Element {
  const hoje = hojeISO()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [totalPix, setTotalPix] = useState(0)
  const [totalCartao, setTotalCartao] = useState(0)
  const [totalDinheiro, setTotalDinheiro] = useState(0)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [modalVendaAberto, setModalVendaAberto] = useState(false)
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  function toggleExpandido(id: number): void {
    setExpandidos((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const carregar = useCallback(async () => {
    const [lista, saldo] = await Promise.all([
      window.api.vendas.listar(hoje),
      window.api.dia.getSaldo(hoje)
    ])
    setVendas(lista)
    setSaldoInicial(saldo)
    setTotalPix(lista.filter((v) => v.forma_pagamento === 'pix').reduce((s, v) => s + v.total, 0))
    setTotalCartao(lista.filter((v) => v.forma_pagamento === 'cartao').reduce((s, v) => s + v.total, 0))
    setTotalDinheiro(lista.filter((v) => v.forma_pagamento === 'dinheiro').reduce((s, v) => s + v.total, 0))
  }, [hoje])

  useEffect(() => { carregar() }, [carregar])

  function alternarFiltro(f: Filtro): void {
    setFiltro((prev) => (prev === f ? 'todos' : f))
  }

  const totalGeral = totalDinheiro + totalPix + totalCartao
  const vendasFiltradas = filtro === 'todos' ? vendas : vendas.filter((v) => v.forma_pagamento === filtro)

  const cards: {
    id: Filtro
    label: string
    valor: number
    estilo: { base: string; ativo: string; label: string; valor: string }
  }[] = [
    {
      id: 'todos',
      label: 'Total',
      valor: totalGeral,
      estilo: {
        base: 'border-violet-300 bg-linear-to-br from-violet-600 to-purple-700',
        ativo: 'ring-violet-400',
        label: 'text-violet-200',
        valor: 'text-white'
      }
    },
    {
      id: 'dinheiro',
      label: 'Dinheiro',
      valor: totalDinheiro,
      estilo: {
        base: 'border-emerald-200 bg-emerald-50',
        ativo: 'ring-emerald-400',
        label: 'text-emerald-600',
        valor: 'text-emerald-800'
      }
    },
    {
      id: 'pix',
      label: 'PIX',
      valor: totalPix,
      estilo: {
        base: 'border-violet-200 bg-violet-50',
        ativo: 'ring-violet-400',
        label: 'text-violet-600',
        valor: 'text-violet-800'
      }
    },
    {
      id: 'cartao',
      label: 'Crédito',
      valor: totalCartao,
      estilo: {
        base: 'border-purple-200 bg-purple-50',
        ativo: 'ring-purple-400',
        label: 'text-purple-600',
        valor: 'text-purple-800'
      }
    }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-white">
        <h2 className="text-base font-semibold text-slate-700">{formatarDataPT(hoje)}</h2>
        <div className="flex gap-2">
          <Button onClick={() => setModalVendaAberto(true)}>
            <Plus className="h-4 w-4" />
            Venda
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex gap-4 px-6 py-4 bg-white border-b border-violet-100">
        {cards.map(({ id, label, valor, estilo }) => {
          const ativo = filtro === id
          return (
            <button
              key={id}
              onClick={() => alternarFiltro(id)}
              className={`flex-1 rounded-xl border p-4 text-center transition-all duration-150 ${estilo.base} ${
                ativo
                  ? `ring-2 ring-offset-2 ${estilo.ativo} shadow-md`
                  : 'opacity-85 hover:opacity-100 hover:shadow-sm'
              }`}
            >
              <p className={`text-xs font-semibold mb-1 uppercase tracking-wide ${estilo.label}`}>{label}</p>
              <p className={`text-xl font-bold ${estilo.valor}`}>{formatCurrency(valor)}</p>
            </button>
          )
        })}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center shrink-0 w-40">
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-slate-400">Saldo inicial</p>
          <p className="text-xl font-bold text-slate-700">{formatCurrency(saldoInicial)}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {filtro === 'todos' ? 'Vendas do dia' : `Vendas — ${LABEL_PAGAMENTO[filtro]}`}
          {vendasFiltradas.length > 0 && (
            <span className="ml-2 normal-case text-slate-300">({vendasFiltradas.length})</span>
          )}
        </h3>

        {vendasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            {vendas.length === 0 ? (
              <>
                <p className="font-medium">Nenhuma venda hoje ainda</p>
                <p className="text-sm mt-1">Clique em "+ Venda" para registrar</p>
              </>
            ) : (
              <p>Nenhuma venda com {LABEL_PAGAMENTO[filtro]} hoje</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {vendasFiltradas.map((venda) => (
              <div
                key={venda.id}
                onClick={() => toggleExpandido(venda.id)}
                className="flex items-center gap-4 rounded-xl border border-violet-100 bg-white px-4 py-3 cursor-pointer hover:border-violet-200 hover:bg-violet-50/40 transition-all duration-150"
              >
                <span className="text-sm text-slate-400 w-14">
                  {new Date(venda.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <div className="flex-1 text-sm text-slate-600 min-w-0">
                  {(() => {
                    const itens = venda.itens ?? []
                    if (itens.length <= 1) return <span>{itens[0]?.nome_produto ?? ''}</span>
                    const expandido = expandidos.has(venda.id)
                    const resto = itens.length - 1
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{itens[0].nome_produto}</span>
                          {!expandido && (
                            <span className="shrink-0 text-xs text-slate-400">
                              +{resto} {resto === 1 ? 'item' : 'itens'}
                            </span>
                          )}
                        </div>
                        {expandido && (
                          <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-slate-400 border-l-2 border-violet-100 pl-2">
                            {itens.slice(1).map((item, idx) => (
                              <span key={idx}>{item.nome_produto}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <Badge variant={BADGE_PAGAMENTO[venda.forma_pagamento]}>
                  {LABEL_PAGAMENTO[venda.forma_pagamento]}
                </Badge>
                <span className="font-bold text-slate-800 w-24 text-right">
                  {formatCurrency(venda.total)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); setVendaSelecionada(venda) }}
                  className="shrink-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <VendaModal
        aberto={modalVendaAberto}
        onFechar={() => setModalVendaAberto(false)}
        onVendaRegistrada={carregar}
      />
      <EditarVendaModal
        key={vendaSelecionada?.id ?? 0}
        aberto={vendaSelecionada !== null}
        venda={vendaSelecionada}
        onFechar={() => setVendaSelecionada(null)}
        onAtualizada={carregar}
      />
    </div>
  )
}
