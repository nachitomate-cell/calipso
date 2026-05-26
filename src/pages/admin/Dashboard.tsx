import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllMenuItems, getTables, getReservations, getInventory } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import {
  UtensilsCrossed, Table2, CalendarDays, AlertCircle,
  TrendingUp, TrendingDown, Minus, Users, Clock,
  CheckCircle2, XCircle, Package, ArrowRight, ChevronRight,
} from 'lucide-react'
import type { Reservation, InventoryItem } from '../../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0] }

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function fmtCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function stockStatus(inv: InventoryItem): 'ok' | 'low' | 'out' {
  if (inv.stock_quantity === 0) return 'out'
  if (inv.stock_quantity < inv.min_stock) return 'low'
  return 'ok'
}

// avg ticket per confirmed guest (estimate based on menu avg ~$18.500)
const AVG_TICKET = 18500

// ── sub-components ────────────────────────────────────────────────────────────

function Trend({ value, label }: { value: number; label: string }) {
  if (value === 0) return <span className="flex items-center gap-0.5 text-ink-secondary text-xs"><Minus size={11} /> {label}</span>
  const up = value > 0
  return (
    <span className={`flex items-center gap-0.5 text-xs ${up ? 'text-[#3B6D11]' : 'text-coral'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{value} {label}
    </span>
  )
}

function StatCard({
  icon: Icon, label, value, sub, accent, trend,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub: string; accent: string; trend?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-card p-5 shadow-brand hover:shadow-brand-md transition-shadow duration-200">
      <div className={`inline-flex p-2.5 rounded-input mb-4 ${accent}`}>
        <Icon size={18} />
      </div>
      <p className="text-3xl font-bold text-ink tabular-nums leading-none">{value}</p>
      <p className="text-sm font-medium text-ink mt-1.5">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-ink-secondary">{sub}</p>
        {trend}
      </div>
    </div>
  )
}

// 7-day bar chart using CSS
function WeeklyChart({ reservations }: { reservations: Reservation[] }) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const data: { label: string; date: string; count: number; guests: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayResos = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled')
    data.push({
      label: days[d.getDay()],
      date: dateStr,
      count: dayResos.length,
      guests: dayResos.reduce((s, r) => s + r.party_size, 0),
    })
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="bg-white rounded-card p-5 shadow-brand">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-base text-ink font-semibold italic">Reservas — últimos 7 días</h2>
          <p className="text-xs text-ink-secondary mt-0.5">Reservas activas por día</p>
        </div>
        <Link to="/admin/reservas" className="text-xs text-calipso hover:underline flex items-center gap-0.5">
          Ver todas <ChevronRight size={12} />
        </Link>
      </div>

      <div className="flex items-end gap-1.5 h-28">
        {data.map((d, i) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
          const isToday = d.date === today()
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-ink-secondary tabular-nums">
                {d.count > 0 ? d.count : ''}
              </span>
              <div className="w-full rounded-t-sm transition-all" style={{
                height: `${Math.max(pct, 4)}%`,
                background: isToday ? '#29B5D0' : 'rgba(41,181,208,0.25)',
                minHeight: d.count > 0 ? '6px' : '4px',
              }} />
              <span className={`text-[10px] ${isToday ? 'text-calipso font-semibold' : 'text-ink-secondary'}`}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-calipso-100 flex gap-6">
        <div>
          <p className="text-xs text-ink-secondary">Total reservas</p>
          <p className="text-lg font-bold text-ink tabular-nums">{data.reduce((s, d) => s + d.count, 0)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Total comensales</p>
          <p className="text-lg font-bold text-ink tabular-nums">{data.reduce((s, d) => s + d.guests, 0)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Ingreso estimado</p>
          <p className="text-lg font-bold text-calipso tabular-nums">
            {fmtCLP(data.reduce((s, d) => s + d.guests, 0) * AVG_TICKET)}
          </p>
        </div>
      </div>
    </div>
  )
}

// Status breakdown donut (CSS-only pill bars)
function StatusBreakdown({ reservations }: { reservations: Reservation[] }) {
  const statuses: { key: Reservation['status']; label: string; color: string }[] = [
    { key: 'confirmed',  label: 'Confirmadas', color: '#3B6D11' },
    { key: 'pending',    label: 'Pendientes',  color: '#BA7517' },
    { key: 'completed',  label: 'Completadas', color: '#29B5D0' },
    { key: 'cancelled',  label: 'Canceladas',  color: '#E8593C' },
  ]
  const total = reservations.length || 1

  return (
    <div className="bg-white rounded-card p-5 shadow-brand">
      <h2 className="font-display text-base text-ink font-semibold italic mb-1">Estado de Reservas</h2>
      <p className="text-xs text-ink-secondary mb-4">Distribución total</p>
      <div className="space-y-3">
        {statuses.map(({ key, label, color }) => {
          const count = reservations.filter(r => r.status === key).length
          const pct = Math.round((count / total) * 100)
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-ink">{label}</span>
                <span className="text-xs text-ink-secondary tabular-nums">{count} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-calipso-50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Inventory alerts
function InventoryAlerts({ inventory }: { inventory: InventoryItem[] }) {
  const alerts = inventory.filter(i => stockStatus(i) !== 'ok')
  if (alerts.length === 0) return null

  return (
    <div className="bg-white rounded-card p-5 shadow-brand">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-base text-ink font-semibold italic">Alertas de Inventario</h2>
          <p className="text-xs text-ink-secondary mt-0.5">{alerts.length} producto{alerts.length !== 1 ? 's' : ''} requieren atención</p>
        </div>
        <Link to="/admin/inventario" className="text-xs text-calipso hover:underline flex items-center gap-0.5">
          Ver todo <ChevronRight size={12} />
        </Link>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map(inv => {
          const status = stockStatus(inv)
          return (
            <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-calipso-50 last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'out' ? 'bg-coral' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{inv.menu_item?.name ?? '—'}</p>
                <p className="text-xs text-ink-secondary">
                  {status === 'out'
                    ? 'Sin stock'
                    : `${inv.stock_quantity} ${inv.unit} (mín. ${inv.min_stock})`}
                </p>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                status === 'out'
                  ? 'bg-coral-light text-coral-dark'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {status === 'out' ? 'Sin stock' : 'Bajo'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Recent reservations
function RecentReservations({ reservations }: { reservations: Reservation[] }) {
  const recent = [...reservations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const statusConfig: Record<Reservation['status'], { label: string; cls: string; icon: React.ElementType }> = {
    confirmed:  { label: 'Confirmada', cls: 'bg-[#D4EDDA] text-[#3B6D11]', icon: CheckCircle2 },
    pending:    { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700',   icon: Clock },
    completed:  { label: 'Completada', cls: 'bg-calipso-50 text-calipso',   icon: CheckCircle2 },
    cancelled:  { label: 'Cancelada',  cls: 'bg-coral-light text-coral',    icon: XCircle },
  }

  return (
    <div className="bg-white rounded-card p-5 shadow-brand">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-base text-ink font-semibold italic">Reservas Recientes</h2>
          <p className="text-xs text-ink-secondary mt-0.5">Últimas solicitudes recibidas</p>
        </div>
        <Link to="/admin/reservas" className="text-xs text-calipso hover:underline flex items-center gap-0.5">
          Ver todas <ChevronRight size={12} />
        </Link>
      </div>
      <div className="space-y-3">
        {recent.map(r => {
          const { label, cls } = statusConfig[r.status]
          const dateLabel = r.date === today() ? 'Hoy' : r.date
          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-calipso-50 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-calipso" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{r.guest_name}</p>
                <p className="text-xs text-ink-secondary">{dateLabel} · {r.time} · {r.party_size} pers.</p>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [menuCount, setMenuCount] = useState(0)
  const [tableCount, setTableCount] = useState(0)

  useEffect(() => {
    Promise.all([getAllMenuItems(), getTables(), getReservations(), getInventory()])
      .then(([items, tables, resos, inv]) => {
        setMenuCount(items.filter(i => i.is_available).length)
        setTableCount(tables.filter(t => t.is_active).length)
        setReservations(resos)
        setInventory(inv)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const todayResos   = reservations.filter(r => r.date === today())
  const pendingCount = reservations.filter(r => r.status === 'pending').length
  const thisWeek     = reservations.filter(r => r.date >= daysAgo(7) && r.date <= today() && r.status !== 'cancelled')
  const prevWeek     = reservations.filter(r => r.date >= daysAgo(14) && r.date < daysAgo(7) && r.status !== 'cancelled')
  const weekDelta    = thisWeek.length - prevWeek.length
  const weekGuests   = thisWeek.reduce((s, r) => s + r.party_size, 0)
  const estimRevenue = weekGuests * AVG_TICKET
  const lowStock     = inventory.filter(i => stockStatus(i) !== 'ok').length

  const cards = [
    {
      icon: CalendarDays, label: 'Reservas hoy',
      value: todayResos.length, sub: `${todayResos.reduce((s, r) => s + r.party_size, 0)} comensales`,
      accent: 'bg-calipso-50 text-calipso',
      trend: <Trend value={weekDelta} label="vs sem. anterior" />,
    },
    {
      icon: AlertCircle, label: 'Por confirmar',
      value: pendingCount, sub: 'reservas pendientes',
      accent: pendingCount > 0 ? 'bg-coral-light text-coral' : 'bg-[#D4EDDA] text-[#3B6D11]',
      trend: pendingCount > 0
        ? <span className="text-xs text-coral font-medium">Requieren acción</span>
        : <span className="text-xs text-[#3B6D11]">Todo al día</span>,
    },
    {
      icon: TrendingUp, label: 'Ingreso estimado',
      value: fmtCLP(estimRevenue), sub: 'esta semana (aprox.)',
      accent: 'bg-arena-warm text-[#BA7517]',
      trend: <Trend value={weekDelta} label="reservas activas" />,
    },
    {
      icon: Package, label: 'Alertas inventario',
      value: lowStock, sub: lowStock > 0 ? 'productos con bajo stock' : 'inventario al día',
      accent: lowStock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-[#D4EDDA] text-[#3B6D11]',
      trend: lowStock > 0
        ? <Link to="/admin/inventario" className="text-xs text-amber-600 hover:underline flex items-center gap-0.5">Ver inventario <ArrowRight size={10} /></Link>
        : undefined,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink font-bold italic">Dashboard</h1>
          <p className="text-ink-secondary text-sm mt-0.5">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!import.meta.env.VITE_SUPABASE_URL && (
          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium uppercase tracking-wide">
            Modo demo
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, sub, accent, trend }) => (
          <StatCard key={label} icon={Icon} label={label} value={value} sub={sub} accent={accent} trend={trend} />
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Platos en carta', value: menuCount, icon: UtensilsCrossed, link: '/admin/carta' },
          { label: 'Mesas activas',   value: tableCount, icon: Table2, link: '/admin/mesas' },
          { label: 'Semana actual',   value: thisWeek.length, icon: CalendarDays, link: '/admin/reservas' },
          { label: 'Comensales sem.', value: weekGuests, icon: Users, link: '/admin/reservas' },
        ].map(({ label, value, icon: Icon, link }) => (
          <Link
            key={label} to={link}
            className="bg-white rounded-card px-4 py-3 shadow-brand hover:shadow-brand-md transition-shadow flex items-center gap-3 group"
          >
            <Icon size={16} className="text-calipso flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xl font-bold text-ink tabular-nums leading-none">{value}</p>
              <p className="text-[11px] text-ink-secondary mt-0.5 truncate">{label}</p>
            </div>
            <ChevronRight size={13} className="ml-auto text-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WeeklyChart reservations={reservations} />
        </div>
        <StatusBreakdown reservations={reservations} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentReservations reservations={reservations} />
        {lowStock > 0 && <InventoryAlerts inventory={inventory} />}
      </div>
    </div>
  )
}
