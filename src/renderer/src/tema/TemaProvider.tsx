import { useLayoutEffect, useState, type ReactNode } from 'react'
import { CHAVE_TEMA, TEMAS, TemaContext, type Tema } from './tema'

function lerTema(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'paysandu' ? 'paysandu' : 'roxo'
  } catch {
    return 'roxo'
  }
}

export default function TemaProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [tema, definirTema] = useState<Tema>(lerTema)

  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
    document.title = TEMAS[tema].titulo
    try {
      localStorage.setItem(CHAVE_TEMA, tema)
    } catch {
      // A troca continua funcionando quando o armazenamento está indisponível.
    }
  }, [tema])

  return <TemaContext.Provider value={{ tema, definirTema }}>{children}</TemaContext.Provider>
}
