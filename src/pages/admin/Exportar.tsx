import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  getAllOrders, getAllMenuItems,
  getInventory, getReservations, getCustomers,
} from '../../lib/api'
import type { Order, MenuItem, InventoryItem, Reservation, Customer } from '../../types'
import {
  Download, Layers, ShoppingBag, Package,
  UtensilsCrossed, CalendarDays, Users, RefreshCw, FileSpreadsheet,
} from 'lucide-react'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthAgoStr() {
  const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
}

const ORDER_STATUS: Record<string, string> = {
  open: 'Abierta', in_kitchen: 'En cocina', ready: 'Listo',
  paid: 'Cobrada', cancelled: 'Cancelada',
}
const PM_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia',
}
const RSVP_STATUS: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada',
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

// ── sheet builders ────────────────────────────────────────────────────────────

function buildVentasSheet(orders: Order[], dateFrom: string, dateTo: string): XLSX.WorkSheet {
  const rows = orders
    .filter(o =>
      (o.status === 'paid' || o.status === 'cancelled') &&
      (o.updated_at ?? '').slice(0, 10) >= dateFrom &&
      (o.updated_at ?? '').slice(0, 10) <= dateTo
    )
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    .map(o => ({
      'Fecha':          (o.updated_at ?? '').slice(0, 10),
      'Hora':           o.updated_at
                          ? new Date(o.updated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                          : '',
      'Mesa':           o.table?.number ?? '',
      'Sector':         o.table?.location ?? '',
      'Garzón':         o.waiter_name ?? '',
      'Estado':         ORDER_STATUS[o.status] ?? o.status,
      'Método de pago': PM_LABEL[o.payment_method ?? ''] ?? (o.payment_method ?? 'Sin registrar'),
      'N° de ítems':    (o.items ?? []).reduce((s, i) => s + i.quantity, 0),
      'Total (CLP)':    o.total,
      'Notas':          o.notes ?? '',
    }))
  const ws = XLSX.utils.json_to_sheet(rows)
  setColWidths(ws, [12, 8, 6, 12, 20, 12, 16, 10, 14, 30])
  return ws
}

function buildDetalleSheet(orders: Order[], dateFrom: string, dateTo: string): XLSX.WorkSheet {
  const rows: Record<string, unknown>[] = []
  orders
    .filter(o =>
      (o.status === 'paid' || o.status === 'cancelled') &&
      (o.updated_at ?? '').slice(0, 10) >= dateFrom &&
      (o.updated_at ?? '').slice(0, 10) <= dateTo
    )
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    .forEach(o => {
      ;(o.items ?? []).forEach(item => {
        rows.push({
          'Fecha':          (o.updated_at ?? '').slice(0, 10),
          'Mesa':           o.table?.number ?? '',
          'Garzón':         o.waiter_name ?? '',
          'Método de pago': PM_LABEL[o.payment_method ?? ''] ?? (o.payment_method ?? ''),
          'Plato':          item.menu_item?.name ?? item.menu_item_id,
          'Categoría':      item.menu_item?.category?.name ?? '',
          'Cantidad':       item.quantity,
          'Precio unit.':   item.unit_price,
          'Subtotal':       item.unit_price * item.quantity,
          'Nota del ítem':  item.notes ?? '',
        })
      })
    })
  const ws = XLSX.utils.json_to_sheet(rows)
  setColWidths(ws, [12, 6, 18, 16, 28, 14, 8, 13, 13, 24])
  return ws
}

function buildInventarioSheet(inventory: InventoryItem[]): XLSX.WorkSheet {
  const rows = inventory
    .slice()
    .sort((a, b) => (a.product_name ?? '').localeCompare(b.product_name ?? ''))
    .map(i => {
      const status =
        i.stock_quantity === 0 ? 'Sin stock' :
        i.stock_quantity < i.min_stock ? 'Bajo mínimo' : 'OK'
      return {
        'Producto':          i.product_name ?? i.menu_item?.name ?? `Ítem ${i.id}`,
        'Código de barras':  i.barcode ?? '',
        'Unidad':            i.unit,
        'Stock actual':      i.stock_quantity,
        'Stock mínimo':      i.min_stock,
        'Estado':            status,
        'Precio costo (CLP)':i.cost_price,
        'Última actualiz.':  (i.updated_at ?? '').slice(0, 10),
      }
    })
  const ws = XLSX.utils.json_to_sheet(rows)
  setColWidths(ws, [28, 16, 10, 12, 12, 12, 18, 14])
  return ws
}

function buildCartaSheet(items: MenuItem[]): XLSX.WorkSheet {
  const rows = items
    .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name))
    .map(m => ({
      'Categoría':    m.category?.name ?? '',
      'Nombre':       m.name,
      'Precio (CLP)': m.price,
      'Descripción':  m.description ?? '',
      'Disponible':   m.is_available ? 'Sí' : 'No',
      'Destacado':    m.is_featured ? 'Sí' : 'No',
      'Agotado hoy':  m.is_86d ? 'Sí' : 'No',
      'Alérgenos':    (m.allergens ?? []).join(', '),
      'Orden':        m.sort_order ?? '',
    }))
  const ws = XLSX.utils.json_to_sheet(rows)
  setColWidths(ws, [14, 28, 13, 40, 10, 10, 12, 22, 6])
  return ws
}

