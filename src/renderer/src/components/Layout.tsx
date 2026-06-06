import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Package, History, BarChart2, PieChart, ShoppingBasket } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const navItems = [
  { to: '/dia', label: 'PDV', icon: CalendarDays, end: true },
  { to: '/produtos', label: 'Produtos', icon: Package, end: false },
  { to: '/historico', label: 'Histórico', icon: History, end: false },
  { to: '/relatorio', label: 'Relatório', icon: BarChart2, end: false },
  { to: '/estatisticas', label: 'Estatísticas', icon: PieChart, end: false },
  { to: '/lista-compras', label: 'Lista de compras', icon: ShoppingBasket, end: false }
]

export default function Layout(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-violet-50/60">
      <aside className="flex w-52 flex-col bg-[#120d24] text-white shrink-0">
        {/* Brand */}
        <div className="flex h-16 flex-col justify-center px-5 border-b border-white/10">
          <span className="text-sm font-bold tracking-tight bg-linear-to-r from-violet-300 to-purple-200 bg-clip-text text-transparent">
            J&C Variedades
          </span>
          <span className="text-xs text-white/40 mt-0.5">Balcão</span>
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
                    ? 'bg-linear-to-r from-violet-600 to-purple-600 text-white shadow-sm shadow-violet-900/50'
                    : 'text-white/50 hover:bg-white/8 hover:text-white/90'
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
          <p className="text-xs text-white/25 text-center">v1.0</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
