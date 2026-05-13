import { useState, useEffect } from 'react'
import { getAllMenuItems, getTables, getReservations } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Badge from '../../components/ui/Badge'
import { UtensilsCrossed, Table2, CalendarDays, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<{
    items: number; available: number; tables: number; reservations: number; pending: number
  } | null>(null)

  useEffect(() => {
    Promise.all([getAllMenuItems(), getTables(), getReservations()]).then(([items, tables, reservations]) => {
      setStats({
        items: items.length,
        available: items.filter(i => i.is_available).length,
        tables: tables.filter(t => t.is_active).length,
        reservations: reservations.length,
        pending: reservations.filter(r => r.status === 'pending').length,
      })
    })
  }, [])

  if (!stats) return <PageLoader />

  const cards = [
    {
      icon: UtensilsCrossed,
      label: 'Platos en Carta',
      value: stats.available,
      sub: `${stats.items} en total`,
      accent: 'bg-calipso-50 text-calipso',
    },
    {
      icon: Table2,
      label: 'Mesas Activas',
      value: stats.tables,
      sub: 'en servicio',
      accent: 'bg-status-free text-[#3B6D11]',
    },
    {
      icon: CalendarDays,
      label: 'Reservas',
      value: stats.reservations,
      sub: 'en total',
      accent: 'bg-arena-warm text-[#BA7517]',
    },
    {
      icon: AlertCircle,
      label: 'Por confirmar',
      value: stats.pending,
      sub: 'reservas pendientes',
      accent: 'bg-coral-light text-coral',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in font-body">
      <div>
        <h1 className="font-display text-2xl text-ink font-bold italic">Bienvenido</h1>
        <p className="text-ink-secondary text-sm mt-1">Resumen del restaurante</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, sub, accent }) => (
          <div key={label} className="bg-white rounded-card p-6 shadow-brand hover:shadow-brand-md transition-shadow duration-200">
            <div className={`inline-flex p-3 rounded-input mb-4 ${accent}`}>
              <Icon size={19} />
            </div>
            <p className="text-3xl font-bold text-ink tabular-nums">{value}</p>
            <p className="text-sm font-medium text-ink mt-1">{label}</p>
            <p className="text-xs text-ink-secondary mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-card p-6 shadow-brand">
        <h2 className="font-display text-lg text-ink font-semibold italic mb-1">Estado del Sistema</h2>
        <p className="text-sm text-ink-secondary mb-4">Conexión de base de datos</p>
        <div className="flex items-center gap-3">
          {import.meta.env.VITE_SUPABASE_URL ? (
            <Badge variant="confirmed">Supabase conectado</Badge>
          ) : (
            <Badge variant="pending">Modo demo — datos mock</Badge>
          )}
          <span className="text-xs text-ink-secondary">
            {import.meta.env.VITE_SUPABASE_URL
              ? 'Los datos se guardan en la base de datos'
              : 'Configura VITE_SUPABASE_URL en .env para persistir datos'}
          </span>
        </div>
      </div>
    </div>
  )
}
