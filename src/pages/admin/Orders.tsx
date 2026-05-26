import { useState, useEffect, useCallback } from 'react'
import {
  getActiveOrders, getTables, getAllMenuItems,
  createOrder, addOrderItem, removeOrderItem,
  sendOrderToKitchen, updateOrderItemStatus, closeOrder,
} from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import type { Order, OrderItem, Table, MenuItem } from '../../types'
import {
  UtensilsCrossed, Plus, Send, CreditCard, X, Search,
  Clock, ChefHat, CheckCircle2, Truck, AlertCircle,
  RefreshCw, ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtCLP(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

function elapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function orderUrgency(iso: string): 'normal' | 'warn' | 'urgent' {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins > 45) return 'urgent'
  if (mins > 25) return 'warn'
  return 'normal'
}

const ORDER_STATUS_CFG = {
  open:       { label: 'Tomando pedido', color: 'text-ink-secondary',  bg: 'bg-calipso-50',   dot: 'bg-ink/30' },
  in_kitchen: { label: 'En cocina',      color: 'text-amber-700',      bg: 'bg-amber-50',     dot: 'bg-amber-500' },
  ready:      { label: 'Listo',          color: 'text-[#3B6D11]',      bg: 'bg-[#D4EDDA]',    dot: 'bg-[#3B6D11]' },
  paid:       { label: 'Cobrado',        color: 'text-ink-secondary',  bg: 'bg-calipso-50',   dot: 'bg-ink/20' },
  cancelled:  { label: 'Cancelado',      color: 'text-coral',          bg: 'bg-coral-light',  dot: 'bg-coral' },
} as const

const ITEM_STATUS_CFG = {
  pending:    { label: 'Pendiente',  icon: Clock,         cls: 'text-ink-secondary' },
  in_kitchen: { label: 'En cocina', icon: ChefHat,       cls: 'text-amber-600' },
  ready:      { label: 'Listo',     icon: CheckCircle2,  cls: 'text-[#3B6D11]' },
  delivered:  { label: 'Entregado', icon: Truck,         cls: 'text-ink/30' },
} as const

// ── Table card (floor plan) ───────────────────────────────────────────────────

function TableCard({
  table, order, selected, onClick,
}: {
  table: Table; order?: Order; selected: boolean; onClick: () => void
}) {
  const urgent = order ? orderUrgency(order.created_at) : 'normal'
  const statusCfg = order ? ORDER_STATUS_CFG[order.status] : null

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-full text-left rounded-card border-2 p-3 transition-all duration-150',
        selected
          ? 'border-calipso bg-calipso-50 shadow-brand-md'
          : 'border-transparent bg-white shadow-brand hover:border-calipso/40',
        !table.is_active && 'opacity-40 pointer-events-none',
      )}
    >
      {/* Table number */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-lg font-bold text-ink tabular-nums">#{table.number}</span>
        {order && (
          <span className={clsx(
            'w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse',
            urgent === 'urgent' ? 'bg-coral' : urgent === 'warn' ? 'bg-amber-400' : statusCfg?.dot
          )} />
        )}
        {!order && <span className="w-2 h-2 rounded-full bg-[#3B6D11]/40" />}
      </div>

      {/* Capacity + location */}
      <p className="text-[10px] text-ink-secondary uppercase tracking-wide mb-1.5">
        {table.capacity} pers · {table.location}
      </p>

      {/* Order status */}
      {order ? (
        <div>
          <span className={clsx('text-[10px] font-semibold', statusCfg?.color)}>
            {statusCfg?.label}
          </span>
          <p className="text-[10px] text-ink-secondary mt-0.5">
            {elapsed(order.created_at)} · {fmtCLP(order.total)}
          </p>
        </div>
      ) : (
        <span className="text-[10px] text-[#3B6D11] font-medium">Libre</span>
      )}
    </button>
  )
}

// ── Add item modal ────────────────────────────────────────────────────────────

