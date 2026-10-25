import { useId, useRef, useState, useSyncExternalStore } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import { CalendarDays, X } from 'lucide-react'
import { InputData } from './ui/input-data'
import { Button } from './ui/button'
import { cn, dateToISO, formatDate } from '@renderer/lib/utils'

interface Props {
  inicio: string
  fim: string
  onAplicar: (inicio: string, fim: string) => void
}

function dataLocal(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const data = new Date(`${iso}T12:00:00`)
  return Number.isFinite(data.getTime()) && dateToISO(data) === iso ? data : undefined
}

function observarTela(callback: () => void): () => void {
  const media = window.matchMedia('(min-width: 1000px)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function EditorPeriodo({
  inicio,
  fim,
  onAplicar,
  onCancelar,
  referencia
}: Props & {
  onCancelar: () => void
  referencia: 'inicio' | 'fim'
}): React.JSX.Element {
  const [de, setDe] = useState(inicio)
  const [ate, setAte] = useState(fim)
  const [mes, setMes] = useState(dataLocal(referencia === 'fim' ? fim : inicio) ?? new Date())
  const telaGrande = useSyncExternalStore(
    observarTela,
    () => window.matchMedia('(min-width: 1000px)').matches
  )
  const tituloId = useId()
  const ajudaId = useId()
  const deId = useId()
  const ateId = useId()
  const hoje = new Date()
  const dia = (offset: number): string =>
    dateToISO(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + offset))
  const inicioSemana = -((hoje.getDay() + 6) % 7)
  const atalhos = [
    { nome: 'Hoje', de: dia(0), ate: dia(0) },
    { nome: 'Ontem', de: dia(-1), ate: dia(-1) },
    { nome: 'Esta semana', de: dia(inicioSemana), ate: dia(0) },
    { nome: 'Semana passada', de: dia(inicioSemana - 7), ate: dia(inicioSemana - 1) },
    {
      nome: 'Este mês',
      de: dateToISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
      ate: dia(0)
    },
    {
      nome: 'Mês passado',
      de: dateToISO(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
      ate: dateToISO(new Date(hoje.getFullYear(), hoje.getMonth(), 0))
    },
    { nome: 'Este ano', de: `${hoje.getFullYear()}-01-01`, ate: dia(0) },
    {
      nome: 'Ano passado',
      de: `${hoje.getFullYear() - 1}-01-01`,
      ate: `${hoje.getFullYear() - 1}-12-31`
    }
  ]
  const valido = !!dataLocal(de) && !!dataLocal(ate) && de <= ate
  const selecionado: DateRange | undefined = dataLocal(de)
    ? { from: dataLocal(de), to: dataLocal(ate) }
    : undefined
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="space-y-1">
          <h2 id={tituloId} className="text-xl font-semibold text-slate-900">
            Selecionar período
          </h2>
          <p id={ajudaId} className="text-base leading-6 text-slate-600">
            Escolha a data inicial e a final, ou use um atalho.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Fechar calendário"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          if (valido) onAplicar(de, ate)
        }}
        aria-labelledby={tituloId}
        aria-describedby={ajudaId}
      >
        <div className="min-h-0 overflow-y-auto min-[1000px]:grid min-[1000px]:grid-cols-[176px_1fr]">
          <div
            aria-label="Períodos rápidos"
            className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 p-4 min-[1000px]:flex-col min-[1000px]:gap-0 min-[1000px]:border-r min-[1000px]:border-b-0"
          >
            {atalhos.map((atalho) => (
              <button
                key={atalho.nome}
                type="button"
                aria-pressed={de === atalho.de && ate === atalho.ate}
                onClick={() => {
                  setDe(atalho.de)
                  setAte(atalho.ate)
                  setMes(dataLocal(atalho.de)!)
                }}
                className={cn(
                  'min-h-12 shrink-0 rounded-lg px-3 text-left text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600',
                  de === atalho.de && ate === atalho.ate
                    ? 'bg-violet-100 text-violet-900'
                    : 'text-slate-700 hover:bg-slate-200'
                )}
              >
                {atalho.nome}
              </button>
            ))}
          </div>
          <div className="flex justify-center p-4 min-[1000px]:p-6">
            <DayPicker
              className="periodo-calendario"
              mode="range"
              locale={ptBR}
              weekStartsOn={1}
              selected={selecionado}
              month={mes}
              onMonthChange={setMes}
              numberOfMonths={telaGrande ? 2 : 1}
              fixedWeeks
              onSelect={(intervalo) => {
                setDe(intervalo?.from ? dateToISO(intervalo.from) : '')
                setAte(intervalo?.to ? dateToISO(intervalo.to) : '')
              }}
            />
          </div>
        </div>
        <div className="shrink-0 space-y-4 border-t border-slate-200 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-40 space-y-2">
                <label htmlFor={deId} className="block text-sm font-medium text-slate-700">
                  Data inicial
                </label>
                <InputData
                  id={deId}
                  value={de}
                  onChange={(valor) => {
                    setDe(valor)
                    if (dataLocal(valor)) setMes(dataLocal(valor)!)
                  }}
                />
              </div>
              <div className="w-40 space-y-2">
                <label htmlFor={ateId} className="block text-sm font-medium text-slate-700">
                  Data final
                </label>
                <InputData id={ateId} value={ate} onChange={setAte} />
              </div>
            </div>
            <div className="flex gap-4 self-center">
              <Button
                type="button"
                variant="outline"
                className="h-12 px-6 text-base"
                onClick={onCancelar}
              >
                Cancelar
              </Button>
              <Button type="submit" className="h-12 px-6 text-base" disabled={!valido}>
                Aplicar
              </Button>
            </div>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'text-sm leading-5',
              de && ate && de > ate ? 'text-red-700' : 'text-slate-600'
            )}
          >
            {de && ate && de > ate
              ? 'A data final deve ser igual ou posterior à data inicial.'
              : valido
                ? `Período: ${formatDate(de)} a ${formatDate(ate)}. Clique em Aplicar para atualizar o histórico.`
                : 'Selecione as duas datas para aplicar o período.'}
          </p>
        </div>
      </form>
    </>
  )
}

