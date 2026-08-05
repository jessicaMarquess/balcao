import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCheck, Minus, PackageSearch, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import type { ItemListaCompras, Produto } from '@renderer/types'

const ESTOQUE_BAIXO = 5

export default function ListaCompras(): React.JSX.Element {
  const [itens, setItens] = useState<ItemListaCompras[]>([])
  const [sugestoes, setSugestoes] = useState<Produto[]>([])
  const [novoItem, setNovoItem] = useState('')
  const [novaQtd, setNovaQtd] = useState(1)
  const [adicionando, setAdicionando] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<number | null>(null)

  useEffect(() => {
    carregar()
    window.api.produtos.listar().then((lista) =>
      setSugestoes(lista.filter((p) => p.ativo && p.estoque <= ESTOQUE_BAIXO))
    )
  }, [])

  async function carregar(): Promise<void> {
    const lista = await window.api.listaCompras.listar()
    setItens(lista.map((i) => ({ ...i, quantidade: Number(i.quantidade) || 1 })))
  }

  async function adicionar(nome = novoItem.trim(), quantidade = novaQtd): Promise<void> {
    if (!nome) return
    setAdicionando(true)
    try {
      await window.api.listaCompras.adicionar(nome, quantidade)
      setNovoItem('')
      setNovaQtd(1)
      await carregar()
    } finally {
      setAdicionando(false)
    }
  }

  async function alterarQuantidade(item: ItemListaCompras, delta: number): Promise<void> {
    const nova = (Number(item.quantidade) || 1) + delta
    if (nova < 1) return
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantidade: nova } : i)))
    await window.api.listaCompras.atualizarQuantidade(item.id, nova)
  }

  async function recarregarSugestoes(): Promise<void> {
    const lista = await window.api.produtos.listar()
    setSugestoes(lista.filter((p) => p.ativo && p.estoque <= ESTOQUE_BAIXO))
  }

  async function marcarComprado(item: ItemListaCompras): Promise<void> {
    setMarcando(item.id)
    try {
      await window.api.listaCompras.marcarComprado(item.id, item.nome, item.quantidade)
      await Promise.all([carregar(), recarregarSugestoes()])
    } finally {
      setMarcando(null)
    }
  }

  async function deletar(id: number): Promise<void> {
    await window.api.listaCompras.deletar(id)
    await carregar()
  }

  async function fecharLista(): Promise<void> {
    setFechando(true)
    setErro(null)
    try {
      const itensPdf = itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade }))
      const resultado = await window.api.listaCompras.exportarPdf(itensPdf)
      if ('cancelado' in resultado) return
      if (!resultado.sucesso) {
        setErro(resultado.erro)
      }
    } finally {
      setFechando(false)
    }
  }

  const nomesNaLista = new Set(itens.map((i) => i.nome.toLowerCase()))
  const sugestoesPendentes = sugestoes.filter((p) => !nomesNaLista.has(p.nome.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Lista de Compras</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={fecharLista}
            disabled={fechando || itens.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {fechando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {fechando ? 'Salvando...' : 'Fechar lista'}
          </Button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>Erro ao salvar PDF: {erro}</span>
          <button onClick={() => setErro(null)} className="text-red-400 hover:text-red-700 ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Sugestões de reposição */}
      {sugestoesPendentes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <PackageSearch className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Sugestões de reposição
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sugestoesPendentes.map((p) => {
              const semInfo = p.estoque < 0
              return (
                <button
                  key={p.id}
                  onClick={() => adicionar(p.nome, 1)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                >
                  <span>{p.nome}</span>
                  {semInfo ? (
                    <span className="text-xs text-slate-400 italic">sem informação</span>
                  ) : p.estoque === 0 ? (
                    <span className="text-xs font-semibold text-red-500">sem estoque</span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-500">{p.estoque} un.</span>
                  )}
                  <Plus className="h-3 w-3 text-slate-400" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Campo de adicionar */}
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar item..."
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          className="flex-1"
          autoFocus
        />
        <div className="flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2">
          <button
            onClick={() => setNovaQtd((q) => Math.max(1, q - 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-sm font-semibold text-slate-700">{novaQtd}</span>
          <button
            onClick={() => setNovaQtd((q) => q + 1)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <Button onClick={() => adicionar()} disabled={adicionando || !novoItem.trim()}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <p>Lista vazia</p>
          <p className="text-sm mt-1">Adicione os produtos que precisam ser comprados</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            A comprar ({itens.length})
          </p>
          <div className="flex flex-col gap-1">
            {itens.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => marcarComprado(item)}
                  disabled={marcando === item.id}
                  className="h-4 w-4 rounded border-slate-300 cursor-pointer accent-violet-600 disabled:opacity-40"
                />
                <span className="flex-1 text-sm text-slate-700">{item.nome}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alterarQuantidade(item, -1)}
                    disabled={item.quantidade <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-200 bg-white text-slate-400 hover:bg-violet-50 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value) || 1)
                      setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, quantidade: v } : i))
                    }}
                    onBlur={(e) => {
                      const v = Math.max(1, parseInt(e.target.value) || 1)
                      window.api.listaCompras.atualizarQuantidade(item.id, v)
                    }}
                    className="w-10 text-center text-sm font-semibold text-slate-700 border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 py-0.5"
                  />
                  <button
                    onClick={() => alterarQuantidade(item, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-200 bg-white text-slate-400 hover:bg-violet-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => deletar(item.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
