import { useRef, useState } from 'react'
import type { PreviaImportacao, PagamentoImportacao } from '../../../shared/importacao'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { InputData } from './ui/input-data'
import { MensagemErro } from './ui/mensagem-erro'
import { formatCurrency } from '@renderer/lib/utils'

export function ImportarPlanilhaModal({
  previa,
  onFechar,
  onImportada
}: {
  previa: PreviaImportacao
  onFechar: () => void
  onImportada: (data: string, quantidade: number) => void
}): React.JSX.Element {
  const [data, setData] = useState('')
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const [linhas, setLinhas] = useState(() =>
    previa.linhas.map((l, indice) => ({ ...l, indice, selecionada: previa.tipo === 'vendas' }))
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const selecionadas = linhas.filter((l) => l.selecionada)
  async function importar(): Promise<void> {
    if (salvando) return
    if (previa.tipo === 'vendas' && !data) {
      setErro('Informe a data completa das vendas no formato DD/MM/AAAA.')
      document.getElementById('data-importacao')?.focus()
      return
    }
    if (!selecionadas.length) {
      setErro('Selecione pelo menos um registro.')
      return
    }
    if (
      selecionadas.some((linha) => !Number.isSafeInteger(linha.quantidade) || linha.quantidade < 1)
    ) {
      setErro('Confira as quantidades: use números inteiros a partir de 1.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const res = await window.api.backup.confirmarPlanilha({
        token: previa.token,
        data,
        linhas: selecionadas.map(({ indice, quantidade, pagamento }) => ({
          indice,
          quantidade,
          pagamento
        }))
      })
      if (res.sucesso) onImportada(data, selecionadas.length)
      else setErro(res.erro)
    } catch {
      setErro('Não foi possível importar a planilha. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvando && onFechar()}>
      <DialogContent
        position="right"
        closeDisabled={salvando}
        className="text-base text-slate-800"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          tituloRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById('restaurar-dados')?.focus()
        }}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-slate-200 p-6 pr-20 text-left">
          <DialogTitle
            ref={tituloRef}
            tabIndex={-1}
            className="text-2xl leading-8 font-semibold outline-none"
          >
            Importar {previa.tipo === 'vendas' ? 'vendas' : 'lista de compras'}
          </DialogTitle>
          <DialogDescription className="text-base leading-6 text-slate-600">
            Confira os dados antes de adicionar ao Balcão.
          </DialogDescription>
        </DialogHeader>

        <form
          id="importar-planilha"
          noValidate
          aria-busy={salvando}
          onSubmit={(event) => {
            event.preventDefault()
            void importar()
          }}
          className="min-h-0 flex-1 overflow-y-auto p-6 space-y-8"
        >
          <section aria-labelledby="arquivo-titulo" className="space-y-2">
            <h3 id="arquivo-titulo" className="text-base font-semibold">
              Arquivo selecionado
            </h3>
            <p className="break-words text-base leading-6 text-slate-600">{previa.arquivo}</p>
            <details className="text-sm leading-6 text-slate-600">
              <summary className="min-h-12 cursor-pointer py-3 font-medium text-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">
                Como os dados serão importados
              </summary>
              <ul className="list-disc pl-4 space-y-2">
                {previa.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
                <li>
                  Os registros atuais serão mantidos. O mesmo arquivo não será importado duas vezes.
                </li>
              </ul>
            </details>
          </section>

          {previa.tipo === 'vendas' && (
            <section aria-labelledby="data-titulo" className="space-y-4">
              <div className="space-y-2">
                <label
                  id="data-titulo"
                  htmlFor="data-importacao"
                  className="block text-lg font-semibold"
                >
                  Data das vendas
                </label>
                <p id="data-orientacao" className="text-base leading-6 text-slate-600">
                  Informe o dia, o mês e o ano desses registros.
                </p>
                <InputData
                  id="data-importacao"
                  aria-describedby="data-orientacao"
                  value={data}
                  onChange={setData}
                  disabled={salvando}
                  required
                  className="max-w-64"
                />
              </div>
              <p className="text-base leading-6 text-slate-600">
                Saldo inicial:{' '}
                <strong className="font-semibold text-slate-800">
                  {formatCurrency(previa.saldo)}
                </strong>
                . Se já houver saldo nessa data, ele será mantido.
              </p>
            </section>
          )}

          <section aria-labelledby="registros-titulo" className="space-y-4">
            <div className="space-y-2">
              <h3 id="registros-titulo" className="text-lg font-semibold">
                {previa.tipo === 'vendas' ? 'Vendas para conferir' : 'Itens para selecionar'}
              </h3>
              <p className="text-base leading-6 text-slate-600">
                {previa.tipo === 'vendas'
                  ? 'Confira a quantidade e o pagamento. Desmarque o que não deseja importar.'
                  : 'Marque apenas os produtos. Deixe categorias e anotações desmarcadas.'}
              </p>
            </div>
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {linhas.map((linha, i) => (
                <li key={i} className="py-4 space-y-4">
                  <label className="flex min-h-12 cursor-pointer items-center gap-4 font-semibold leading-6">
                    <input
                      type="checkbox"
                      checked={linha.selecionada}
                      disabled={salvando}
                      className="h-6 w-6 shrink-0 accent-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
                      onChange={(event) =>
                        setLinhas((prev) =>
                          prev.map((l, n) =>
                            n === i ? { ...l, selecionada: event.target.checked } : l
                          )
                        )
                      }
                    />
                    <span>
                      {linha.nome}
                      <span className="sr-only">, linha {linha.linha}</span>
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-[96px_1fr_1fr]">
                    <div className="space-y-2">
                      <label
                        htmlFor={`quantidade-${i}`}
                        className="block text-sm font-medium text-slate-600"
                      >
                        Quantidade
                      </label>
                      <Input
                        id={`quantidade-${i}`}
                        aria-label={`Quantidade de ${linha.nome}, linha ${linha.linha}`}
                        type="number"
                        min={1}
                        value={linha.quantidade}
                        disabled={salvando || !linha.selecionada}
                        className="h-12 text-base"
                        onChange={(event) =>
                          setLinhas((prev) =>
                            prev.map((l, n) =>
                              n === i ? { ...l, quantidade: Number(event.target.value) } : l
                            )
                          )
                        }
                      />
                    </div>
                    {previa.tipo === 'vendas' && (
                      <>
                        <div className="space-y-2">
                          <span className="block text-sm font-medium text-slate-600">
                            Valor total
                          </span>
                          <p className="flex h-12 items-center font-semibold tabular-nums">
                            {formatCurrency(linha.total)}
                          </p>
                        </div>
                        <div className="col-span-2 space-y-2 sm:col-span-1">
                          <label
                            htmlFor={`pagamento-${i}`}
                            className="block text-sm font-medium text-slate-600"
                          >
                            Pagamento
                          </label>
                          <select
                            id={`pagamento-${i}`}
                            aria-label={`Pagamento de ${linha.nome}, linha ${linha.linha}`}
                            value={linha.pagamento}
                            disabled={salvando || !linha.selecionada}
                            className="h-12 w-full rounded-lg border border-violet-200 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50"
                            onChange={(event) =>
                              setLinhas((prev) =>
                                prev.map((l, n) =>
                                  n === i
                                    ? { ...l, pagamento: event.target.value as PagamentoImportacao }
                                    : l
                                )
                              )
                            }
                          >
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="cartao">Crédito</option>
                            <option value="debito">Débito</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </form>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-6 space-y-4">
          <MensagemErro mensagem={erro} />
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex flex-wrap items-center justify-between gap-2 leading-6"
          >
            <span>
              {selecionadas.length}{' '}
              {selecionadas.length === 1 ? 'registro selecionado' : 'registros selecionados'}
            </span>
            {previa.tipo === 'vendas' && (
              <span className="font-semibold">
                Total: {formatCurrency(selecionadas.reduce((s, l) => s + l.total, 0))}
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-12 px-6 text-base"
              disabled={salvando}
              onClick={onFechar}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="importar-planilha"
              className="h-12 px-6 text-base"
              disabled={salvando}
            >
              {salvando ? 'Importando...' : 'Confirmar importação'}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
