import { useState, type ReactNode } from 'react'
import { Button } from './ui/button'

interface ListaPaginadaProps<T> {
  itens: T[]
  children: (itens: T[], inicio: number) => ReactNode
  tamanho?: number
  rotulo: string
}

export default function ListaPaginada<T>({
  itens,
  children,
  tamanho = 10,
  rotulo
}: ListaPaginadaProps<T>): React.JSX.Element {
  const [pagina, setPagina] = useState(1)
  const paginas = Math.max(1, Math.ceil(itens.length / tamanho))
  const atual = Math.min(pagina, paginas)
  // Persiste o ajuste quando uma exclusão esvazia a última página.
  if (pagina !== atual) setPagina(atual)
  const inicio = (atual - 1) * tamanho

  return (
    <>
      {children(itens.slice(inicio, inicio + tamanho), inicio)}
      {itens.length > 0 && (
        <nav
          aria-label={`Paginação: ${rotulo}`}
          className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-brand-100 py-3 mt-3 text-sm text-slate-600"
        >
          <span aria-live="polite">
            {inicio + 1}–{Math.min(inicio + tamanho, itens.length)} de {itens.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={atual === 1}
              onClick={() => setPagina(atual - 1)}
            >
              Anterior
            </Button>
            <span>
              Página {atual} de {paginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={atual === paginas}
              onClick={() => setPagina(atual + 1)}
            >
              Próxima
            </Button>
          </div>
        </nav>
      )}
    </>
  )
}
