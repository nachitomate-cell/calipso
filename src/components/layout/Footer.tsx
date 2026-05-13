import { Link } from 'react-router-dom'
import { MapPin, Phone, Clock, Instagram } from 'lucide-react'
import Logo from '../ui/Logo'

export default function Footer() {
  return (
    <footer className="bg-ink text-white/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <Logo size="md" className="mb-5" />
            <p className="text-sm leading-relaxed mt-2">
              Desde nuestra terraza frente al Pacífico, ofrecemos lo mejor del mar chileno con técnica y pasión.
            </p>
            <a
              href="https://instagram.com"
              className="inline-flex items-center gap-2 mt-5 text-calipso hover:text-calipso-300 transition-colors text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={15} />
              @calipsoconcon
            </a>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold tracking-[0.25em] uppercase text-xs font-body">Información</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-calipso mt-0.5 flex-shrink-0" />
                <span>Av. Borgoño 14900, Concón<br />Región de Valparaíso, Chile</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-calipso flex-shrink-0" />
                <span>+56 9 8765 4321</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={14} className="text-calipso mt-0.5 flex-shrink-0" />
                <div>
                  <p>Mar–Vie: 13:00 – 16:00 / 19:30 – 23:00</p>
                  <p>Sáb–Dom: 12:30 – 23:30</p>
                  <p className="text-white/30">Lunes: Cerrado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold tracking-[0.25em] uppercase text-xs font-body">Navegación</h3>
            <div className="space-y-2 text-sm">
              <Link to="/carta" className="block hover:text-white transition-colors">Carta Digital</Link>
              <Link to="/reservas" className="block hover:text-white transition-colors">Reservar una mesa</Link>
              <Link to="/admin" className="block hover:text-white transition-colors">Acceso Admin</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Calipso Restaurant Concón. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
