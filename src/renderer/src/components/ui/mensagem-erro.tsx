export function MensagemErro({ mensagem }: { mensagem: string }): React.JSX.Element | null {
  if (!mensagem) return null
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {mensagem}
    </p>
  )
}
