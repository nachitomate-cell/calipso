import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getAllMenuItems, getTables, getReservations, getInventory, getActiveOrders } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import {
  UtensilsCrossed, Table2, CalendarDays, AlertCircle,
  TrendingUp, TrendingDown, Minus, Users, Clock,
  CheckCircle2, XCircle, Package, ArrowRight, ChevronRight,
  ChefHat, Truck, ExternalLink, RefreshCw, Circle,
} from 'lucide-react'
import type { Reservation, InventoryItem, Order } from '../../types'

// ── helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0] }

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
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

const AVG_TICKET = 18500

// ── Trend indicator ───────────────────────────────────────────────────────────

function Trend({ value, label }: { value: number; label: string }) {
  if (value === 0) return (
    <span className="flex items-center gap-1 text-sm text-ink-secondary">
      <Minus size={13} /> {label}
    </span>
  )
  const up = value > 0
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${up ? 'text-[#3B6D11]' : 'text-coral'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {up ? '+' : ''}{value} {label}
    </span>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, accent, iconBg, trend, borderColor,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub: string
  accent: string
  iconBg: string
  trend?: React.ReactNode
  borderColor: string
}) {
  return (
    <div
      className="bg-white rounded-card p-6 shadow-brand hover:shadow-brand-md transition-shadow duration-200 flex flex-col gap-3"
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      {/* Icon */}
      <div className={`inline-flex p-3 rounded-card w-fit ${iconBg}`}>
        <Icon size={22} className={accent} />
      </div>

      {/* Value */}
      <p className="text-4xl font-bold text-ink tabular-nums leading-none tracking-tight">
        {value}
      </p>

      {/* Label */}
      <div>
        <p className="text-base font-semibold text-ink leading-snug">{label}</p>
        <p className="text-sm text-ink-secondary mt-0.5">{sub}</p>
      </div>

      {/* Trend */}
      {trend && <div className="pt-1 border-t border-calipso-100">{trend}</div>}
    </div>
  )
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────

function WeeklyChart({ reservations }: { reservations: Reservation[] }) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayResos = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled')
    return { label: days[d.getDay()], date: dateStr, count: dayResos.length, guests: dayResos.reduce((s, r) => s + r.party_size, 0) }
  })

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const totalResos  = data.reduce((s, d) => s + d.count, 0)
  const totalGuests = data.reduce((s, d) => s + d.guests, 0)

  return (
    <div className="bg-white rounded-card p-6 shadow-brand">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-ink font-semibold italic">Reservas — últimos 7 días</h2>
          <p className="text-sm text-ink-secondary mt-1">Reservas activas por día</p>
        </div>
        <Link to="/admin/reservas" className="text-sm text-calipso hover:underline flex items-center gap-1 mt-1">
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const pct = (d.count / maxCount) * 100
          const isToday = d.date === today()
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-xs text-ink-secondary tabular-nums font-medium h-4">
                {d.count > 0 ? d.count : ''}
              </span>
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${Math.max(pct, 5)}%`,
                  background: isToday ? '#29B5D0' : 'rgba(41,181,208,0.22)',
                  minHeight: d.count > 0 ? '8px' : '4px',
                }}
              />
              <span className={`text-xs font-medium ${isToday ? 'text-calipso' : 'text-ink-secondary'}`}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-4 border-t border-calipso-100 grid grid-cols-3 gap-4">
        {[
          { label: 'Total reservas',   value: totalResos, color: 'text-ink' },
          { label: 'Total comensales', value: totalGuests, color: 'text-ink' },
          { label: 'Ingreso estimado', value: fmtCLP(totalGuests * AVG_TICKET), color: 'text-calipso' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-sm text-ink-secondary">{label}</p>
            <p className={`text-xl font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Status breakdown ──────────────────────────────────────────────────────────

function StatusBreakdown({ reservations }: { reservations: Reservation[] }) {
  const statuses: { key: Reservation['status']; label: string; color: string }[] = [
    { key: 'confirmed',  label: 'Confirmadas', color: '#3B6D11' },
    { key: 'pending',    label: 'Pendientes',  color: '#BA7517' },
    { key: 'completed',  label: 'Completadas', color: '#29B5D0' },
    { key: 'cancelled',  label: 'Canceladas',  color: '#E8593C' },
  ]
  const total = reservations.length || 1

  return (
    <div className="bg-white rounded-card p-6 shadow-brand">
      <h2 className="font-display text-xl text-ink font-semibold italic mb-1">Estado de Reservas</h2>
      <p className="text-sm text-ink-secondary mb-5">Distribución total</p>
      <div className="space-y-4">
        {statuses.map(({ key, label, color }) => {
          const count = reservations.filter(r => r.status === key).length
          const pct   = Math.round((count / total) * 100)
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold text-ink">{label}</span>
                <span className="text-sm text-ink-secondary tabular-nums">
                  {count} <span className="text-xs opacity-60">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-calipso-50 overflow-hidden">
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

// ── Inventory alerts ──────────────────────────────────────────────────────────

function InventoryAlerts({ inventory }: { inventory: InventoryItem[] }) {
  const alerts = inventory.filter(i => stockStatus(i) !== 'ok')
  if (alerts.length === 0) return null

  return (
    <div className="bg-white rounded-card p-6 shadow-brand">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-ink font-semibold italic">Alertas de Inventario</h2>
          <p className="text-sm text-ink-secondary mt-1">
            {alerts.length} producto{alerts.length !== 1 ? 's' : ''} requieren atención
          </p>
        </div>
        <Link to="/admin/inventario" className="text-sm text-calipso hover:underline flex items-center gap-1 mt-1">
          Ver todo <ChevronRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {alerts.slice(0, 5).map(inv => {
          const status = stockStatus(inv)
          const isOut  = status === 'out'
          return (
            <div key={inv.id} className="flex items-center gap-3 py-2.5 border-b border-calipso-50 last:border-0">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOut ? 'bg-coral' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-ink truncate">{inv.menu_item?.name ?? '—'}</p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  {isOut ? 'Sin stock' : `${inv.stock_quantity} ${inv.unit} · mín. ${inv.min_stock}`}
                </p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0 ${
                isOut ? 'bg-coral-light text-coral-dark' : 'bg-amber-50 text-amber-700'
              }`}>
                {isOut ? 'Sin stock' : 'Bajo'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Recent reservations ───────────────────────────────────────────────────────

function RecentReservations({ reservations }: { reservations: Reservation[] }) {
  const recent = [...reservations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const statusConfig: Record<Reservation['status'], { label: string; cls: string; icon: React.ElementType }> = {
    confirmed: { label: 'Confirmada', cls: 'bg-[#D4EDDA] text-[#3B6D11]',  icon: CheckCircle2 },
    pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700',    icon: Clock },
    completed: { label: 'Completada', cls: 'bg-calipso-50 text-calipso',    icon: CheckCircle2 },
    cancelled: { label: 'Cancelada',  cls: 'bg-coral-light text-coral-dark', icon: XCircle },
  }

  return (
    <div className="bg-white rounded-card p-6 shadow-brand">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-ink font-semibold italic">Reservas Recientes</h2>
          <p className="text-sm text-ink-secondary mt-1">Últimas solicitudes recibidas</p>
        </div>
        <Link to="/admin/reservas" className="text-sm text-calipso hover:underline flex items-center gap-1 mt-1">
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>
      <div className="space-y-4">
        {recent.map(r => {
          const { label, cls } = statusConfig[r.status]
          const dateLabel = r.date === today() ? 'Hoy' : r.date
          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-calipso-50 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-calipso" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-ink truncate">{r.guest_name}</p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  {dateLabel} · {r.time} · {r.party_size} pers.
                </p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full flex-shrink-0 ${cls}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Live orders preview ───────────────────────────────────────────────────────

function elapsedMin(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function elapsedLabel(iso: string) {
  const m = elapsedMin(iso)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function urgencyColor(iso: string): { border: string; bg: string; badge: string } {
  const m = elapsedMin(iso)
  if (m > 40) return { border: '#E8593C', bg: 'rgba(232,89,60,0.04)', badge: 'bg-coral-light text-coral-dark' }
  if (m > 20) return { border: '#D97706', bg: 'rgba(217,119,6,0.04)',  badge: 'bg-amber-50 text-amber-700' }
  return       { border: '#29B5D0', bg: 'rgba(41,181,208,0.04)',        badge: 'bg-calipso-50 text-calipso' }
}

const ORDER_STATUS: Record<Order['status'], { label: string; dot: string }> = {
  open:       { label: 'Tomando pedido', dot: 'bg-ink/25' },
  in_kitchen: { label: 'En cocina',      dot: 'bg-amber-500' },
  ready:      { label: 'Listo',          dot: 'bg-[#3B6D11]' },
  paid:       { label: 'Cobrado',        dot: 'bg-ink/20' },
  cancelled:  { label: 'Cancelado',      dot: 'bg-coral' },
}

const ITEM_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  pending:    { icon: Clock,         cls: 'text-ink/35' },
  in_kitchen: { icon: ChefHat,      cls: 'text-amber-500' },
  ready:      { icon: CheckCircle2, cls: 'text-[#3B6D11]' },
  delivered:  { icon: Truck,        cls: 'text-ink/20' },
}

function OrderCard({ order }: { order: Order }) {
  const urg    = urgencyColor(order.created_at)
  const status = ORDER_STATUS[order.status]
  const items  = order.items ?? []
  const mins   = elapsedMin(order.created_at)

  return (
    <div
      className="flex-shrink-0 w-64 bg-white rounded-card shadow-brand flex flex-col overflow-hidden"
      style={{ borderTop: `3px solid ${urg.border}`, background: urg.bg }}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-calipso-100">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-2xl font-bold text-ink tabular-nums leading-none">
            Mesa {order.table?.number ?? '—'}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${status.dot === 'bg-amber-500' ? 'bg-amber-50 text-amber-700' : status.dot === 'bg-[#3B6D11]' ? 'bg-[#D4EDDA] text-[#3B6D11]' : 'bg-calipso-50 text-calipso'}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold tabular-nums ${mins > 40 ? 'text-coral' : mins > 20 ? 'text-amber-600' : 'text-ink-secondary'}`}>
            ⏱ {elapsedLabel(order.created_at)}
          </span>
          <span className="text-sm font-bold text-ink tabular-nums">
            ${order.total.toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-52">
        {items.length === 0 && (
          <p className="text-sm text-ink-secondary italic text-center py-4">Comanda vacía</p>
        )}
        {items.map(item => {
          const cfg  = ITEM_ICON[item.status] ?? ITEM_ICON.pending
          const Icon = cfg.icon
          const delivered = item.status === 'delivered'
          return (
            <div
              key={item.id}
              className={`flex items-start gap-2.5 ${delivered ? 'opacity-35' : ''}`}
            >
              <Icon size={14} className={`${cfg.cls} flex-shrink-0 mt-0.5`} />
              <span className={`text-sm leading-snug flex-1 min-w-0 ${delivered ? 'line-through text-ink-secondary' : 'text-ink'}`}>
                {item.menu_item?.name ?? '—'}
                <span className="font-bold text-ink-secondary"> ×{item.quantity}</span>
              </span>
              <span className="text-xs text-ink-secondary tabular-nums flex-shrink-0 pt-0.5">
                ${(item.unit_price * item.quantity).toLocaleString('es-CL')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer link */}
      <div className="px-4 py-2.5 border-t border-calipso-100 bg-white">
        <Link
          to="/admin/comandas"
          className="text-xs text-calipso hover:underline flex items-center gap-1 font-medium"
        >
          Abrir comanda <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  )
}

function LiveOrdersPreview({ orders, onRefresh, lastRefreshed }: {
  orders: Order[]
  onRefresh: () => void
  lastRefreshed: Date
}) {
  const active = orders.filter(o => o.status !== 'paid' && o.status !== 'cancelled')
  const inKitchen = active.filter(o => o.status === 'in_kitchen' || o.status === 'ready').length

  return (
    <div className="bg-white rounded-card shadow-brand overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-calipso-100">
        <div>
          <h2 className="font-display text-xl text-ink font-semibold italic">Comandas activas</h2>
          <p className="text-sm text-ink-secondary mt-0.5">
            {active.length} mesa{active.length !== 1 ? 's' : ''} en servicio
            {inKitchen > 0 && <span className="ml-2 text-amber-600 font-medium">· {inKitchen} en cocina</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/30">
            {lastRefreshed.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={onRefresh}
            className="p-1.5 text-ink-secondary hover:text-calipso transition-colors rounded-input hover:bg-calipso-50"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
          <Link
            to="/admin/comandas"
            className="flex items-center gap-1.5 text-sm text-calipso hover:underline font-medium"
          >
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Cards row */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-calipso-50 flex items-center justify-center mb-3">
            <UtensilsCrossed size={22} className="text-calipso" />
          </div>
          <p className="text-base font-semibold text-ink">Sin mesas activas</p>
          <p className="text-sm text-ink-secondary mt-1">Las comandas abiertas aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="p-4">
          {/* Urgency legend */}
          <div className="flex items-center gap-4 mb-3">
            {[
              { color: '#29B5D0', label: 'Normal (< 20 min)' },
              { color: '#D97706', label: 'Atención (20–40 min)' },
              { color: '#E8593C', label: 'Urgente (> 40 min)' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <Circle size={8} fill={color} stroke="none" />
                {label}
              </span>
            ))}
          </div>

          {/* Horizontal scrollable row */}
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {active
              .sort((a, b) => elapsedMin(b.created_at) - elapsedMin(a.created_at)) // más urgente primero
              .map(order => <OrderCard key={order.id} order={order} />)
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading,        setLoading]        = useState(true)
  const [reservations,   setReservations]   = useState<Reservation[]>([])
  const [inventory,      setInventory]      = useState<InventoryItem[]>([])
  const [orders,         setOrders]         = useState<Order[]>([])
  const [menuCount,      setMenuCount]      = useState(0)
  const [tableCount,     setTableCount]     = useState(0)
  const [lastRefreshed,  setLastRefreshed]  = useState(new Date())
  const ordersTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadOrders = async () => {
    const o = await getActiveOrders()
    setOrders(o)
    setLastRefreshed(new Date())
  }

  useEffect(() => {
    Promise.all([getAllMenuItems(), getTables(), getReservations(), getInventory(), getActiveOrders()])
      .then(([items, tables, resos, inv, activeOrders]) => {
        setMenuCount(items.filter(i => i.is_available).length)
        setTableCount(tables.filter(t => t.is_active).length)
        setReservations(resos)
        setInventory(inv)
        setOrders(activeOrders)
        setLastRefreshed(new Date())
      })
      .finally(() => setLoading(false))

    // Auto-refresh orders every 30s
    ordersTimerRef.current = setInterval(loadOrders, 30000)
    return () => { if (ordersTimerRef.current) clearInterval(ordersTimerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageLoader />

  const todayResos    = reservations.filter(r => r.date === today())
  const pendingCount  = reservations.filter(r => r.status === 'pending').length
  const thisWeek      = reservations.filter(r => r.date >= daysAgo(7) && r.date <= today() && r.status !== 'cancelled')
  const prevWeek      = reservations.filter(r => r.date >= daysAgo(14) && r.date < daysAgo(7) && r.status !== 'cancelled')
  const weekDelta     = thisWeek.length - prevWeek.length
  const weekGuests    = thisWeek.reduce((s, r) => s + r.party_size, 0)
  const estimRevenue  = weekGuests * AVG_TICKET
  const lowStock      = inventory.filter(i => stockStatus(i) !== 'ok').length

  const cards = [
    {
      icon: CalendarDays,
      label: 'Reservas hoy',
      value: todayResos.length,
      sub: `${todayResos.reduce((s, r) => s + r.party_size, 0)} comensales esperados`,
      accent: 'text-calipso',
      iconBg: 'bg-calipso-50',
      borderColor: '#29B5D0',
      trend: <Trend value={weekDelta} label="vs semana anterior" />,
    },
    {
      icon: AlertCircle,
      label: 'Por confirmar',
      value: pendingCount,
      sub: pendingCount > 0 ? 'reservas pendientes de confirmación' : 'Todo al día ✓',
      accent: pendingCount > 0 ? 'text-coral' : 'text-[#3B6D11]',
      iconBg: pendingCount > 0 ? 'bg-coral-light' : 'bg-[#D4EDDA]',
      borderColor: pendingCount > 0 ? '#E8593C' : '#3B6D11',
      trend: pendingCount > 0
        ? <span className="text-sm text-coral font-medium flex items-center gap-1"><ArrowRight size={13} /> Confirmar ahora</span>
        : <span className="text-sm text-[#3B6D11] font-medium">Sin pendientes</span>,
    },
    {
      icon: TrendingUp,
      label: 'Ingreso estimado',
      value: fmtCLP(estimRevenue),
      sub: 'esta semana (aprox.)',
      accent: 'text-[#BA7517]',
      iconBg: 'bg-arena-warm',
      borderColor: '#BA7517',
      trend: <Trend value={weekDelta} label="reservas activas" />,
    },
    {
      icon: Package,
      label: 'Alertas inventario',
      value: lowStock,
      sub: lowStock > 0 ? 'productos con stock bajo' : 'Inventario al día ✓',
      accent: lowStock > 0 ? 'text-amber-600' : 'text-[#3B6D11]',
      iconBg: lowStock > 0 ? 'bg-amber-50' : 'bg-[#D4EDDA]',
      borderColor: lowStock > 0 ? '#D97706' : '#3B6D11',
      trend: lowStock > 0
        ? <Link to="/admin/inventario" className="text-sm text-amber-600 hover:underline flex items-center gap-1">Ver inventario <ArrowRight size={13} /></Link>
        : undefined,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in font-body">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink font-bold italic">Dashboard</h1>
          <p className="text-sm text-ink-secondary mt-1 capitalize">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!import.meta.env.VITE_SUPABASE_URL && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide">
            Modo demo
          </span>
        )}
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value, sub, accent, iconBg, trend, borderColor }) => (
          <StatCard
            key={label}
            icon={Icon} label={label} value={value} sub={sub}
            accent={accent} iconBg={iconBg} trend={trend} borderColor={borderColor}
          />
        ))}
      </div>

      {/* ── Secondary stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Platos en carta', value: menuCount,       icon: UtensilsCrossed, link: '/admin/carta' },
          { label: 'Mesas activas',   value: tableCount,      icon: Table2,          link: '/admin/mesas' },
          { label: 'Semana actual',   value: thisWeek.length, icon: CalendarDays,    link: '/admin/reservas' },
          { label: 'Comensales sem.', value: weekGuests,      icon: Users,           link: '/admin/reservas' },
        ].map(({ label, value, icon: Icon, link }) => (
          <Link
            key={label}
            to={link}
            className="bg-white rounded-card px-4 py-4 shadow-brand hover:shadow-brand-md transition-shadow flex items-center gap-3 group"
          >
            <Icon size={18} className="text-calipso flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-ink tabular-nums leading-none">{value}</p>
              <p className="text-sm text-ink-secondary mt-1 truncate leading-snug">{label}</p>
            </div>
            <ChevronRight size={14} className="ml-auto text-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── Charts row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WeeklyChart reservations={reservations} />
        </div>
        <StatusBreakdown reservations={reservations} />
      </div>

      {/* ── Live orders ─────────────────────────────────────── */}
      <LiveOrdersPreview
        orders={orders}
        onRefresh={loadOrders}
        lastRefreshed={lastRefreshed}
      />

      {/* ── Bottom row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentReservations reservations={reservations} />
        {lowStock > 0 && <InventoryAlerts inventory={inventory} />}
      </div>
    </div>
  )
}
