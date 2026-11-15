import SeletorTema from '@renderer/components/SeletorTema'
import { useTema } from '@renderer/tema/tema'
import { Button } from '@renderer/components/ui/button'
import { InputMoeda } from '@renderer/components/ui/input-moeda'
import { formatCurrency, hojeISO } from '@renderer/lib/utils'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const MENSAGENS_DIA: Record<number, string> = {
  0: 'Que vocês estão fazendo aqui, saiam! Hoje é dia de descanso! ☺',
  1: 'Hoje é segunda! Jesga ama vocês e está desejando uma ótima semana! ❤',
  2: 'Terça, não é? Pingo falou "au au", que traduzindo é: "cadê o pix para meu sachê?"',
  3: 'Quarta, ufaaaaa! Chegamos na metade da semana! Jesga deve estar felizona e morrendo de saudade! ❤',
  4: 'Quinta, QUINTA, aleluiaaaaa! Jesga mandou dizer que já podia ser sexta!! Boas vendas! ❤',
  5: 'Jesga está tão feliz agora por ser sexta que esqueceu de desejar bom dia! Boas vendas! ❤',
  6: 'Bora, bora time!! Só mais um dia!! Jesga está desejando um dia incrível de vendas! ❤'
}

export default function Inicio(): React.JSX.Element {
  const { identidade } = useTema()
  const navigate = useNavigate()
  const hoje = hojeISO()
  const [saldo, setSaldo] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [jaIniciado, setJaIniciado] = useState<boolean | null>(null) // null = carregando
  const [saldoAtual, setSaldoAtual] = useState(0)

  useEffect(() => {
    Promise.all([window.api.dia.existeSaldo(hoje), window.api.dia.getSaldo(hoje)]).then(
      ([existe, valor]) => {
        setJaIniciado(existe)
        setSaldoAtual(valor)
      }
    )
  }, [hoje])

  async function iniciar(): Promise<void> {
    setSalvando(true)
    await window.api.dia.setSaldo(hoje, saldo)
    navigate('/dia')
  }

  return (
    <div className="brand-welcome flex min-h-screen items-center justify-center overflow-y-auto px-6 py-10 relative">
      <div className="brand-stripes absolute inset-x-0 top-0 h-3" aria-hidden="true" />
      <div className="relative flex w-full max-w-md flex-col items-center gap-7 text-center">
        <div className="flex flex-col items-center gap-2">
          <div
            className="brand-stripes flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-white shadow-md mb-2"
            aria-hidden="true"
          >
            <span className="rounded-lg bg-brand-950 px-2 py-1 text-white font-black text-2xl">
              JC
            </span>
          </div>
          <p className="text-sm font-semibold text-brand-700">{identidade.titulo}</p>
          <h1 className="text-3xl font-bold text-brand-950 tracking-tight">
            {saudacao()}, {identidade.pessoa}!
          </h1>
          <p className="text-base text-slate-600 mt-1 max-w-sm leading-relaxed">
            {jaIniciado === null ? 'Carregando...' : MENSAGENS_DIA[new Date().getDay()]}
          </p>
        </div>

        {/* Card */}
        {jaIniciado === null ? null : jaIniciado ? (
          /* Dia já iniciado */
          <div className="flex flex-col items-center gap-4 w-full max-w-sm bg-white border border-brand-200 rounded-2xl px-7 py-7 shadow-sm">
            {saldoAtual > 0 && (
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-1">Saldo inicial de hoje</p>
                <p className="text-xl font-bold text-brand-800">{formatCurrency(saldoAtual)}</p>
              </div>
            )}
            <Button onClick={() => navigate('/dia')} size="lg" className="w-full">
              Ir para o caixa
            </Button>
          </div>
        ) : (
          /* Novo dia — pede saldo */
          <div className="flex flex-col items-center gap-3 w-full max-w-sm bg-white border border-brand-200 rounded-2xl px-7 py-7 shadow-sm">
            <label className="text-sm text-slate-700 font-medium">Saldo inicial do caixa</label>
            <InputMoeda
              value={saldo}
              onChange={setSaldo}
              className="text-center bg-white border-brand-300 text-brand-950 focus-visible:ring-brand-500 focus-visible:border-brand-400 text-lg font-semibold"
              autoFocus
            />
            <Button onClick={iniciar} disabled={salvando} size="lg" className="w-full mt-1">
              {salvando ? 'Iniciando...' : 'Iniciar o dia'}
            </Button>
          </div>
        )}
        <div className="w-full max-w-sm">
          <SeletorTema />
        </div>
        <p className="text-sm text-brand-700">{identidade.mensagem}</p>
      </div>
    </div>
  )
}
