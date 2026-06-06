import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Badge } from '@renderer/components/ui/badge'
import { formatCurrency } from '@renderer/lib/utils'
import type { RelatorioDia } from '@renderer/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  relatorio: RelatorioDia | null
}

export default function FinalizarDiaModal({ aberto, onFechar, relatorio }: Props): React.JSX.Element {
  if (!relatorio) return <></>

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo do dia</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Totais */}
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Receita</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Saldo inicial</p>
                <p className="font-bold text-slate-700">{formatCurrency(relatorio.saldoInicial)}</p>
              </div>
              <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Total vendas</p>
                <p className="font-bold text-slate-800 text-lg">{formatCurrency(relatorio.totalGeral)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                <p className="text-xs text-emerald-600 mb-1">Dinheiro</p>
                <p className="font-bold text-emerald-700">{formatCurrency(relatorio.totalDinheiro)}</p>
              </div>
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-center">
                <p className="text-xs text-violet-600 mb-1">PIX</p>
                <p className="font-bold text-violet-700">{formatCurrency(relatorio.totalPix)}</p>
              </div>
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-center col-span-2">
                <p className="text-xs text-purple-600 mb-1">Cartão</p>
                <p className="font-bold text-purple-700">{formatCurrency(relatorio.totalCartao)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              {relatorio.quantidadeVendas} venda{relatorio.quantidadeVendas !== 1 ? 's' : ''} realizadas
            </p>
          </div>

          {/* Mais vendidos */}
          {relatorio.maisVendidos.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Mais vendidos</p>
              <div className="flex flex-col gap-1.5">
                {relatorio.maisVendidos.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{item.nome_produto}</span>
                    <Badge variant="secondary">{item.total_quantidade} un.</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estoque baixo */}
          {relatorio.estoquebaixo.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                Atenção — estoque baixo
              </p>
              <div className="flex flex-col gap-1.5">
                {relatorio.estoquebaixo.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{p.nome}</span>
                    <Badge variant={p.estoque === 0 ? 'destructive' : 'warning'}>
                      {p.estoque === 0 ? 'Sem estoque' : `${p.estoque} un.`}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatorio.quantidadeVendas === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              Nenhuma venda registrada hoje
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
