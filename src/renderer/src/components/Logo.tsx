import logoSrc from '@renderer/assets/logo.png'

export function Logo(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <img src={logoSrc} alt="J&C Variedades" className="h-10 w-10 object-contain rounded-lg" />
      <div className="flex flex-col">
        <span className="text-sm font-bold tracking-tight leading-tight bg-linear-to-r from-violet-300 to-fuchsia-200 bg-clip-text text-transparent">
          J&C Variedades
        </span>
        <span className="text-xs text-white/40 mt-0.5">Balcão</span>
      </div>
    </div>
  )
}
