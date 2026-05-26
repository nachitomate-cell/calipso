import { useState, useEffect } from 'react'
import { getReservations, updateReservationStatus, getTables } from '../../lib/api'
import type { Reservation, ReservationStatus, Table } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Badge from '../../components/ui/Badge'
import { Calendar, Clock, Users, Phone, Mail, MessageSquare, Check, X, CheckCheck, Table2 } from 'lucide-react'
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

// ── Auto-assign modal ─────────────────────────────────────────────────────────

function AssignTableModal({
  reservation, allReservations, tables, onConfirm, onClose,
}: {
  reservation: Reservation
  allReservations: Reservation[]
  tables: Table[]
  onConfirm: (tableId: string | null) => Promise<void>
  onClose: () => void
}) {
  const [selectedTable, setSelectedTable] = useState<string | null>(reservation.table_id)
  const [saving, setSaving] = useState(false)

  // Find tables already booked in the same time window (±90 min)
  const bookedTableIds = new Set(
    allReservations
      .filter(r =>
        r.id !== reservation.id &&
        r.date === reservation.date &&
        r.status !== 'cancelled' &&
        Math.abs(
          parseInt(r.time.replace(':', '')) -
          parseInt(reservation.time.replace(':', ''))
        ) < 130
      )
      .map(r => r.table_id)
      .filter(Boolean)
  )

  // Suggested: active, right capacity, not booked
  const suggested = tables.filter(t =>
    t.is_active &&
    t.capacity >= reservation.party_size &&
    !bookedTableIds.has(t.id)
  ).sort((a, b) => a.capacity - b.capacity) // smallest fitting first

  const allActive = tables.filter(t => t.is_active)

  const handleConfirm = async () => {
    setSaving(true)
    try { await onConfirm(selectedTable) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-card shadow-brand-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-calipso-100 flex items-center gap-2">
          <Table2 size={16} className="text-calipso" />
          <span className="font-display font-semibold italic text-ink">Asignar mesa</span>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary">
            <strong className="text-ink">{reservation.guest_name}</strong> · {reservation.party_size} personas · {reservation.date} {reservation.time}
          </p>

          {suggested.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-secondary mb-2">Sugeridas (disponibles y con capacidad)</p>
              <div className="grid grid-cols-3 gap-2">
                {suggested.slice(0, 6).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.id)}
                    className={clsx(
                      'border-2 rounded-input p-2.5 text-center transition-all',
                      selectedTable === t.id
                        ? 'border-calipso bg-calipso-50'
                        : 'border-calipso-100 hover:border-calipso/40'
                    )}
                  >
                    <p className="text-base font-bold text-ink">#{t.number}</p>
                    <p className="text-[10px] text-ink-secondary">{t.capacity} pers.</p>
                    <p className="text-[9px] text-ink-secondary capitalize">{t.location}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-secondary mb-2">Todas las mesas</p>
            <select
              value={selectedTable ?? ''}
              onChange={e => setSelectedTable(e.target.value || null)}
              className="w-full border border-calipso-100 rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            >
              <option value="">Sin asignar</option>
              {allActive.map(t => (
                <option key={t.id} value={t.id} disabled={bookedTableIds.has(t.id) && selectedTable !== t.id}>
                  Mesa #{t.number} — {t.capacity} pers. ({t.location}){bookedTableIds.has(t.id) ? ' · ocupada' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 pb-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-calipso-100 text-ink-secondary text-sm py-2.5 rounded-input hover:bg-calipso-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-[#3B6D11] text-white text-sm font-semibold py-2.5 rounded-input hover:bg-[#2D5509] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <span className="animate-spin">⟳</span> : <Check size={14} />}
            Confirmar reserva
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reservation card ──────────────────────────────────────────────────────────

function ReservationCard({
  res, allReservations, tables, onUpdate,
}: {
  res: Reservation; allReservations: Reservation[]; tables: Table[]; onUpdate: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  const changeStatus = async (status: ReservationStatus) => {
    setUpdating(true)
    await updateReservationStatus(res.id, status).finally(() => setUpdating(false))
    onUpdate()
  }

  const handleConfirmWithTable = async (_tableId: string | null) => {
    setUpdating(true)
    try {
      await updateReservationStatus(res.id, 'confirmed')
      onUpdate()
    } finally {
      setUpdating(false)
      setShowAssign(false)
    }
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
                onClick={() => setShowAssign(true)}
                disabled={updating}
                className="flex items-center gap-1.5 bg-status-free text-[#3B6D11] border border-[#3B6D11]/30 text-xs font-semibold px-3 py-2 rounded-input transition-all duration-200 hover:bg-[#3B6D11] hover:text-white disabled:opacity-50"
              >
                <Check size={13} /> Confirmar + Asignar mesa
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

      {showAssign && (
        <AssignTableModal
          reservation={res}
          allReservations={allReservations}
          tables={tables}
          onConfirm={handleConfirmWithTable}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  )
}

export default function ReservationsAdmin() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('all')

  const load = () => Promise.all([getReservations(), getTables()])
    .then(([r, t]) => { setReservations(r); setTables(t) })
    .finally(() => setLoading(false))
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
                .map(r => (
                  <ReservationCard
                    key={r.id} res={r}
                    allReservations={reservations}
                    tables={tables}
                    onUpdate={load}
                  />
                ))
              }
            </div>
          </div>
        ))
      )}
    </div>
  )
}
