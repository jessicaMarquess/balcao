import type { NovoProduto } from '@renderer/types'

export function validarFormularioProduto(produto: NovoProduto): string {
  if (!produto.nome.trim()) return 'Informe o nome do produto.'
  if (produto.nome.length > 200) return 'O nome deve ter no máximo 200 caracteres.'
  if (!Number.isFinite(produto.preco) || produto.preco < 0) {
    return 'O preço deve ser um número maior ou igual a 0.'
  }
  if (!Number.isSafeInteger(produto.estoque) || produto.estoque < 0) {
    return 'O estoque deve ser um número inteiro maior ou igual a 0.'
  }
  return ''
}

export function mensagemErro(erro: unknown, alternativa: string): string {
  console.error(alternativa, erro)
  if (
    erro instanceof Error &&
    erro.message.endsWith('Estoque insuficiente. Confira as quantidades dos itens.')
  ) {
    return 'Estoque insuficiente. Confira as quantidades dos itens.'
  }
  // Não mostrar detalhes internos do Electron ou do SQLite na interface.
  return alternativa
}
