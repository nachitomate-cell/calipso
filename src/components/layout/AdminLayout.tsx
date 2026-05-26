import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, UtensilsCrossed, Table2, CalendarDays,
  Package, LogOut, Menu, X, ChevronRight,
  ClipboardList, ChefHat, BarChart2, Bell,
} from 'lucide-react'
import Logo from '../ui/Logo'
import clsx from 'clsx'
import { getReservations, getInventory, computeNotifications } from '../../lib/api'

const navGroups = [
  {
    label: 'Operaciones',
    items: [
      { to: '/admin',           label: 'Dashboard',   icon: LayoutDashboard, exact: true },
      { to: '/admin/comandas',  label: 'Comandas',    icon: ClipboardList },
      { to: '/admin/reservas',  label: 'Reservas',    icon: CalendarDays },
      { to: '/admin/mesas',     label: 'Mesas',       icon: Table2 },
    ],
  },
  {
    label: 'Carta & Stock',
    items: [
      { to: '/admin/carta',      label: 'Carta',       icon: UtensilsCrossed },
      { to: '/admin/inventario', label: 'Inventario',  icon: Package },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { to: '/admin/reportes',       label: 'Reportes',        icon: BarChart2 },
      { to: '/admin/notificaciones', label: 'Notificaciones',  icon: Bell },
    ],
  },
]

// Flat list for active detection
const navItems = navGroups.flatMap(g => g.items)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const activeItem = navItems.find(n => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))

  // Load unread notification count
  useEffect(() => {
    const load = async () => {
      try {
        const [resos, inv] = await Promise.all([getReservations(), getInventory()])
        const notifs = computeNotifications(resos, inv)
        try {
          const readIds = new Set(JSON.parse(localStorage.getItem('calipso_notif_read') ?? '[]') as string[])
          setUnreadCount(notifs.filter(n => !readIds.has(n.id)).length)
        } catch { setUnreadCount(notifs.length) }
      } catch { /* silent */ }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [pathname])

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

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/35 px-4 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === to : pathname.startsWith(to)
                  const isNotif = to === '/admin/notificaciones'
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-2.5 rounded-card text-sm font-medium transition-all duration-200 group',
                        active
                          ? 'bg-calipso text-white'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon size={16} />
                      <span className="flex-1">{label}</span>
                      {isNotif && unreadCount > 0 && (
                        <span className="bg-coral text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                      {active && !isNotif && <ChevronRight size={12} className="opacity-70" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
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
          <span className="font-display text-ink font-semibold text-lg flex-1">
            {activeItem?.label ?? 'Admin'}
          </span>

          {/* Kitchen shortcut */}
          <Link
            to="/admin/cocina"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 border border-calipso/30 text-calipso hover:bg-calipso hover:text-white text-xs font-semibold px-3 py-1.5 rounded-input transition-colors"
          >
            <ChefHat size={13} /> Cocina
          </Link>

          {/* Notification bell */}
          <Link to="/admin/notificaciones" className="relative p-1.5 text-ink-secondary hover:text-calipso transition-colors">
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