function AddItemModal({
  items, onAdd, onClose,
}: {
  items: MenuItem[]
  onAdd: (itemId: string, qty: number, notes: string) => Promise<void>
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  const filtered = items.filter(i =>
    i.is_available && (
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.name.toLowerCase().includes(search.toLowerCase())
    )
  )

  const totalSelected = Object.values(pending).reduce((a, b) => a + b, 0)

  const handleAdd = async () => {
    setSaving(true)
    try {
      for (const [id, qty] of Object.entries(pending)) {
        if (qty > 0) await onAdd(id, qty, '')
      }
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-card shadow-brand-lg w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-calipso-100">
          <UtensilsCrossed size={16} className="text-calipso" />
          <span className="font-display font-semibold text-ink italic">Agregar platos</span>
          <button onClick={onClose} className="ml-auto text-ink-secondary hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-calipso-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar plato o categoría…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-calipso-100 rounded-input focus:outline-none focus:ring-2 focus:ring-calipso"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(item => {
            const qty = pending[item.id] ?? 0
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-calipso-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                  <p className="text-xs text-ink-secondary">{fmtCLP(item.price)}</p>
                </div>
                {/* Qty stepper */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setPending(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] ?? 0) - 1) }))}
                    className="w-6 h-6 rounded-full border border-calipso/30 text-calipso text-sm font-bold flex items-center justify-center hover:bg-calipso hover:text-white transition-colors"
                  >−</button>
                  <span className="w-5 text-center text-sm tabular-nums font-semibold text-ink">{qty}</span>
                  <button
                    onClick={() => setPending(p => ({ ...p, [item.id]: (p[item.id] ?? 0) + 1 }))}
                    className="w-6 h-6 rounded-full bg-calipso text-white text-sm font-bold flex items-center justify-center hover:bg-calipso-700 transition-colors"
                  >+</button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-ink-secondary text-sm py-8">Sin resultados</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-calipso-100">
          <button
            onClick={handleAdd}
            disabled={totalSelected === 0 || saving}
            className="w-full bg-calipso disabled:bg-calipso/40 text-white font-semibold py-2.5 rounded-input text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Agregar {totalSelected > 0 ? `${totalSelected} ítem${totalSelected !== 1 ? 's' : ''}` : 'a la comanda'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Order detail panel ────────────────────────────────────────────────────────

function OrderPanel({
  table, order, allItems, onRefresh,
}: {
  table: Table; order?: Order; allItems: MenuItem[]; onRefresh: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true); setError(null)
    try { await fn(); onRefresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }

  const handleCreateOrder = () => wrap(async () => { await createOrder(table.id) })

  const handleAddItem = async (itemId: string, qty: number, notes: string) => {
    if (!order) return
    await addOrderItem(order.id, itemId, qty, notes)
    onRefresh()
  }

  const handleRemove = (itemId: string) => wrap(() => removeOrderItem(itemId))

  const handleSendKitchen = () => wrap(() => sendOrderToKitchen(order!.id))

  const handleItemStatus = (itemId: string, status: OrderItem['status']) =>
    wrap(() => updateOrderItemStatus(itemId, status))

  const handleClose = () => wrap(() => closeOrder(order!.id))

  // No order → empty state
  if (!order) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-calipso-50 flex items-center justify-center">
          <UtensilsCrossed size={28} className="text-calipso" />
        </div>
        <div>
          <p className="font-display italic text-lg text-ink">Mesa {table.number} — Libre</p>
          <p className="text-sm text-ink-secondary mt-1">{table.capacity} personas · {table.location}</p>
        </div>
        <button
          onClick={handleCreateOrder}
          disabled={loading}
          className="flex items-center gap-2 bg-calipso text-white px-5 py-2.5 rounded-input text-sm font-semibold hover:bg-calipso-700 transition-colors"
        >
          <Plus size={15} /> Nueva comanda
        </button>
      </div>
    )
  }

  const items = order.items ?? []
  const groups: OrderItem['status'][] = ['pending', 'in_kitchen', 'ready', 'delivered']
  const hasPending = items.some(i => i.status === 'pending')

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-calipso-100 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-ink text-lg italic">Mesa {table.number}</h2>
            <span className={clsx(
              'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
              ORDER_STATUS_CFG[order.status].bg, ORDER_STATUS_CFG[order.status].color
            )}>
              {ORDER_STATUS_CFG[order.status].label}
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            Abierta hace {elapsed(order.created_at)}
            {order.notes && ` · ${order.notes}`}
          </p>
        </div>
        <Link
          to="/admin/cocina"
          target="_blank"
          className="flex items-center gap-1 text-xs text-calipso hover:underline flex-shrink-0"
        >
          Ver cocina <ExternalLink size={11} />
        </Link>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-coral-light text-coral text-xs px-3 py-2 rounded-input">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Items grouped by status */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {groups.map(status => {
          const groupItems = items.filter(i => i.status === status)
          if (groupItems.length === 0) return null
          const cfg = ITEM_STATUS_CFG[status]
          const Icon = cfg.icon
          return (
            <div key={status}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={12} className={cfg.cls} />
                <span className={clsx('text-[10px] font-semibold uppercase tracking-wider', cfg.cls)}>
                  {cfg.label}
                </span>
              </div>
              <div className="space-y-1.5">
                {groupItems.map(item => (
                  <div
                    key={item.id}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-input transition-colors',
                      status === 'delivered' ? 'opacity-50' : 'bg-white border border-calipso-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {item.menu_item?.name ?? item.menu_item_id}
                        <span className="text-ink-secondary font-normal"> ×{item.quantity}</span>
                      </p>
                      {item.notes && <p className="text-[10px] text-ink-secondary italic">{item.notes}</p>}
                    </div>
                    <span className="text-sm text-ink-secondary tabular-nums flex-shrink-0">
                      {fmtCLP(item.unit_price * item.quantity)}
                    </span>

                    {/* Quick actions */}
                    {status === 'pending' && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-ink-secondary hover:text-coral transition-colors flex-shrink-0"
                        title="Quitar"
                      >
                        <X size={13} />
                      </button>
                    )}
                    {status === 'ready' && (
                      <button
                        onClick={() => handleItemStatus(item.id, 'delivered')}
                        className="text-[11px] font-semibold text-[#3B6D11] hover:bg-[#D4EDDA] px-2 py-0.5 rounded transition-colors flex-shrink-0"
                      >
                        Entregar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <p className="text-center text-ink-secondary text-sm py-8">Comanda vacía — agrega platos</p>
        )}
      </div>

      {/* Total */}
      <div className="px-4 py-3 border-t border-calipso-100 bg-calipso-50">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="text-xl font-bold text-ink tabular-nums">{fmtCLP(order.total)}</span>
        </div>
        <div className="flex gap-2">
          {/* Add item */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 border border-calipso text-calipso text-xs font-semibold px-3 py-2 rounded-input hover:bg-calipso hover:text-white transition-colors"
          >
            <Plus size={13} /> Agregar
          </button>

          {/* Send to kitchen */}
          {hasPending && (
            <button
              onClick={handleSendKitchen}
              disabled={loading}
              className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-input hover:bg-amber-600 transition-colors disabled:opacity-50 flex-1 justify-center"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              Enviar a cocina
            </button>
          )}

          {/* Close / pay */}
          {!hasPending && items.length > 0 && (
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#3B6D11] text-white text-xs font-semibold px-3 py-2 rounded-input hover:bg-[#2D5509] transition-colors disabled:opacity-50 flex-1 justify-center"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <CreditCard size={13} />}
              Cerrar y cobrar
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <AddItemModal
          items={allItems}
          onAdd={handleAddItem}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const LOCATIONS: Table['location'][] = ['terraza', 'interior', 'barra']
const LOCATION_LABELS = { terraza: 'Terraza', interior: 'Interior', barra: 'Barra' }

export default function Orders() {
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [t, o, m] = await Promise.all([getTables(), getActiveOrders(), getAllMenuItems()])
    setTables(t)
    setOrders(o)
    setAllItems(m)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-select first occupied table
  useEffect(() => {
    if (!selectedTableId && orders.length > 0) {
      setSelectedTableId(orders[0].table_id)
    }
  }, [orders, selectedTableId])

  if (loading) return <PageLoader />

  const orderByTable = Object.fromEntries(orders.map(o => [o.table_id, o]))
  const selectedTable = tables.find(t => t.id === selectedTableId)
  const selectedOrder = selectedTableId ? orderByTable[selectedTableId] : undefined

  const activeTables = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)

  return (
    <div className="flex flex-col h-full animate-fade-in font-body" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-4 flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-ink font-bold italic">Comandas</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            {activeTables} mesa{activeTables !== 1 ? 's' : ''} activa{activeTables !== 1 ? 's' : ''} · {fmtCLP(totalRevenue)} en curso
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/cocina"
            target="_blank"
            className="flex items-center gap-1.5 border border-calipso text-calipso text-xs font-semibold px-3 py-2 rounded-input hover:bg-calipso hover:text-white transition-colors"
          >
            <ChefHat size={13} /> Panel Cocina
          </Link>
          <button onClick={load} className="text-xs text-ink-secondary hover:text-calipso">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: floor plan */}
        <div className="w-56 flex-shrink-0 overflow-y-auto space-y-4">
          {LOCATIONS.map(loc => {
            const locTables = tables.filter(t => t.location === loc)
            if (locTables.length === 0) return null
            return (
              <div key={loc}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-secondary mb-2 px-0.5">
                  {LOCATION_LABELS[loc]}
                </p>
                <div className="space-y-2">
                  {locTables.map(t => (
                    <TableCard
                      key={t.id}
                      table={t}
                      order={orderByTable[t.id]}
                      selected={selectedTableId === t.id}
                      onClick={() => setSelectedTableId(t.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: order detail */}
        <div className="flex-1 bg-white rounded-card shadow-brand overflow-hidden flex flex-col min-h-0">
          {selectedTable ? (
            <OrderPanel
              table={selectedTable}
              order={selectedOrder}
              allItems={allItems}
              onRefresh={load}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <UtensilsCrossed size={40} className="text-calipso-200 mb-4" />
              <p className="font-display italic text-lg text-ink">Selecciona una mesa</p>
              <p className="text-sm text-ink-secondary mt-1">Haz clic en cualquier mesa del plano</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
