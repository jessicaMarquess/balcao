import { version } from '../../../../package.json'
import SeletorTema from './SeletorTema'
import { useTema } from '@renderer/tema/tema'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Package, History, BarChart2, ShoppingBasket } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const navItems = [
  { to: '/dia', label: 'PDV', icon: CalendarDays, end: true },
  { to: '/produtos', label: 'Produtos', icon: Package, end: false },
  { to: '/historico', label: 'Histórico', icon: History, end: false },
  { to: '/relatorio', label: 'Relatório', icon: BarChart2, end: false },
  { to: '/lista-compras', label: 'Lista de compras', icon: ShoppingBasket, end: false }
]

export default function Layout(): React.JSX.Element {
  const { identidade } = useTema()
  return (
    <div className="flex h-screen bg-brand-50/60">
      <aside className="flex w-56 flex-col bg-brand-950 border-r border-brand-900 text-white shrink-0">
        {/* Brand */}
        <div className="relative flex h-24 flex-col justify-center px-5 border-b border-white/15 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-brand-300">
          <span className="text-lg font-bold tracking-tight text-white">{identidade.titulo}</span>
          <span className="text-sm text-brand-200 mt-1">Balcão</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-200 text-brand-950 shadow-sm'
                    : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="mb-4">
            <SeletorTema lateral />
          </div>
          <div className="brand-stripes h-1.5 rounded-full mb-3" aria-hidden="true" />
          <p className="text-xs text-brand-200 text-center">{identidade.lema}</p>
          <p className="text-xs text-brand-200/70 text-center mt-1">Balcão • v{version}</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
