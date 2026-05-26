import { useState, useEffect, useMemo } from 'react'
import { getAllOrders, getAllMenuItems, getInventory } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import type { Order, MenuItem, InventoryItem } from '../../types'
import {
  TrendingUp, TrendingDown, Minus, Download, Calendar,
  UtensilsCrossed, Users, CreditCard, BarChart2,
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtCLP(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

function startOf(period: 'today' | '7d' | '30d'): Date {
  const d = new Date()
  if (period === 'today') { d.setHours(0, 0, 0, 0); return d }
  if (period === '7d')  { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d }
  d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d
}

function dateKey(iso: string) { return iso.split('T')[0] }

type Period = 'today' | '7d' | '30d'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  '7d':  'Últimos 7 días',
  '30d': 'Últimos 30 días',
}

// ── Trend arrow ───────────────────────────────────────────────────────────────

function Trend({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="text-xs text-ink-secondary flex items-center gap-0.5"><Minus size={11} /> Sin cambio</span>
  const up = pct > 0
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? 'text-[#3B6D11]' : 'text-coral'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct}%{suffix}
    </span>
  )
}

// ── CSS bar chart (7 or 30 days) ──────────────────────────────────────────────

function RevenueChart({ orders, period }: { orders: Order[]; period: Period }) {
  const days = period === '30d' ? 30 : 7
  const data: { label: string; date: string; revenue: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => o.status === 'paid' && dateKey(o.created_at) === key)
    data.push({
      label: period === '30d'
        ? d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }).replace(' ', '\n')
        : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()],
      date: key,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    })
  }

  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  const todayKey = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div className={`flex items-end gap-${period === '30d' ? '0.5' : '1.5'} h-32`}>
        {data.map((d, i) => {
          const pct = (d.revenue / maxRev) * 100
          const isToday = d.date === todayKey
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              {/* Tooltip */}
              {d.revenue > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {fmtCLP(d.revenue)}
                </div>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max(pct, d.revenue > 0 ? 3 : 1)}%`,
                  background: isToday ? '#29B5D0' : 'rgba(41,181,208,0.3)',
                  minHeight: d.revenue > 0 ? '4px' : '2px',
                }}
              />
              <span className={`text-[9px] leading-tight text-center ${isToday ? 'text-calipso font-semibold' : 'text-ink-secondary'} ${period === '30d' ? 'hidden sm:block' : ''}`}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Top dishes table ──────────────────────────────────────────────────────────

function TopDishes({
  orders, menuItems, inventory,
}: {
  orders: Order[]
  menuItems: MenuItem[]
  inventory: InventoryItem[]
}) {
  type Row = { menuItem: MenuItem; qty: number; revenue: number; cost: number; margin: number }
  const rows: Row[] = []

  menuItems.forEach(item => {
    const inv = inventory.find(i => i.menu_item_id === item.id)
    let qty = 0
    let revenue = 0

    orders.forEach(o => {
      if (o.status !== 'paid' || !o.items) return
      o.items.filter(i => i.menu_item_id === item.id).forEach(i => {
        qty += i.quantity
        revenue += i.unit_price * i.quantity
      })
    })

    if (qty === 0) return
    const cost = inv ? inv.cost_price * qty : 0
    const margin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0

    rows.push({ menuItem: item, qty, revenue, cost, margin })
  })

  rows.sort((a, b) => b.revenue - a.revenue)

  if (rows.length === 0) {
    return <p className="text-ink-secondary text-sm text-center py-6">Sin datos de ventas en este período</p>
  }

  const maxRevenue = rows[0].revenue

  return (
    <div className="space-y-2">
      {rows.slice(0, 8).map((row, i) => (
        <div key={row.menuItem.id} className="flex items-center gap-3">
          <span className="text-xs text-ink-secondary tabular-nums w-5 text-right flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-ink truncate">{row.menuItem.name}</span>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-xs text-ink-secondary tabular-nums">{row.qty} uds.</span>
                <span className="text-sm font-semibold text-ink tabular-nums">{fmtCLP(row.revenue)}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  row.margin >= 60 ? 'bg-[#D4EDDA] text-[#3B6D11]' :
                  row.margin >= 40 ? 'bg-amber-50 text-amber-700' :
                  'bg-coral-light text-coral-dark'
                }`}>
                  {row.margin}%
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-calipso-50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-calipso"
                style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Category breakdown ────────────────────────────────────────────────────────

function CategoryBreakdown({ orders, menuItems }: { orders: Order[]; menuItems: MenuItem[] }) {
  type CatRow = { name: string; revenue: number; qty: number }
  const catMap: Record<string, CatRow> = {}

  orders.filter(o => o.status === 'paid' && o.items).forEach(o => {
    o.items!.forEach(i => {
      const item = menuItems.find(m => m.id === i.menu_item_id)
      if (!item) return
      const catName = item.category?.name ?? 'Sin categoría'
      if (!catMap[catName]) catMap[catName] = { name: catName, revenue: 0, qty: 0 }
      catMap[catName].revenue += i.unit_price * i.quantity
      catMap[catName].qty += i.quantity
    })
  })

  const rows = Object.values(catMap).sort((a, b) => b.revenue - a.revenue)
  const total = rows.reduce((s, r) => s + r.revenue, 0) || 1

  if (rows.length === 0) return null

  const colors = ['#29B5D0', '#3B6D11', '#BA7517', '#E8593C', '#9B59B6', '#2ECC71']

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.name}>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-sm text-ink">{row.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-secondary">{Math.round((row.revenue / total) * 100)}%</span>
              <span className="text-sm font-semibold text-ink tabular-nums">{fmtCLP(row.revenue)}</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-calipso-50 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.revenue / total) * 100}%`, background: colors[i % colors.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(orders: Order[], period: Period) {
  const rows = [['Fecha', 'Mesa', 'Estado', 'Total']]
  orders
    .filter(o => o.status === 'paid')
    .forEach(o => {
      rows.push([
        new Date(o.created_at).toLocaleDateString('es-CL'),
        String(o.table?.number ?? o.table_id),
        o.status,
        String(o.total),
      ])
    })
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calipso-ventas-${period}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('7d')

  useEffect(() => {
    Promise.all([getAllOrders(), getAllMenuItems(), getInventory()])
      .then(([orders, items, inv]) => {
        setAllOrders(orders)
        setMenuItems(items)
        setInventory(inv)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = useMemo(() => {
    const start = startOf(period)
    return allOrders.filter(o => new Date(o.created_at) >= start)
  }, [allOrders, period])

  const prevOrders = useMemo(() => {
    const periodMs = period === 'today' ? 86400000 : period === '7d' ? 7 * 86400000 : 30 * 86400000
    const start = new Date(Date.now() - periodMs * 2)
    const end   = new Date(Date.now() - periodMs)
    return allOrders.filter(o => {
      const d = new Date(o.created_at)
      return d >= start && d < end && o.status === 'paid'
    })
  }, [allOrders, period])

  if (loading) return <PageLoader />

  const paidOrders = filteredOrders.filter(o => o.status === 'paid')
  const revenue    = paidOrders.reduce((s, o) => s + o.total, 0)
  const prevRev    = prevOrders.reduce((s, o) => s + o.total, 0)
  const avgTicket  = paidOrders.length > 0 ? revenue / paidOrders.length : 0
  const prevAvg    = prevOrders.length > 0 ? prevRev / prevOrders.length : 0

  // Total covers from orders (estimate 3 avg per order if no items)
  const covers = paidOrders.reduce((s, o) => {
    if (o.items && o.items.length > 0) {
      return s + o.items.reduce((si, i) => si + i.quantity, 0)
    }
    return s + 3
  }, 0)

  const kpis = [
    {
      icon: CreditCard, label: 'Ingresos',     value: fmtCLP(revenue),
      trend: <Trend current={revenue} previous={prevRev} />,
      accent: 'bg-calipso-50 text-calipso',
    },
    {
      icon: BarChart2,  label: 'Comandas',     value: paidOrders.length,
      trend: <Trend current={paidOrders.length} previous={prevOrders.length} />,
      accent: 'bg-arena-warm text-[#BA7517]',
    },
    {
      icon: Users,      label: 'Cubiertos est.', value: covers,
      trend: null,
      accent: 'bg-[#D4EDDA] text-[#3B6D11]',
    },
    {
      icon: TrendingUp, label: 'Ticket prom.',  value: fmtCLP(avgTicket),
      trend: <Trend current={avgTicket} previous={prevAvg} />,
      accent: 'bg-coral-light text-coral',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink font-bold italic">Reportes</h1>
          <p className="text-ink-secondary text-sm mt-0.5">Análisis financiero y de ventas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex p-1 bg-calipso-50 rounded-card gap-1">
            {(['today', '7d', '30d'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-input text-sm font-medium transition-all duration-150 ${
                  period === p ? 'bg-white text-ink shadow-brand' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCSV(filteredOrders, period)}
            className="flex items-center gap-1.5 border border-calipso text-calipso text-xs font-semibold px-3 py-2 rounded-input hover:bg-calipso hover:text-white transition-colors"
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, trend, accent }) => (
          <div key={label} className="bg-white rounded-card p-5 shadow-brand">
            <div className={`inline-flex p-2.5 rounded-input mb-3 ${accent}`}>
              <Icon size={17} />
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums">{value}</p>
            <p className="text-sm font-medium text-ink mt-1">{label}</p>
            <div className="mt-1">{trend}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {period !== 'today' && (
        <div className="bg-white rounded-card p-5 shadow-brand">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-calipso" />
            <h2 className="font-display text-base font-semibold italic text-ink">
              Ingresos — {PERIOD_LABELS[period]}
            </h2>
            <span className="text-xs text-ink-secondary ml-auto">{fmtCLP(revenue)} total</span>
          </div>
          <RevenueChart orders={allOrders} period={period} />
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top dishes */}
        <div className="bg-white rounded-card p-5 shadow-brand">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed size={15} className="text-calipso" />
            <h2 className="font-display text-base font-semibold italic text-ink">Platos más vendidos</h2>
            <span className="text-[10px] text-ink-secondary ml-auto">% = margen bruto</span>
          </div>
          <TopDishes orders={filteredOrders} menuItems={menuItems} inventory={inventory} />
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-card p-5 shadow-brand">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-calipso" />
            <h2 className="font-display text-base font-semibold italic text-ink">Ingresos por categoría</h2>
          </div>
          <CategoryBreakdown orders={filteredOrders} menuItems={menuItems} />
          {Object.keys({}).length === 0 && paidOrders.length === 0 && (
            <p className="text-ink-secondary text-sm text-center py-6">Sin datos en este período</p>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-secondary text-center">
        Los ingresos incluyen únicamente comandas con estado "cobrado".
        Ticket promedio y cubiertos son estimaciones basadas en el historial de comandas.
      </p>
    </div>
  )
}
