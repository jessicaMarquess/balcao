import { useId } from 'react'
import { TEMAS, useTema } from '@renderer/tema/tema'

export default function SeletorTema({ lateral = false }: { lateral?: boolean }): React.JSX.Element {
  const { tema, definirTema } = useTema()
  const id = useId()

  return (
    <div className="flex w-full flex-col gap-1.5 text-left" data-noprint>
      <label
        htmlFor={id}
        className={`text-xs font-medium ${lateral ? 'text-brand-100' : 'text-slate-600'}`}
      >
        Tema da loja
      </label>
      <select
        id={id}
        value={tema}
        onChange={(event) => definirTema(event.target.value === 'paysandu' ? 'paysandu' : 'roxo')}
        className="h-10 w-full rounded-lg border border-brand-200 bg-white px-2 text-sm text-brand-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <option value="roxo">{TEMAS.roxo.nome}</option>
        <option value="paysandu">{TEMAS.paysandu.nome}</option>
      </select>
    </div>
  )
}
