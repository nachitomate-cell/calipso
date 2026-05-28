import { useState, useEffect, useMemo } from 'react'
import { getReservations, updateReservationStatus, updateReservation, getTables } from '../../lib/api'
import type { Reservation, ReservationStatus, Table } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Badge from '../../components/ui/Badge'
import {
  Calendar, Clock, Users, Phone, Mail, MessageSquare,
  Check, X, CheckCheck, Table2, Search, AlertCircle, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0] }

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

// ── status config ─────────────────────────────────────────────────────────────

const statusConfig: Record<ReservationStatus, {
  label: string
  badge: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  leftBorder: string
}> = {
  pending:   { label: 'Pendiente',  badge: 'pending',   leftBorder: 'border-l-[#BA7517]' },
  confirmed: { label: 'Confirmada', badge: 'confirmed',  leftBorder: 'border-l-[#3B6D11]' },
  cancelled: { label: 'Cancelada',  badge: 'cancelled',  leftBorder: 'border-l-coral' },
  completed: { label: 'Completada', badge: 'completed',  leftBorder: 'border-l-ink/20' },
}

const SECTOR_LABEL: Record<string, string> = {
  terraza: '🌊 Terraza',
  comedor: '🏠 Interior',
}

// ── AssignTableModal ──────────────────────────────────────────────────────────

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

  // Tables booked in same time window (90 min overlap, correct arithmetic)
  const bookedTableIds = new Set(
    allReservations
      .filter(r =>
        r.id !== reservation.id &&
        r.date === reservation.date &&
        r.status !== 'cancelled' &&
        Math.abs(timeToMinutes(r.time) - timeToMinutes(reservation.time)) < 90
      )
      .map(r => r.table_id)
      .filter(Boolean)
  )

  const suggested = tables
    .filter(t => t.is_active && t.capacity >= reservation.party_size && !bookedTableIds.has(t.id))
    .sort((a, b) => a.capacity - b.capacity)

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
          <span className="font-display font-semibold italic text-ink flex-1">Confirmar y asignar mesa</span>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink p-1"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-calipso-50 rounded-input px-4 py-3 text-sm text-ink">
            <p className="font-semibold">{reservation.guest_name}</p>
            <p className="text-ink-secondary mt-0.5">
              {reservation.party_size} personas · {reservation.date} · {reservation.time}
              {reservation.sector && <span className="ml-2 text-calipso">{SECTOR_LABEL[reservation.sector]}</span>}
            </p>
          </div>

          {suggested.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-secondary mb-2">
                Sugeridas — disponibles y con capacidad
              </p>
              <div className="grid grid-cols-3 gap-2">
                {suggested.slice(0, 6).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.id)}
                    className={clsx(
                      'border-2 rounded-input p-2.5 text-center transition-all',
                      selectedTable === t.id
                        ? 'border-[#3B6D11] bg-[#D4EDDA]'
                        : 'border-calipso-100 hover:border-calipso/50'
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

          {suggested.length === 0 && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs px-3 py-2.5 rounded-input border border-amber-200">
              <AlertCircle size={13} className="flex-shrink-0" />
              No hay mesas disponibles con capacidad suficiente para ese horario.
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-secondary mb-2">Asignar manualmente</p>
            <select
              value={selectedTable ?? ''}
              onChange={e => setSelectedTable(e.target.value || null)}
              className="w-full border border-calipso-100 rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            >
              <option value="">Sin asignar</option>
              {allActive.map(t => (
                <option
                  key={t.id} value={t.id}
                  disabled={bookedTableIds.has(t.id) && selectedTable !== t.id}
                >
                  Mesa #{t.number} — {t.capacity} pers. ({t.location})
                  {bookedTableIds.has(t.id) ? ' · OCUPADA' : ''}
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
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
            Confirmar reserva
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ReservationCard ───────────────────────────────────────────────────────────

function ReservationCard({
  res, allReservations, tables, onUpdate,
}: {
  res: Reservation; allReservations: Reservation[]; tables: Table[]; onUpdate: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showAssign, setShowAssign] = useState(false)

  const changeStatus = async (status: ReservationStatus) => {
    setUpdating(true); setError(null)
    try {
      await updateReservationStatus(res.id, status)
      onUpdate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    } finally { setUpdating(false) }
  }

  const handleConfirmWithTable = async (tableId: string | null) => {
    setUpdating(true); setError(null)
    try {
      // Bug fix: persist BOTH status and table_id
      await updateReservation(res.id, { status: 'confirmed', table_id: tableId })
      onUpdate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al confirmar')
    } finally {
      setUpdating(false)
      setShowAssign(false)
    }
  }

  const { badge, leftBorder } = statusConfig[res.status]
  const tableLabel = res.table?.number
    ? `Mesa #${res.table.number}`
    : res.table_id
      ? `Mesa #${res.table_id}`
      : null

  return (
    <div className={clsx(
      'bg-white rounded-card shadow-brand border-l-4 p-5 hover:shadow-brand-md transition-shadow duration-200',
      leftBorder
    )}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {/* Name + status badges */}
          <div className="flex items-center gap-2.5 flex-wrap mb-3">
            <h3 className="font-display font-bold text-ink text-lg italic">{res.guest_name}</h3>
            <Badge variant={badge}>{statusConfig[res.status].label}</Badge>
            {res.sector && (
              <span className="text-xs font-medium bg-calipso-50 text-calipso px-2 py-0.5 rounded-full">
                {SECTOR_LABEL[res.sector]}
              </span>
            )}
          </div>

          {/* Reservation details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-sm text-ink-secondary">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-calipso flex-shrink-0" />
              {new Date(res.date + 'T12:00:00').toLocaleDateString('es-CL', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-calipso flex-shrink-0" />
              {res.time}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-calipso flex-shrink-0" />
              {res.party_size} persona{res.party_size !== 1 ? 's' : ''}
            </span>
            {tableLabel && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3B6D11]">
                <Table2 size={12} className="flex-shrink-0" />
                {tableLabel}
              </span>
            )}
          </div>

          {/* Contact */}
          <div className="mt-3 space-y-1">
            <a href={`mailto:${res.guest_email}`}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-calipso transition-colors">
              <Mail size={11} /> {res.guest_email}
            </a>
            <a href={`tel:${res.guest_phone}`}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-calipso transition-colors">
              <Phone size={11} /> {res.guest_phone}
            </a>
            {res.notes && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded-input mt-1.5 border border-amber-100">
                <MessageSquare size={11} className="mt-0.5 flex-shrink-0" />
                <span className="italic">{res.notes}</span>
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-coral mt-2">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </div>

        {/* Actions */}
        {res.status !== 'cancelled' && res.status !== 'completed' && (
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {res.status === 'pending' && (
              <button
                onClick={() => setShowAssign(true)}
                disabled={updating}
                className="flex items-center gap-1.5 bg-[#D4EDDA] text-[#3B6D11] border border-[#3B6D11]/30 text-xs font-semibold px-3 py-2 rounded-input transition-all hover:bg-[#3B6D11] hover:text-white disabled:opacity-50"
              >
                <Check size={13} /> Confirmar + mesa
              </button>
            )}
            {res.status === 'confirmed' && (
              <button
                onClick={() => changeStatus('completed')}
                disabled={updating}
                className="flex items-center gap-1.5 bg-calipso-50 text-calipso border border-calipso/30 text-xs font-semibold px-3 py-2 rounded-input transition-all hover:bg-calipso hover:text-white disabled:opacity-50"
              >
                {updating ? <RefreshCw size={12} className="animate-spin" /> : <CheckCheck size={13} />}
                Completar
              </button>
            )}
            <button
              onClick={() => changeStatus('cancelled')}
              disabled={updating}
              className="flex items-center gap-1.5 bg-coral-light text-coral-dark border border-coral/20 text-xs font-semibold px-3 py-2 rounded-input transition-all hover:bg-coral hover:text-white disabled:opacity-50"
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

// ── Main ──────────────────────────────────────────────────────────────────────

type Period = 'hoy' | 'semana' | 'todo'

export default function ReservationsAdmin() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables,       setTables]       = useState<Table[]>([])
  const [loading,      setLoading]      = useState(true)
  const [status,       setStatus]       = useState<ReservationStatus | 'all'>('all')
  const [period,       setPeriod]       = useState<Period>('semana')
  const [search,       setSearch]       = useState('')

  const load = () => Promise.all([getReservations(), getTables()])
    .then(([r, t]) => { setReservations(r); setTables(t) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  // ── derived ──────────────────────────────────────────────────────────────

  const today = todayStr()
  const weekEnd = addDays(today, 7)

  const afterPeriod = useMemo(() => {
    let base = reservations
    if (period === 'hoy')   base = base.filter(r => r.date === today)
    if (period === 'semana') base = base.filter(r => r.date >= today && r.date <= weekEnd)
    return base
  }, [reservations, period, today, weekEnd])

  const afterStatus = useMemo(() => {
    let base = afterPeriod
    if (status !== 'all') base = base.filter(r => r.status === status)
    return base
  }, [afterPeriod, status])

  const filtered = useMemo(() => {
    if (!search.trim()) return afterStatus
    const q = search.toLowerCase()
    return afterStatus.filter(r =>
      r.guest_name.toLowerCase().includes(q) ||
      r.guest_email.toLowerCase().includes(q) ||
      r.guest_phone.includes(q)
    )
  }, [afterStatus, search])

  // Status counts for current period
  const counts = useMemo(() => ({
    all:       afterPeriod.length,
    pending:   afterPeriod.filter(r => r.status === 'pending').length,
    confirmed: afterPeriod.filter(r => r.status === 'confirmed').length,
    completed: afterPeriod.filter(r => r.status === 'completed').length,
    cancelled: afterPeriod.filter(r => r.status === 'cancelled').length,
  }), [afterPeriod])

  // Today summary
  const todayReservations = reservations.filter(r => r.date === today)
  const todayConfirmedCovers = todayReservations
    .filter(r => r.status === 'confirmed')
    .reduce((s, r) => s + r.party_size, 0)
  const todayPending = todayReservations.filter(r => r.status === 'pending').length

  // Group by date
  const byDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of filtered) {
      map[r.date] = [...(map[r.date] ?? []), r]
    }
    return map
  }, [filtered])
  const sortedDates = Object.keys(byDate).sort()

  if (loading) return <PageLoader />

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'semana', label: 'Próximos 7 días' },
    { key: 'todo',   label: 'Todas las fechas' },
  ]
  const STATUS_FILTERS: (ReservationStatus | 'all')[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled']

  return (
    <div className="space-y-5 animate-fade-in font-body">

      {/* ── Today summary ──────────────────────────────────── */}
      {(todayConfirmedCovers > 0 || todayPending > 0) && (
        <div className="bg-calipso-50 border border-calipso-100 rounded-card px-5 py-3.5 flex items-center gap-4 flex-wrap">
          <Calendar size={15} className="text-calipso flex-shrink-0" />
          <span className="text-sm font-medium text-ink">Hoy:</span>
          {todayConfirmedCovers > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <Users size={13} className="text-[#3B6D11]" />
              <strong className="text-[#3B6D11]">{todayConfirmedCovers} personas</strong>
              <span className="text-ink-secondary">confirmadas</span>
            </span>
          )}
          {todayPending > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <strong className="text-amber-700">{todayPending} pendiente{todayPending !== 1 ? 's' : ''}</strong>
              <span className="text-ink-secondary">sin confirmar</span>
            </span>
          )}
        </div>
      )}

      {/* ── Period tabs ────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-calipso-50 rounded-card w-fit">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={clsx(
              'px-4 py-2 rounded-input text-sm font-semibold transition-all',
              period === p.key ? 'bg-white text-ink shadow-brand' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Search + status filters ────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-calipso-100 rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-calipso w-64"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                status === f
                  ? 'bg-calipso text-white shadow-brand'
                  : 'bg-white text-ink-secondary hover:text-calipso shadow-brand'
              )}
            >
              {f === 'all' ? 'Todas' : statusConfig[f as ReservationStatus].label}
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded-full',
                status === f ? 'bg-white/25 text-white' : 'bg-calipso-50 text-calipso'
              )}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Reservation list ───────────────────────────────── */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-card shadow-brand">
          <div className="text-5xl mb-4">📅</div>
          <p className="font-display italic text-lg text-ink">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay reservas en este período'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-calipso hover:underline">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        sortedDates.map(date => {
          const isToday = date === today
          const isPast  = date < today
          return (
            <div key={date}>
              <h3 className={clsx(
                'font-body font-semibold text-sm mb-3 flex items-center gap-2 uppercase tracking-wider',
                isToday ? 'text-calipso' : isPast ? 'text-ink/40' : 'text-calipso-700'
              )}>
                <Calendar size={13} />
                {isToday && <span className="bg-calipso text-white text-[10px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal">HOY</span>}
                {new Date(date + 'T12:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
                <span className="text-ink-secondary/50 normal-case font-normal">
                  ({byDate[date].length} reserva{byDate[date].length !== 1 ? 's' : ''} ·{' '}
                  {byDate[date].reduce((s, r) => s + (r.status !== 'cancelled' ? r.party_size : 0), 0)} personas)
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
          )
        })
      )}
    </div>
  )
}
