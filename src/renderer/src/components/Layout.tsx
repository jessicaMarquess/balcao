import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Package, History, BarChart2, PieChart, ShoppingBasket, Download, Upload, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Logo } from './Logo'

const navItems = [
  { to: '/dia', label: 'PDV', icon: CalendarDays, end: true },
  { to: '/produtos', label: 'Produtos', icon: Package, end: false },
  { to: '/historico', label: 'Histórico', icon: History, end: false },
  { to: '/relatorio', label: 'Relatório', icon: BarChart2, end: false },
  { to: '/estatisticas', label: 'Estatísticas', icon: PieChart, end: false },
  { to: '/lista-compras', label: 'Lista de compras', icon: ShoppingBasket, end: false }
]

type BackupEstado = 'idle' | 'loading' | 'erro'

export default function Layout(): React.JSX.Element {
  const [exportando, setExportando] = useState<BackupEstado>('idle')
  const [importando, setImportando] = useState<BackupEstado>('idle')

  async function handleExportar(): Promise<void> {
    setExportando('loading')
    try {
      const res = await window.api.backup.exportar()
      if ('cancelado' in res || res.sucesso) {
        setExportando('idle')
      } else {
        setExportando('erro')
        setTimeout(() => setExportando('idle'), 3000)
      }
    } catch {
      setExportando('erro')
      setTimeout(() => setExportando('idle'), 3000)
    }
  }

  async function handleImportar(): Promise<void> {
    setImportando('loading')
    try {
      const res = await window.api.backup.importar()
      if ('cancelado' in res) { setImportando('idle'); return }
      if (res.sucesso) {
        setImportando('idle')
        window.location.reload()
      } else {
        setImportando('erro')
        setTimeout(() => setImportando('idle'), 3000)
      }
    } catch {
      setImportando('erro')
      setTimeout(() => setImportando('idle'), 3000)
    }
  }

  return (
    <div className="flex h-screen bg-violet-50/60">
      <aside className="flex w-52 flex-col bg-[#120d24] text-white shrink-0">
        {/* Brand */}
        <div className="flex h-16 items-center px-4 border-b border-white/10">
          <Logo />
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
        <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-2">
          <button
            onClick={handleExportar}
            disabled={exportando === 'loading' || importando === 'loading'}
            title="Fazer backup"
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 w-full',
              exportando === 'erro'
                ? 'bg-red-900/40 text-red-300'
                : 'text-white/50 hover:bg-white/8 hover:text-white/90 disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {exportando === 'loading'
              ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              : <Download className="h-3.5 w-3.5 shrink-0" />}
            {exportando === 'erro' ? 'Erro ao exportar' : 'Backup'}
          </button>

          <button
            onClick={handleImportar}
            disabled={exportando === 'loading' || importando === 'loading'}
            title="Restaurar backup"
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 w-full',
              importando === 'erro'
                ? 'bg-red-900/40 text-red-300'
                : 'text-white/50 hover:bg-white/8 hover:text-white/90 disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {importando === 'loading'
              ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              : <Upload className="h-3.5 w-3.5 shrink-0" />}
            {importando === 'erro' ? 'Erro ao restaurar' : 'Restaurar'}
          </button>

          <p className="text-xs text-white/25 text-center mt-1">v1.0</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
