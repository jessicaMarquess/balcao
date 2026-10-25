import { useEffect, useId, useRef, useState } from 'react'
import { Input, type InputProps } from './input'
import { cn } from '@renderer/lib/utils'

interface InputDataProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: string
  onChange: (iso: string) => void
}

function paraBR(iso: string): string {
  const partes = iso.split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : ''
}

function paraISO(br: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return ''
  const [dia, mes, ano] = br.split('/')
  const iso = `${ano}-${mes}-${dia}`
  const data = new Date(`${iso}T00:00:00Z`)
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === iso ? iso : ''
}

/** Exibe datas brasileiras; o contrato com IPC e banco continua em ISO. */
export function InputData({
  value,
  onChange,
  className,
  onBlur,
  ...props
}: InputDataProps): React.JSX.Element {
  const [texto, setTexto] = useState(() => paraBR(value))
  const [visitado, setVisitado] = useState(false)
  const emitido = useRef(value)
  const ajudaId = useId()
  useEffect(() => {
    if (value !== emitido.current) {
      emitido.current = value
      setTexto(paraBR(value))
      setVisitado(false)
    }
  }, [value])
  const invalido = (visitado || texto.length === 10) && !!texto && !paraISO(texto)
  return (
    <div className="flex flex-col gap-2">
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        lang="pt-BR"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        value={texto}
        className={cn('h-12 text-base tabular-nums', className)}
        aria-invalid={invalido || props['aria-invalid'] || undefined}
        aria-describedby={[props['aria-describedby'], ajudaId].filter(Boolean).join(' ')}
        onChange={(event) => {
          const digitos = event.target.value.replace(/\D/g, '').slice(0, 8)
          const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(
            Boolean
          )
          const novo = partes.join('/')
          setTexto(novo)
          const iso = paraISO(novo)
          emitido.current = iso
          onChange(iso)
        }}
        onBlur={(event) => {
          setVisitado(true)
          onBlur?.(event)
        }}
      />
      <span
        id={ajudaId}
        className={cn('text-sm leading-5', invalido ? 'text-red-700' : 'text-slate-600')}
        role={invalido ? 'alert' : undefined}
      >
        {invalido ? 'Informe uma data válida no formato DD/MM/AAAA.' : 'Dia / mês / ano'}
      </span>
    </div>
  )
}
