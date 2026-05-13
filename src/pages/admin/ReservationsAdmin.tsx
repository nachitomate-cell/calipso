import { useState, useEffect } from 'react'
import { getReservations, updateReservationStatus } from '../../lib/api'
import type { Reservation, ReservationStatus } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Badge from '../../components/ui/Badge'
import { Calendar, Clock, Users, Phone, Mail, MessageSquare, Check, X, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

const statusConfig: Record<ReservationStatus, {
  label: string
  badge: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  leftBorder: string
}> = {
  pending:   { label: 'Pendiente',  badge: 'pending',   leftBorder: 'border-l-[#BA7517]' },
  confirmed: { label: 'Confirmada', badge: 'confirmed',  leftBorder: 'border-l-[#3B6D11]' },
  cancelled: { label: 'Cancelada',  badge: 'cancelled',  leftBorder: 'border-l-coral' },
  completed: { label: 'Completada', badge: 'completed',  leftBorder: 'border-l-ink-secondary' },
}

function ReservationCard({ res, onUpdate }: { res: Reservation; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false)

  const changeStatus = async (status: ReservationStatus) => {
    setUpdating(true)
    await updateReservationStatus(res.id, status).finally(() => setUpdating(false))
    onUpdate()
  }

  const { label, badge, leftBorder } = statusConfig[res.status]
  void label

  return (
    <div className={clsx(
      'bg-white rounded-card shadow-brand border-l-4 p-5 hover:shadow-brand-md transition-shadow duration-200',
      leftBorder
    )}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-3">
            <h3 className="font-display font-bold text-ink text-lg italic">{res.guest_name}</h3>
            <Badge variant={badge}>{statusConfig[res.status].label}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-sm text-ink-secondary">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-calipso" />
              {new Date(res.date + 'T12:00:00').toLocaleDateString('es-CL', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-calipso" />
              {res.time}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-calipso" />
              {res.party_size} persona{res.party_size !== 1 ? 's' : ''}
            </span>
            {res.table_id && (
              <span className="text-xs font-medium text-calipso-700">Mesa #{res.table_id.slice(-4)}</span>
            )}
          </div>

          <div className="mt-3 space-y-1">
            <a
              href={`mailto:${res.guest_email}`}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-calipso transition-colors"
            >
              <Mail size={11} /> {res.guest_email}
            </a>
            <a
              href={`tel:${res.guest_phone}`}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-calipso transition-colors"
            >
              <Phone size={11} /> {res.guest_phone}
            </a>
            {res.notes && (
              <p className="flex items-start gap-1.5 text-xs text-ink-secondary mt-1 italic">
                <MessageSquare size={11} className="mt-0.5 flex-shrink-0" />
                {res.notes}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {res.status !== 'cancelled' && res.status !== 'completed' && (
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {res.status === 'pending' && (
              <button
                onClick={() => changeStatus('confirmed')}
                disabled={updating}
                className="flex items-center gap-1.5 bg-status-free text-[#3B6D11] border border-[#3B6D11]/30 text-xs font-semibold px-3 py-2 rounded-input transition-all duration-200 hover:bg-[#3B6D11] hover:text-white disabled:opacity-50"
              >
                <Check size={13} /> Confirmar
              </button>
            )}
            {res.status === 'confirmed' && (
              <button
                onClick={() => changeStatus('completed')}
                disabled={updating}
                className="flex items-center gap-1.5 bg-calipso-50 text-calipso border border-calipso/30 text-xs font-semibold px-3 py-2 rounded-input transition-all duration-200 hover:bg-calipso hover:text-white disabled:opacity-50"
              >
                <CheckCheck size={13} /> Completar
              </button>
            )}
            <button
              onClick={() => changeStatus('cancelled')}
              disabled={updating}
              className="flex items-center gap-1.5 bg-coral-light text-coral-dark border border-coral/20 text-xs font-semibold px-3 py-2 rounded-input transition-all duration-200 hover:bg-coral hover:text-white disabled:opacity-50"
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReservationsAdmin() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('all')

  const load = () => getReservations().then(setReservations).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  if (loading) return <PageLoader />

  const filters: (ReservationStatus | 'all')[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled']
  const counts: Record<string, number> = {
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)

  const byDate = filtered.reduce<Record<string, Reservation[]>>((acc, r) => {
    acc[r.date] = [...(acc[r.date] ?? []), r]
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort()

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
              filter === f
                ? 'bg-calipso text-white shadow-brand'
                : 'bg-white text-ink-secondary hover:text-calipso shadow-brand'
            )}
          >
            {f === 'all' ? 'Todas' : statusConfig[f as ReservationStatus].label}
            <span className={clsx(
              'text-xs px-1.5 py-0.5 rounded-full',
              filter === f ? 'bg-white/25 text-white' : 'bg-calipso-50 text-calipso'
            )}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-ink-secondary">
          <div className="text-5xl mb-4">📅</div>
          <p className="font-display italic text-lg">No hay reservas en esta categoría</p>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date}>
            <h3 className="font-body font-semibold text-calipso-700 text-sm mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Calendar size={13} />
              {new Date(date + 'T12:00:00').toLocaleDateString('es-CL', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
              <span className="text-ink-secondary/50 normal-case font-normal">
                ({byDate[date].length} reserva{byDate[date].length !== 1 ? 's' : ''})
              </span>
            </h3>
            <div className="space-y-3">
              {byDate[date]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(r => <ReservationCard key={r.id} res={r} onUpdate={load} />)
              }
            </div>
          </div>
        ))
      )}
    </div>
  )
}