export function FiltroPeriodo({ inicio, fim, onAplicar }: Props): React.JSX.Element {
  const [aberto, setAberto] = useState(false)
  const [referencia, setReferencia] = useState<'inicio' | 'fim'>('inicio')
  const origem = useRef<HTMLButtonElement | null>(null)
  const conteudoId = useId()
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto} modal>
      <Popover.Anchor asChild>
        <div className="flex flex-wrap gap-4">
          {(
            [
              { campo: 'inicio', nome: 'Data inicial', valor: inicio },
              { campo: 'fim', nome: 'Data final', valor: fim }
            ] as const
          ).map(({ campo, nome, valor }) => (
            <div key={campo} className="space-y-2">
              <span
                id={`${conteudoId}-${campo}`}
                className="block text-base font-medium text-slate-700"
              >
                {nome}
              </span>
              <button
                type="button"
                aria-label={`${nome}: ${formatDate(valor)}. Abrir calendário`}
                aria-haspopup="dialog"
                aria-expanded={aberto}
                aria-controls={aberto ? conteudoId : undefined}
                onClick={(event) => {
                  origem.current = event.currentTarget
                  setReferencia(campo)
                  setAberto(true)
                }}
                className="flex h-12 w-52 items-center justify-between gap-4 rounded-lg border border-violet-200 bg-white px-4 text-base tabular-nums text-slate-800 hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                <span>{valor ? formatDate(valor) : 'DD/MM/AAAA'}</span>
                <CalendarDays className="h-5 w-5 text-violet-700" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          id={conteudoId}
          aria-label="Selecionar período do histórico"
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            origem.current?.focus()
          }}
          className="periodo-popover z-50 w-[min(900px,calc(100vw-32px))] max-h-[min(760px,var(--radix-popover-content-available-height))] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none"
        >
          <EditorPeriodo
            inicio={inicio}
            fim={fim}
            referencia={referencia}
            onCancelar={() => setAberto(false)}
            onAplicar={(de, ate) => {
              onAplicar(de, ate)
              setAberto(false)
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
