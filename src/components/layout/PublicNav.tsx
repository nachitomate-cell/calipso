import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../ui/Logo'
import clsx from 'clsx'

const links = [
  { to: '/carta', label: 'Carta' },
  { to: '/reservas', label: 'Reservas' },
]

export default function PublicNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-calipso border-b border-white/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[68px]">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'text-sm tracking-widest uppercase font-medium transition-colors duration-200',
                  pathname.startsWith(to)
                    ? 'text-arena'
                    : 'text-white/90 hover:text-arena'
                )}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/reservas"
              className="bg-coral hover:bg-coral-hover text-white text-sm font-semibold tracking-wide uppercase px-5 py-2.5 rounded-card transition-all duration-200 hover:shadow-brand-md"
            >
              Reservar una mesa
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-calipso border-t border-white/20">
          <div className="px-6 py-6 space-y-4">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="block text-white/90 hover:text-arena text-base font-medium uppercase tracking-widest transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link
              to="/reservas"
              onClick={() => setOpen(false)}
              className="block bg-coral text-white font-semibold text-center py-3 rounded-card mt-4 uppercase tracking-wide text-sm"
            >
              Reservar una mesa
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
