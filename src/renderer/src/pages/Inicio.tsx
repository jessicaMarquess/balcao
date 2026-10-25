import { mensagemErro } from '@renderer/lib/validacao'
import { MensagemErro } from '@renderer/components/ui/mensagem-erro'
import logoSrc from '@renderer/assets/logo.png'
import { Button } from '@renderer/components/ui/button'
import { InputMoeda } from '@renderer/components/ui/input-moeda'
import { hojeISO } from '@renderer/lib/utils'
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
  const navigate = useNavigate()
  const hoje = hojeISO()
  const [saldo, setSaldo] = useState(0)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [jaIniciado, setJaIniciado] = useState<boolean | null>(null) // null = carregando

  useEffect(() => {
    window.api.dia
      .existeSaldo(hoje)
      .then(setJaIniciado)
      .catch((error) =>
        setErro(
          mensagemErro(
            error,
            'Não foi possível carregar o caixa. Feche e abra o aplicativo para tentar novamente.'
          )
        )
      )
  }, [hoje])

  async function iniciar(): Promise<void> {
    if (salvando) return
    if (!Number.isFinite(saldo) || saldo < 0) {
      setErro('O saldo deve ser um número maior ou igual a 0.')
      return
    }
    setErro('')
    setSalvando(true)
    try {
      await window.api.dia.setSaldo(hoje, saldo)
      navigate('/dia')
    } catch (error) {
      setErro(mensagemErro(error, 'Não foi possível iniciar o dia. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0614] overflow-hidden relative">
      {/* Glow de fundo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-150 h-150 rounded-full bg-violet-700/20 blur-[120px]" />
      </div>
      <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <img
            src={logoSrc}
            alt="J&C Variedades"
            className="w-28 h-28 object-contain rounded-2xl mb-1 drop-shadow-[0_0_24px_rgba(139,92,246,0.4)]"
          />
          <p className="text-2xl font-bold text-white tracking-tight">
            {saudacao()}, Cleide e Jander!
          </p>
          <p className="text-sm text-white/50 mt-0.5 max-w-xs leading-relaxed">
            {jaIniciado === null ? 'Carregando...' : MENSAGENS_DIA[new Date().getDay()]}
          </p>
        </div>

        <MensagemErro mensagem={erro} />

        {/* Card */}
        {jaIniciado === null ? null : jaIniciado ? (
          /* Dia já iniciado */
          <Button onClick={() => navigate('/dia')} size="lg">
            Continuar com o dia
          </Button>
        ) : (
          /* Novo dia — pede saldo */
          <div className="flex flex-col items-center gap-3 w-64 bg-white/5 border border-white/10 rounded-2xl px-6 py-6 backdrop-blur-sm">
            <label className="text-sm text-white/60 font-medium">Saldo inicial do caixa</label>
            <InputMoeda
              value={saldo}
              onChange={setSaldo}
              className="text-center bg-white/10 border-white/20 text-white focus-visible:ring-violet-500 focus-visible:border-violet-400 text-lg font-semibold"
              autoFocus
            />
            <Button onClick={iniciar} disabled={salvando} size="lg" className="w-full mt-1">
              {salvando ? 'Iniciando...' : 'Iniciar o dia'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
