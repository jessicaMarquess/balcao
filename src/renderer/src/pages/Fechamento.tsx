import { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { formatCurrency, formatDate, hojeISO } from '@renderer/lib/utils'
import type { ResumoDia } from '@renderer/types'

export default function Fechamento(): React.JSX.Element {
  const hoje = hojeISO()
  const [resumo, setResumo] = useState<ResumoDia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar(): Promise<void> {
    setCarregando(true)
    try {
      const dados = await window.api.vendas.resumoDia(hoje)
      setResumo(dados)
    } finally {
      setCarregando(false)
    }
  }

  async function exportarCSV(): Promise<void> {
    setExportando(true)
    try {
      await window.api.exportar.csv(hoje, hoje)
    } finally {
      setExportando(false)
    }
  }

  const itensResumo = resumo
    ? [
        { label: 'Dinheiro', value: resumo.total_dinheiro, cor: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        { label: 'PIX', value: resumo.total_pix, cor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
        { label: 'Cartão', value: resumo.total_cartao, cor: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' }
      ]
    : []

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Fechamento de Caixa</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDate(hoje)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={carregar} disabled={carregando}>
            <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={exportarCSV}
            disabled={exportando || !resumo || resumo.quantidade_vendas === 0}
          >
            <Download className="h-4 w-4" />
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      {resumo && (
        <div className="max-w-lg flex flex-col gap-5">
          {/* Total geral */}
          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-slate-500 mb-1">Total do dia</p>
            <p className="text-4xl font-bold text-slate-900">{formatCurrency(resumo.total)}</p>
            <p className="text-sm text-slate-400 mt-2">
              {resumo.quantidade_vendas} venda{resumo.quantidade_vendas !== 1 ? 's' : ''} realizadas
            </p>
          </div>

          {/* Breakdown por forma de pagamento */}
          <div className="grid grid-cols-3 gap-3">
            {itensResumo.map(({ label, value, cor, bg }) => (
              <div key={label} className={`rounded-lg border p-4 text-center ${bg}`}>
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${cor}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {resumo.quantidade_vendas === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              Nenhuma venda registrada hoje
            </p>
          )}
        </div>
      )}
    </div>
  )
}
