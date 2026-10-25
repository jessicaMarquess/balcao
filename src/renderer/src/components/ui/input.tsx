import * as React from 'react'
import { cn } from '@renderer/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, onKeyDown, min, step, ...props }, ref) => {
    const [erro, setErro] = React.useState('')
    const erroId = React.useId()
    const minimo = Math.max(0, Number(min) || 0)
    return (
      <>
        <input
          type={type}
          className={cn(
            'flex h-10 w-full cursor-text select-text caret-current rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            className
          )}
          ref={ref}
          {...props}
          min={type === 'number' ? minimo : min}
          step={type === 'number' ? (step ?? 1) : step}
          aria-invalid={erro ? true : props['aria-invalid']}
          aria-describedby={
            [props['aria-describedby'], erro ? erroId : ''].filter(Boolean).join(' ') || undefined
          }
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (type === 'number' && ['-', '+', 'e', 'E'].includes(event.key)) {
              event.preventDefault()
              setErro(`Informe um número maior ou igual a ${minimo}.`)
            }
          }}
          onChange={(event) => {
            if (
              type === 'number' &&
              (event.target.validity.badInput ||
                (event.target.value !== '' &&
                  (!Number.isFinite(event.target.valueAsNumber) ||
                    event.target.valueAsNumber < minimo ||
                    ((step === undefined || Number(step) === 1) &&
                      !Number.isSafeInteger(event.target.valueAsNumber)))))
            ) {
              setErro(
                `Informe um número ${step === undefined || Number(step) === 1 ? 'inteiro ' : ''}maior ou igual a ${minimo}.`
              )
              event.target.value = String(props.value ?? '')
              return
            }
            setErro('')
            onChange?.(event)
          }}
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
Input.displayName = 'Input'

export { Input }
