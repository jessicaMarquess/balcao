import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { InputMoeda } from '@renderer/components/ui/input-moeda'
import { formatCurrency, fuzzySearch } from '@renderer/lib/utils'
import type { ItemCarrinho, Produto, Venda } from '@renderer/types'
import { Minus, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  aberto: boolean
  venda: Venda | null
  onFechar: () => void
  onAtualizada: () => void
}

const FORMAS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Crédito' },
  { value: 'debito', label: 'Débito' }
] as const

export default function EditarVendaModal({
  aberto,
  venda,
  onFechar,
  onAtualizada
}: Props): React.JSX.Element {
  // Estado inicializado direto das props — funciona porque o componente recebe key={venda.id}
  // e remonta quando a venda muda (ver PDV.tsx)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState<ItemCarrinho[]>(() =>
    (venda?.itens ?? []).map((i) => ({
      produto_id: i.produto_id,
      nome_produto: i.nome_produto,
      preco_unitario: i.preco_unitario,
      quantidade: i.quantidade
    }))
  )
  const [desconto, setDesconto] = useState<number>(() => venda?.desconto ?? 0)
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'cartao' | 'dinheiro' | 'debito'>(
    () => venda?.forma_pagamento ?? 'dinheiro'
  )
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) {
      window.api.produtos.listar().then(setProdutos)
    }
  }, [aberto])

  const resultados = fuzzySearch(produtos, busca, (p) => p.nome).slice(0, 8)

  function adicionarProduto(produto: Produto): void {
    setItens((prev) => {
      const existente = prev.find((i) => i.produto_id === produto.id)
      if (existente) {
        return prev.map((i) =>
          i.produto_id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      }
      return [
        ...prev,
        {
          produto_id: produto.id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco,
          quantidade: 1
        }
      ]
    })
    setBusca('')
    buscaRef.current?.focus()
  }

  function alterarQuantidade(produto_id: number, delta: number): void {
    setItens((prev) =>
      prev
        .map((i) => (i.produto_id === produto_id ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0)
    )
  }

  function remover(produto_id: number): void {
    setItens((prev) => prev.filter((i) => i.produto_id !== produto_id))
  }

  function editarPreco(produto_id: number, preco: number): void {
    setItens((prev) =>
      prev.map((i) => (i.produto_id === produto_id ? { ...i, preco_unitario: preco } : i))
    )
  }

  const subtotal = itens.reduce((s, i) => s + (i.preco_unitario || 0) * i.quantidade, 0)
  const descontoAplicado = Math.min(desconto || 0, subtotal)
  const total = Math.max(0, subtotal - descontoAplicado)

  async function salvar(): Promise<void> {
    if (!venda || itens.length === 0) return
    setSalvando(true)
    setErro(null)
    try {
      await window.api.vendas.atualizar(venda.id, {
        itens,
        forma_pagamento: formaPagamento,
        desconto: descontoAplicado
      })
      onAtualizada()
      onFechar()
    } catch (err) {
      console.error('Erro ao salvar venda:', err)
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(): Promise<void> {
    if (!venda) return
    setSalvando(true)
    setErro(null)
    try {
      await window.api.vendas.excluir(venda.id)
      onAtualizada()
      onFechar()
    } catch (err) {
      console.error('Erro ao excluir venda:', err)
      setErro(err instanceof Error ? err.message : String(err))
      setConfirmandoExclusao(false)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Venda #{venda?.id}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Autocomplete */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={buscaRef}
              placeholder="Buscar e adicionar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
            {resultados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-violet-100 bg-white shadow-lg">
                {resultados.map((p) => (
                  <button
                    key={p.id}
                    disabled={p.estoque === 0}
                    onClick={() => adicionarProduto(p)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed first:rounded-t-xl last:rounded-b-xl"
                  >
                    <span className="font-medium text-slate-700">{p.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{p.estoque} un.</span>
                      <span className="font-bold text-violet-600">{formatCurrency(p.preco)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de itens */}
          {itens.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhum produto na venda</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
              {itens.map((item) => (
                <div
                  key={item.produto_id}
                  className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2"
                >
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                    {item.nome_produto}
                  </span>

                  <InputMoeda
                    value={item.preco_unitario}
                    onChange={(v) => editarPreco(item.produto_id, v)}
                    className="h-7 w-28 text-xs text-right px-2"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => alterarQuantidade(item.produto_id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-200 bg-white text-slate-500 hover:bg-violet-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(item.produto_id, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-200 bg-white text-slate-500 hover:bg-violet-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="w-20 text-right text-sm font-bold text-slate-800">
                    {formatCurrency((item.preco_unitario || 0) * item.quantidade)}
                  </span>

                  <button
                    onClick={() => remover(item.produto_id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="flex gap-2">
            {FORMAS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFormaPagamento(value)}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all duration-150 ${
                  formaPagamento === value
                    ? 'border-violet-600 bg-linear-to-br from-violet-600 to-purple-700 text-white shadow-sm'
                    : 'border-violet-200 bg-white text-slate-600 hover:border-violet-400 hover:bg-violet-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Desconto */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-20 shrink-0">Desconto</label>
            <InputMoeda value={desconto} onChange={setDesconto} className="flex-1" />
            {descontoAplicado > 0 && (
              <Badge variant="success">− {formatCurrency(descontoAplicado)}</Badge>
            )}
          </div>

          {/* Total */}
          <div className="flex flex-col gap-1 rounded-xl bg-violet-50/60 px-4 py-3">
            {descontoAplicado > 0 && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span className="line-through">{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {erro}
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            {confirmandoExclusao ? (
              <>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={excluir}
                  disabled={salvando}
                >
                  Confirmar exclusão
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={salvar}
                  disabled={salvando || itens.length === 0}
                  size="lg"
                  className="flex-1"
                >
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setConfirmandoExclusao(true)}
                  disabled={salvando}
                  className="text-red-500 hover:text-red-600 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
