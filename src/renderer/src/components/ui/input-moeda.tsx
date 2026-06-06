import * as React from 'react'
import { cn } from '@renderer/lib/utils'

interface InputMoedaProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (valor: number) => void
}

function formatarCentavos(centavos: number): string {
  if (centavos === 0) return '0'
  const valor = centavos / 100
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const InputMoeda = React.forwardRef<HTMLInputElement, InputMoedaProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [centavos, setCentavos] = React.useState(() => {
      const safe = typeof value === 'number' && isFinite(value) ? value : 0
      return Math.round(safe * 100)
    })

    React.useEffect(() => {
      const safe = typeof value === 'number' && isFinite(value) ? value : 0
      setCentavos(Math.round(safe * 100))
    }, [value])

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
      const base = isNaN(centavos) ? 0 : centavos
      if (e.key === 'Backspace') {
        e.preventDefault()
        const novo = Math.floor(base / 10)
        setCentavos(novo)
        onChange(novo / 100)
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        const novo = base * 10 + parseInt(e.key)
        if (novo > 9_999_999) return
        setCentavos(novo)
        onChange(novo / 100)
      }
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        readOnly
        value={formatarCentavos(centavos)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)
InputMoeda.displayName = 'InputMoeda'

export { InputMoeda }
