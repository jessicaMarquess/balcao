import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { InputMoeda } from '@renderer/components/ui/input-moeda'
import { Label } from '@renderer/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@renderer/components/ui/dialog'
import { Badge } from '@renderer/components/ui/badge'
import { mensagemErro, validarFormularioProduto } from '@renderer/lib/validacao'
import { MensagemErro } from '@renderer/components/ui/mensagem-erro'
import { formatCurrency } from '@renderer/lib/utils'
import type { Produto, NovoProduto } from '@renderer/types'

const FORM_VAZIO: NovoProduto = { nome: '', preco: 0, estoque: 0 }
const POR_PAGINA = 10

function fuzzyScore(str: string, query: string): number {
  if (!query) return 1
  const s = str.toLowerCase()
  const q = query.toLowerCase()
  // match exato tem score máximo
  if (s.includes(q)) return 2
  // subsequência: cada char do query deve aparecer em ordem no str
  let qi = 0
  let score = 0
  let consecutive = 0
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) {
      qi++
      consecutive++
      score += consecutive
    } else {
      consecutive = 0
    }
  }
  return qi === q.length ? score : -1
}

export default function Produtos(): React.JSX.Element {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [form, setForm] = useState<NovoProduto>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroFormulario, setErroFormulario] = useState('')

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function carregarProdutos(): Promise<void> {
    try {
      const lista = await window.api.produtos.listar()
      setProdutos(lista)
      setErro('')
    } catch (error) {
      setErro(mensagemErro(error, 'Não foi possível carregar os produtos. Tente novamente.'))
    }
  }

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtos
    return produtos
      .map((p) => ({ p, score: fuzzyScore(p.nome, busca.trim()) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => p)
  }, [produtos, busca])

  const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const produtosPagina = produtosFiltrados.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA
  )

  function handleBusca(valor: string): void {
    setBusca(valor)
    setPagina(1)
  }

  function abrirNovo(): void {
    setErroFormulario('')
    setEditando(null)
    setForm(FORM_VAZIO)
    setDialogAberto(true)
  }

  function abrirEdicao(produto: Produto): void {
    setErroFormulario('')
    setEditando(produto)
    setForm({ nome: produto.nome, preco: produto.preco, estoque: produto.estoque })
    setDialogAberto(true)
  }

  async function salvar(): Promise<void> {
    if (salvando) return
    const validacao = validarFormularioProduto(form)
    setErroFormulario(validacao)
    if (validacao) return
    setSalvando(true)
    try {
      if (editando) {
        await window.api.produtos.atualizar(editando.id, form)
      } else {
        await window.api.produtos.criar(form)
      }
      setDialogAberto(false)
      await carregarProdutos()
    } catch (error) {
      setErroFormulario(mensagemErro(error, 'Não foi possível salvar o produto. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  async function deletar(id: number): Promise<void> {
    if (!confirm('Remover este produto?')) return
    try {
      await window.api.produtos.deletar(id)
      await carregarProdutos()
    } catch (error) {
      setErro(mensagemErro(error, 'Não foi possível remover o produto. Tente novamente.'))
    }
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Produtos</h1>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <MensagemErro mensagem={erro} />

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={busca}
          onChange={(e) => handleBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto rounded-xl border border-violet-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-violet-100">
            <tr className="border-b border-violet-200 text-left text-slate-700">
              <th scope="col" className="px-4 py-3 font-semibold">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Preço
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Estoque
              </th>
              <th scope="col" className="w-28 px-4 py-3 font-semibold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {produtosPagina.map((produto) => (
              <tr key={produto.id} className="hover:bg-violet-50 focus-within:bg-violet-50">
                <td className="px-4 py-3 font-medium text-slate-800">{produto.nome}</td>
                <td className="px-4 py-3 text-slate-700">{formatCurrency(produto.preco)}</td>
                <td className="px-4 py-3">
                  {produto.estoque < 0 ? (
                    <Badge variant="secondary">Sem info</Badge>
                  ) : (
                    <Badge
                      variant={
                        produto.estoque > 5
                          ? 'success'
                          : produto.estoque > 0
                            ? 'warning'
                            : 'destructive'
                      }
                    >
                      {produto.estoque} un.
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(produto)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletar(produto.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {produtosPagina.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  {busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-400">
            {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
            {' · '}página {paginaAtual} de {totalPaginas}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPagina(n)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  n === paginaAtual
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {n}
              </button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <MensagemErro mensagem={erroFormulario} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                maxLength={200}
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Controle Universal"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preco">Preço</Label>
              <InputMoeda
                id="preco"
                value={form.preco}
                onChange={(v) => setForm((f) => ({ ...f, preco: v }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estoque">Estoque</Label>
              <Input
                id="estoque"
                type="number"
                min="0"
                value={form.estoque}
                onChange={(e) => setForm((f) => ({ ...f, estoque: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
