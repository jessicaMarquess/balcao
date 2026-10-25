import * as React from 'react'
import { cn } from '@renderer/lib/utils'

interface InputMoedaProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: number
  onChange: (valor: number) => void
}

function valorSeguro(valor: number): number {
  return Number.isFinite(valor) ? Math.max(0, valor) : 0
}

function formatar(valor: number, moeda: boolean): string {
  return valorSeguro(valor).toLocaleString('pt-BR', {
    ...(moeda ? { style: 'currency', currency: 'BRL' } : {}),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function interpretar(texto: string): number | null {
  const limpo = texto.replace(/^\s*R\$\s*/, '').trim()
  if (!limpo) return 0
  // Aceita reais com vírgula, valores colados com separador de milhar e ponto decimal.
  let normalizado: string
  if (/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{0,2})?$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{0,2}$/.test(limpo)) {
    normalizado = limpo
  } else {
    return null
  }
  const valor = Number(normalizado)
  return Number.isFinite(valor) && valor >= 0 && valor <= 99_999.99 ? valor : null
}

const InputMoeda = React.forwardRef<HTMLInputElement, InputMoedaProps>(
  ({ className, value, onChange, onFocus, onBlur, ...props }, ref) => {
    const [editando, setEditando] = React.useState(false)
    const [texto, setTexto] = React.useState(() => formatar(value, false))
    const [erro, setErro] = React.useState('')
    const emitido = React.useRef(value)
    const erroId = React.useId()

    React.useEffect(() => {
      if (value !== emitido.current) {
        emitido.current = value
        setTexto(formatar(value, false))
        setErro('')
      }
    }, [value])

    return (
      <>
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={editando ? texto : formatar(value, true)}
          onFocus={(event) => {
            setTexto(formatar(value, false))
            setEditando(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setEditando(false)
            onBlur?.(event)
          }}
          onChange={(event) => {
            const novo = event.target.value
            const valor = interpretar(novo)
            if (valor === null) {
              setErro('Use um valor de 0 a 99.999,99, com até duas casas decimais.')
              return
            }
            setTexto(novo)
            setErro('')
            emitido.current = valor
            onChange(valor)
          }}
          aria-invalid={erro ? true : props['aria-invalid']}
          aria-describedby={
            [props['aria-describedby'], erro ? erroId : ''].filter(Boolean).join(' ') || undefined
          }
          className={cn(
            'flex h-10 w-full cursor-text select-text caret-current rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            className
          )}
        />
        {erro && (
          <span id={erroId} role="alert" className="text-xs text-red-700">
            {erro}
          </span>
        )}
      </>
    )
  }
)
InputMoeda.displayName = 'InputMoeda'

export { InputMoeda }