function buildReservasSheet(reservations: Reservation[], dateFrom: string, dateTo: string): XLSX.WorkSheet {
  const rows = reservations
    .filter(r => r.date >= dateFrom && r.date <= dateTo)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map(r => ({
      'Fecha':    r.date,
      'Hora':     r.time,
      'Nombre':   r.guest_name,
      'Email':    r.guest_email,
      'Teléfono': r.guest_phone,
      'Personas': r.party_size,
      'Mesa':     r.table?.number ?? '',
      'Estado':   RSVP_STATUS[r.status] ?? r.status,
      'Notas':    r.notes ?? '',
    }))
  const ws = XLSX.utils.json_to_sheet(rows)
  setColWidths(ws, [12, 7, 24, 28, 14, 8, 6, 12, 30])
  return ws
}

function buildClientesSheet(customers: Customer[]): XLSX.WorkSheet {
  const TAG_LABEL: Record<string, string> = {
    vip: 'VIP', frecuente: 'Frecuente', corporativo: 'Corporativo',
    nuevo: 'Nuevo', alergia: 'Alergia', cumpleanos: 'Cumpleaños',
  }
  const rows = customers.map(c => ({
    'Nombre':          c.name,
    'Email':           c.email ?? '',
    'Teléfono':        c.phone ?? '',
    'Cumpleaños':      c.birthday ?? '',
    'Etiquetas':       (c.tags ?? []).map(t => TAG_LABEL[t] ?? t).join(', '),
    'Visitas':         c.total_visits,
    'Gasto total (CLP)': c.total_spent,
    'Última visita':   c.last_visit ?? '',
    'Plato favorito':  c.favorite_dish?.name ?? '',
    'Notas':           c.notes ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  setColWidths(ws, [24, 28, 14, 12, 22, 7, 18, 12, 26, 30])
  return ws
}

// ── helpers: download ─────────────────────────────────────────────────────────

function download(wb: XLSX.WorkBook, name: string) {
  XLSX.writeFile(wb, name)
}

function makeWb(sheets: { ws: XLSX.WorkSheet; name: string }[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ ws, name }) => XLSX.utils.book_append_sheet(wb, ws, name))
  return wb
}

// ── Component ─────────────────────────────────────────────────────────────────

type LoadingKey = 'ventas' | 'detalle' | 'inventario' | 'carta' | 'reservas' | 'clientes' | 'todo' | null

const CARDS = [
  {
    key:  'ventas' as const,
    icon: ShoppingBag,
    title: 'Ventas',
    desc: 'Una fila por comanda: mesa, garzón, total, método de pago, fecha.',
    color: 'text-[#3B6D11]',
    bg:   'bg-[#D4EDDA]',
    usesDates: true,
  },
  {
    key:  'detalle' as const,
    icon: FileSpreadsheet,
    title: 'Detalle de ventas',
    desc: 'Una fila por ítem vendido con precio unitario y subtotal.',
    color: 'text-calipso',
    bg:   'bg-calipso-50',
    usesDates: true,
  },
  {
    key:  'inventario' as const,
    icon: Package,
    title: 'Inventario',
    desc: 'Estado actual del stock: cantidades, mínimos y costos.',
    color: 'text-amber-700',
    bg:   'bg-amber-50',
    usesDates: false,
  },
  {
    key:  'carta' as const,
    icon: UtensilsCrossed,
    title: 'Carta / Menú',
    desc: 'Todos los platos con precio, disponibilidad y alérgenos.',
    color: 'text-purple-700',
    bg:   'bg-purple-50',
    usesDates: false,
  },
  {
    key:  'reservas' as const,
    icon: CalendarDays,
    title: 'Reservas',
    desc: 'Historial de reservas con datos del cliente y estado.',
    color: 'text-coral',
    bg:   'bg-coral-light',
    usesDates: true,
  },
  {
    key:  'clientes' as const,
    icon: Users,
    title: 'Clientes',
    desc: 'Base de clientes: datos de contacto, visitas y gasto total.',
    color: 'text-ink',
    bg:   'bg-calipso-50',
    usesDates: false,
  },
] as const

export default function Exportar() {
  const [dateFrom, setDateFrom] = useState(monthAgoStr())
  const [dateTo,   setDateTo]   = useState(todayStr())
  const [loading,  setLoading]  = useState<LoadingKey>(null)

  // ── individual exports ────────────────────────────────────────────────────

  const exportVentas = async () => {
    setLoading('ventas')
    try {
      const orders = await getAllOrders()
      const wb = makeWb([{ ws: buildVentasSheet(orders, dateFrom, dateTo), name: 'Ventas' }])
      download(wb, `Calipso_Ventas_${dateFrom}_${dateTo}.xlsx`)
    } finally { setLoading(null) }
  }

  const exportDetalle = async () => {
    setLoading('detalle')
    try {
      const orders = await getAllOrders()
      const wb = makeWb([{ ws: buildDetalleSheet(orders, dateFrom, dateTo), name: 'Detalle ventas' }])
      download(wb, `Calipso_DetalleVentas_${dateFrom}_${dateTo}.xlsx`)
    } finally { setLoading(null) }
  }

  const exportInventario = async () => {
    setLoading('inventario')
    try {
      const inv = await getInventory()
      const wb = makeWb([{ ws: buildInventarioSheet(inv), name: 'Inventario' }])
      download(wb, `Calipso_Inventario_${todayStr()}.xlsx`)
    } finally { setLoading(null) }
  }

  const exportCarta = async () => {
    setLoading('carta')
    try {
      const items = await getAllMenuItems()
      const wb = makeWb([{ ws: buildCartaSheet(items), name: 'Carta' }])
      download(wb, `Calipso_Carta_${todayStr()}.xlsx`)
    } finally { setLoading(null) }
  }

  const exportReservas = async () => {
    setLoading('reservas')
    try {
      const resos = await getReservations()
      const wb = makeWb([{ ws: buildReservasSheet(resos, dateFrom, dateTo), name: 'Reservas' }])
      download(wb, `Calipso_Reservas_${dateFrom}_${dateTo}.xlsx`)
    } finally { setLoading(null) }
  }

  const exportClientes = async () => {
    setLoading('clientes')
    try {
      const customers = await getCustomers()
      const wb = makeWb([{ ws: buildClientesSheet(customers), name: 'Clientes' }])
      download(wb, `Calipso_Clientes_${todayStr()}.xlsx`)
    } finally { setLoading(null) }
  }

  const exportTodo = async () => {
    setLoading('todo')
    try {
      const [orders, items, inv, resos, customers] = await Promise.all([
        getAllOrders(), getAllMenuItems(), getInventory(), getReservations(), getCustomers(),
      ])
      const wb = makeWb([
        { ws: buildVentasSheet(orders, dateFrom, dateTo),   name: 'Ventas' },
        { ws: buildDetalleSheet(orders, dateFrom, dateTo),  name: 'Detalle ventas' },
        { ws: buildInventarioSheet(inv),                    name: 'Inventario' },
        { ws: buildCartaSheet(items),                       name: 'Carta' },
        { ws: buildReservasSheet(resos, dateFrom, dateTo),  name: 'Reservas' },
        { ws: buildClientesSheet(customers),                name: 'Clientes' },
      ])
      download(wb, `Calipso_Completo_${dateFrom}_${dateTo}.xlsx`)
    } finally { setLoading(null) }
  }

  const handlers: Record<string, () => Promise<void>> = {
    ventas:     exportVentas,
    detalle:    exportDetalle,
    inventario: exportInventario,
    carta:      exportCarta,
    reservas:   exportReservas,
    clientes:   exportClientes,
  }

  const isAnyLoading = loading !== null

  return (
    <div className="space-y-6 animate-fade-in font-body max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-ink font-bold italic">Exportar datos</h1>
        <p className="text-ink-secondary text-sm mt-1">
          Descarga los datos del restaurante en formato <strong>.xlsx</strong> compatible con Excel, Google Sheets y Numbers.
        </p>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-card shadow-brand px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-3">
          Rango de fechas — aplica a Ventas, Detalle y Reservas
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-secondary font-medium w-10">Desde</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-calipso-100 rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-secondary font-medium w-10">Hasta</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="border border-calipso-100 rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
          </div>
          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Hoy',     from: todayStr(),   to: todayStr() },
              { label: '7 días',  from: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0] })(), to: todayStr() },
              { label: '30 días', from: monthAgoStr(), to: todayStr() },
              { label: 'Este mes',
                from: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` })(),
                to: todayStr()
              },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                className={clsx(
                  'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                  dateFrom === p.from && dateTo === p.to
                    ? 'bg-calipso text-white border-calipso'
                    : 'border-calipso-100 text-ink-secondary hover:border-calipso hover:text-calipso'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map(card => {
          const Icon = card.icon
          const isLoading = loading === card.key
          return (
            <div
              key={card.key}
              className="bg-white rounded-card shadow-brand p-5 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={clsx('w-9 h-9 rounded-card flex items-center justify-center flex-shrink-0', card.bg)}>
                  <Icon size={17} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{card.title}</p>
                  <p className="text-xs text-ink-secondary mt-0.5 leading-snug">{card.desc}</p>
                  {card.usesDates && (
                    <p className="text-[10px] text-ink/40 mt-1">
                      {dateFrom} → {dateTo}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handlers[card.key]}
                disabled={isAnyLoading}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-input text-sm font-semibold transition-all border-2',
                  isLoading
                    ? 'border-calipso bg-calipso text-white'
                    : 'border-calipso-100 text-calipso hover:bg-calipso hover:text-white hover:border-calipso disabled:opacity-40'
                )}
              >
                {isLoading
                  ? <><RefreshCw size={14} className="animate-spin" /> Generando…</>
                  : <><Download size={14} /> Descargar .xlsx</>
                }
              </button>
            </div>
          )
        })}
      </div>

      {/* Export all */}
      <div className="bg-white rounded-card shadow-brand p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-card flex items-center justify-center flex-shrink-0 bg-ink">
            <Layers size={17} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">Exportar todo — archivo completo</p>
            <p className="text-xs text-ink-secondary mt-0.5">
              Un solo archivo <strong>.xlsx</strong> con 6 hojas: Ventas, Detalle, Inventario, Carta, Reservas y Clientes.
            </p>
            <p className="text-[10px] text-ink/40 mt-0.5">
              Fechas: {dateFrom} → {dateTo}
            </p>
          </div>
        </div>
        <button
          onClick={exportTodo}
          disabled={isAnyLoading}
          className={clsx(
            'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-input text-base font-bold transition-all',
            loading === 'todo'
              ? 'bg-ink text-white'
              : 'bg-ink text-white hover:bg-ink/80 disabled:opacity-40'
          )}
        >
          {loading === 'todo'
            ? <><RefreshCw size={16} className="animate-spin" /> Generando archivo completo…</>
            : <><Download size={16} /> Descargar archivo completo (.xlsx)</>
          }
        </button>
      </div>

    </div>
  )
}
