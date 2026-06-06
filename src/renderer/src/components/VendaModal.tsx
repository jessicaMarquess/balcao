import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { InputMoeda } from '@renderer/components/ui/input-moeda'
import { formatCurrency, fuzzySearch, hojeISO } from '@renderer/lib/utils'
import type { ItemCarrinho, Produto } from '@renderer/types'
import { Minus, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  aberto: boolean
  onFechar: () => void
  onVendaRegistrada: () => void
}

const FORMAS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Cartão' }
] as const

export default function VendaModal({
  aberto,
  onFechar,
  onVendaRegistrada
}: Props): React.JSX.Element {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [desconto, setDesconto] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'cartao' | 'dinheiro'>('dinheiro')
  const [salvando, setSalvando] = useState(false)

  // Cadastro rápido de produto
  const [modoRegistro, setModoRegistro] = useState(false)
  const [regNome, setRegNome] = useState('')
  const [regPreco, setRegPreco] = useState(0)
  const [regEstoque, setRegEstoque] = useState(0)
  const [registrando, setRegistrando] = useState(false)

  const abertoPrev = useRef(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto && !abertoPrev.current) {
      window.api.produtos.listar().then(setProdutos)
    }
    if (!aberto && abertoPrev.current) {
      setBusca('')
      setItens([])
      setDesconto(0)
      setFormaPagamento('dinheiro')
      fecharModoRegistro()
    }
    abertoPrev.current = aberto
  }, [aberto])

  function fecharModoRegistro(): void {
    setModoRegistro(false)
    setRegNome('')
    setRegPreco(0)
    setRegEstoque(0)
  }

  function abrirModoRegistro(): void {
    setRegNome(busca.trim())
    setModoRegistro(true)
    setBusca('')
  }

  async function registrarEAdicionar(): Promise<void> {
    if (!regNome.trim() || regPreco <= 0) return
    setRegistrando(true)
    try {
      const produto = await window.api.produtos.criar({
        nome: regNome.trim(),
        preco: regPreco,
        estoque: regEstoque
      })
      setProdutos((prev) => [...prev, produto])
      adicionarProduto(produto)
      fecharModoRegistro()
    } finally {
      setRegistrando(false)
    }
  }

  const resultados = fuzzySearch(produtos, busca, (p) => p.nome).slice(0, 8)
  const semResultados = busca.trim().length > 0 && resultados.length === 0

  function adicionarProduto(produto: Produto): void {
    if (produto.estoque === 0 && !modoRegistro) return
    setItens((prev) => {
      const existente = prev.find((i) => i.produto_id === produto.id)
      if (existente) {
        const estoqueDisponivel = produto.estoque
        if (estoqueDisponivel > 0 && existente.quantidade >= estoqueDisponivel) return prev
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

  async function registrar(): Promise<void> {
    if (itens.length === 0) return
    setSalvando(true)
    try {
      await window.api.vendas.registrar({
        itens,
        forma_pagamento: formaPagamento,
        desconto: descontoAplicado,
        data: hojeISO()
      })
      onVendaRegistrada()
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Venda</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Autocomplete ou Cadastro rápido */}
          {modoRegistro ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-semibold text-violet-700">Cadastrar produto</span>
                </div>
                <button
                  onClick={fecharModoRegistro}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Nome do produto"
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Preço</p>
                    <InputMoeda value={regPreco} onChange={setRegPreco} />
                  </div>
                  <div className="w-28">
                    <p className="text-xs text-slate-500 mb-1">
                      Estoque <span className="text-slate-400">(opcional)</span>
                    </p>
                    <Input
                      type="number"
                      min="0"
                      value={regEstoque}
                      onChange={(e) => setRegEstoque(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-right"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={registrarEAdicionar}
                disabled={registrando || !regNome.trim() || regPreco <= 0}
                size="sm"
              >
                {registrando ? 'Cadastrando...' : 'Cadastrar e adicionar'}
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={buscaRef}
                placeholder="Buscar e adicionar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
                autoFocus
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
                  <button
                    onClick={abrirModoRegistro}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-violet-600 hover:bg-violet-50 border-t border-violet-100 rounded-b-xl"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    <span>Cadastrar novo produto</span>
                  </button>
                </div>
              )}
              {semResultados && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-violet-100 bg-white shadow-lg">
                  <div className="px-3 py-2.5 text-sm text-slate-400">
                    Nenhum produto encontrado
                  </div>
                  <button
                    onClick={abrirModoRegistro}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 border-t border-violet-100 rounded-b-xl"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    <span>
                      Cadastrar <span className="font-semibold">&ldquo;{busca.trim()}&rdquo;</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lista de itens */}
          {itens.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Busque e adicione produtos acima
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
              {itens.map((item) => {
                const estoqueMax = produtos.find((p) => p.id === item.produto_id)?.estoque ?? 999
                return (
                  <div
                    key={item.produto_id}
                    className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
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
                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => alterarQuantidade(item.produto_id, 1)}
                        disabled={estoqueMax > 0 && item.quantidade >= estoqueMax}
                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="w-20 text-right text-sm font-bold text-slate-800">
                      {formatCurrency(item.preco_unitario * item.quantidade)}
                    </span>

                    <button
                      onClick={() => remover(item.produto_id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {itens.length > 0 && (
            <>
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
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3">
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

              <Button onClick={registrar} disabled={salvando} size="lg">
                {salvando ? 'Registrando...' : 'Confirmar Venda'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
