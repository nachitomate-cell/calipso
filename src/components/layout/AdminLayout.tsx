import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, UtensilsCrossed, Table2, CalendarDays,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import Logo from '../ui/Logo'
import clsx from 'clsx'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/carta', label: 'Carta', icon: UtensilsCrossed },
  { to: '/admin/mesas', label: 'Mesas', icon: Table2 },
  { to: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const activeItem = navItems.find(n => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))

  return (
    <div className="min-h-screen bg-calipso-50 flex">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-calipso-700 transform transition-transform duration-200 flex flex-col',
        'lg:translate-x-0 lg:static lg:inset-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Sidebar header */}
        <div className="px-5 py-4 bg-ink border-b border-white/10">
          <Link to="/">
            <Logo size="sm" />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-card text-sm font-medium transition-all duration-200 group',
                  active
                    ? 'bg-calipso text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={13} className="ml-auto opacity-70" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-card text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 w-full"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-calipso-100 px-4 sm:px-6 h-16 flex items-center gap-4 sticky top-0 z-30 shadow-brand">
          <button
            className="lg:hidden text-calipso-700 p-1"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="font-display text-ink font-semibold text-lg">
            {activeItem?.label ?? 'Admin'}
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
