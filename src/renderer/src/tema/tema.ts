import { createContext, useContext } from 'react'

export type Tema = 'roxo' | 'paysandu'

export const TEMAS = {
  roxo: {
    nome: 'Loja da mãe · Roxo',
    titulo: 'J&C Variedades',
    pessoa: 'Cleide',
    lema: 'Seu balcão, do seu jeito.',
    mensagem: 'Feito com carinho pela Jesga. Boas vendas!'
  },
  paysandu: {
    nome: 'Loja do pai · Paysandu',
    titulo: 'Balcão do Papão',
    pessoa: 'Jander',
    lema: 'Azul e branco, sempre.',
    mensagem: 'Feito com carinho pela Jesga. Bora, Papão!'
  }
} satisfies Record<
  Tema,
  {
    nome: string
    titulo: string
    pessoa: string
    lema: string
    mensagem: string
  }
>

export const CHAVE_TEMA = 'balcao:tema'
export const TemaContext = createContext<{
  tema: Tema
  definirTema: (tema: Tema) => void
} | null>(null)

export function useTema(): {
  tema: Tema
  definirTema: (tema: Tema) => void
  identidade: (typeof TEMAS)[Tema]
} {
  const contexto = useContext(TemaContext)
  if (!contexto) throw new Error('useTema precisa estar dentro de TemaProvider')
  return { ...contexto, identidade: TEMAS[contexto.tema] }
}
