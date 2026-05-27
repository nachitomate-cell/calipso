import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getActiveOrders, getAllOrders, getTables, getAllMenuItems,
  createOrder, addOrderItem, removeOrderItem,
  sendOrderToKitchen, updateOrderItemStatus, closeOrder,
  updateOrderStatus, updateOrderItemQty, updateOrderNotes,
} from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import type { Order, OrderItem, Table, MenuItem } from '../../types'
import {
  UtensilsCrossed, Plus, Send, CreditCard, X, Search,
  Clock, ChefHat, CheckCircle2, Truck, AlertCircle,
  RefreshCw, ExternalLink, Pencil, Ban, History,
  TableProperties, Banknote, Smartphone, Receipt, ArrowRight,
  ChevronDown, ChevronUp, Minus, BarChart2, TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

// ── constants ─────────────────────────────────────────────────────────────────

function fmtCLP(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

function elapsedMin(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function elapsed(iso: string) {
  const m = elapsedMin(iso)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

function urgency(iso: string): 'ok' | 'warn' | 'urgent' {
  const m = elapsedMin(iso)
  if (m > 40) return 'urgent'
  if (m > 20) return 'warn'
  return 'ok'
}

function todayStr() { return new Date().toISOString().split('T')[0] }

const STATUS_CFG = {
  open:       { label: 'Tomando pedido', dot: 'bg-calipso',    text: 'text-calipso',    badge: 'bg-calipso-50 text-calipso' },
  in_kitchen: { label: 'En cocina',      dot: 'bg-amber-500',  text: 'text-amber-600',  badge: 'bg-amber-50 text-amber-700' },
  ready:      { label: 'Listo',          dot: 'bg-[#3B6D11]',  text: 'text-[#3B6D11]', badge: 'bg-[#D4EDDA] text-[#3B6D11]' },
  paid:       { label: 'Cobrado',        dot: 'bg-ink/20',     text: 'text-ink-secondary', badge: 'bg-calipso-50 text-ink-secondary' },
  cancelled:  { label: 'Cancelado',      dot: 'bg-coral',      text: 'text-coral',      badge: 'bg-coral-light text-coral-dark' },
} as const

const ITEM_CFG = {
  pending:    { Icon: Clock,        cls: 'text-ink/35',    label: 'Pendiente'  },
  in_kitchen: { Icon: ChefHat,     cls: 'text-amber-500', label: 'En cocina'  },
  ready:      { Icon: CheckCircle2,cls: 'text-[#3B6D11]', label: 'Listo'      },
  delivered:  { Icon: Truck,       cls: 'text-ink/20',    label: 'Entregado'  },
} as const

const LOCATIONS: Table['location'][] = ['terraza', 'interior', 'barra']
const LOC_LABEL = { terraza: 'Terraza', interior: 'Interior', barra: 'Barra' }

const PAYMENT_METHODS = [
  { id: 'efectivo',     label: 'Efectivo',      Icon: Banknote },
  { id: 'debito',       label: 'Débito',        Icon: CreditCard },
  { id: 'credito',      label: 'Crédito',       Icon: CreditCard },
  { id: 'transferencia',label: 'Transferencia', Icon: Smartphone },
] as const

// ── Kitchen ticket ────────────────────────────────────────────────────────────

function buildTicketHTML(order: Order, table: Table, pendingItems: OrderItem[]): string {
  const now     = new Date()
  const hora    = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  const fecha   = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const loc     = LOC_LABEL[table.location] ?? table.location

  const itemsHTML = pendingItems.map(item => `
    <div class="item">
      <div class="item-row">
        <span class="qty">${item.quantity}</span>
        <span class="name">${item.menu_item?.name ?? item.menu_item_id}</span>
      </div>
      ${item.notes ? `<div class="note">➔ ${item.notes}</div>` : ''}
    </div>
  `).join('')

  const noteHTML = order.notes
    ? `<div class="sep-dash"></div><div class="order-note">📌 ${order.notes}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comanda Mesa ${table.number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 80mm;
    padding: 4mm 4mm 10mm;
    color: #000;
    font-size: 13px;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: bold; }

  /* Header */
  .brand   { font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
  .sub     { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-top: 1px; }

  /* Separadores */
  .sep-solid { border-top: 2px solid #000; margin: 5px 0; }
  .sep-dash  { border-top: 1px dashed #000; margin: 5px 0; }

  /* Meta */
  .meta      { display: flex; justify-content: space-between; align-items: flex-end; padding: 4px 0; }
  .label     { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
  .mesa-num  { font-size: 36px; font-weight: 900; line-height: 1; }
  .loc       { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .time-big  { font-size: 24px; font-weight: 900; line-height: 1; }

  /* Título cocina */
  .cocina-title {
    font-size: 11px; font-weight: bold; letter-spacing: 3px;
    text-transform: uppercase; text-align: center;
    background: #000; color: #fff;
    padding: 3px 0; margin: 4px 0;
  }

  /* Items */
  .item      { margin: 6px 0; }
  .item-row  { display: flex; align-items: baseline; gap: 6px; }
  .qty       { font-size: 20px; font-weight: 900; min-width: 28px; flex-shrink: 0; line-height: 1.1; }
  .name      { font-size: 15px; font-weight: bold; flex: 1; line-height: 1.2; }
  .note      { padding-left: 34px; font-size: 11px; font-style: italic; margin-top: 1px; }

  /* Order note */
  .order-note { font-size: 12px; font-style: italic; padding: 3px 0; }

  /* Footer */
  .footer    { margin-top: 8px; font-size: 9px; color: #888; text-align: center; }

  @media print {
    body  { width: 80mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

<div class="center">
  <div class="brand">Calipso</div>
  <div class="sub">Cocina de Mar &mdash; Concón</div>
</div>

<div class="sep-solid"></div>

<div class="meta">
  <div>
    <div class="label">Mesa</div>
    <div class="mesa-num">${table.number}</div>
    <div class="loc">${loc}</div>
  </div>
  <div class="right">
    <div class="label">${fecha}</div>
    <div class="time-big">${hora}</div>
  </div>
</div>

<div class="cocina-title">— COCINA —</div>

${itemsHTML}

${noteHTML}

<div class="sep-solid"></div>
<div class="footer">Calipso Concón &bull; Sistema interno</div>

<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 800);
  };
</script>
</body>
</html>`
}

// ── TableCard ─────────────────────────────────────────────────────────────────

function TableCard({ table, order, selected, onClick }: {
  table: Table; order?: Order; selected: boolean; onClick: () => void
}) {
  const urg = order ? urgency(order.created_at) : 'ok'
  const borderColor = !order ? '#3B6D11'
    : urg === 'urgent' ? '#E8593C'
    : urg === 'warn'   ? '#D97706'
    : '#29B5D0'

  const items = order?.items ?? []
  const readyCount   = items.filter(i => i.status === 'ready').length
  const pendingCount = items.filter(i => i.status === 'pending').length
  const inKitchen    = items.filter(i => i.status === 'in_kitchen').length

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-full text-left rounded-card border-2 p-3 transition-all duration-150 text-sm',
        selected
          ? 'border-calipso bg-calipso-50 shadow-brand-md'
          : 'border-transparent bg-white shadow-brand hover:border-calipso/40',
        !table.is_active && 'opacity-40 pointer-events-none',
      )}
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      {/* Number + dot */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl font-bold text-ink tabular-nums">#{table.number}</span>
        <span className={clsx(
          'w-2.5 h-2.5 rounded-full flex-shrink-0',
          !order ? 'bg-[#3B6D11]/50'
            : urg === 'urgent' ? 'bg-coral animate-pulse'
            : urg === 'warn'   ? 'bg-amber-400'
            : order ? STATUS_CFG[order.status].dot
            : 'bg-ink/20'
        )} />
      </div>

      {/* Location */}
      <p className="text-[10px] text-ink-secondary uppercase tracking-wide mb-1.5">
        {table.capacity} pers · {LOC_LABEL[table.location]}
      </p>

      {/* Status */}
      {order ? (
        <>
          <p className={clsx('text-xs font-semibold truncate', STATUS_CFG[order.status].text)}>
            {STATUS_CFG[order.status].label}
          </p>
          <p className="text-xs text-ink-secondary mt-0.5 tabular-nums">
            {elapsed(order.created_at)}
          </p>
          {/* Mini item status */}
          {items.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {pendingCount > 0 && (
                <span className="text-[9px] bg-calipso-50 text-calipso font-semibold px-1.5 py-0.5 rounded-full">
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
              {inKitchen > 0 && (
                <span className="text-[9px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                  {inKitchen} cocina
                </span>
              )}
              {readyCount > 0 && (
                <span className="text-[9px] bg-[#D4EDDA] text-[#3B6D11] font-semibold px-1.5 py-0.5 rounded-full">
                  {readyCount} listo{readyCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          <p className="text-sm font-bold text-ink tabular-nums mt-1.5">{fmtCLP(order.total)}</p>
        </>
      ) : (
        <span className="text-xs font-semibold text-[#3B6D11]">Libre</span>
      )}
    </button>
  )
}

// ── AddItemModal ──────────────────────────────────────────────────────────────

function AddItemModal({ menuItems, onAdd, onClose }: {
  menuItems: MenuItem[]
  onAdd: (itemId: string, qty: number, notes: string) => Promise<void>
  onClose: () => void
}) {
  const [search,  setSearch]  = useState('')
  const [pending, setPending] = useState<Record<string, { qty: number; notes: string }>>({})
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({})
  const [saving,  setSaving]  = useState(false)

  const available = menuItems.filter(i => i.is_available)
  const filtered  = available.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalSelected = Object.values(pending).reduce((s, v) => s + v.qty, 0)

  const setQty = (id: string, qty: number) =>
    setPending(p => ({ ...p, [id]: { qty, notes: p[id]?.notes ?? '' } }))

  const setNotes = (id: string, notes: string) =>
    setPending(p => ({ ...p, [id]: { qty: p[id]?.qty ?? 0, notes } }))

  const handleAdd = async () => {
    setSaving(true)
    try {
      for (const [id, { qty, notes }] of Object.entries(pending)) {
        if (qty > 0) await onAdd(id, qty, notes)
      }
      onClose()
    } finally { setSaving(false) }
  }

  // Group by category
  const categories = Array.from(new Set(filtered.map(i => i.category?.name ?? 'Otros')))

  return (
    <div className="fixed inset-0 bg-ink/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-card shadow-brand-lg w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-calipso-100">
          <UtensilsCrossed size={18} className="text-calipso" />
          <span className="font-display font-semibold text-ink italic text-lg">Agregar platos</span>
          {totalSelected > 0 && (
            <span className="ml-auto text-xs bg-calipso text-white font-bold px-2.5 py-1 rounded-full">
              {totalSelected} ítem{totalSelected > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={onClose} className={clsx('text-ink-secondary hover:text-ink', totalSelected > 0 && 'ml-2')}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-calipso-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar plato o categoría…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-calipso-100 rounded-input focus:outline-none focus:ring-2 focus:ring-calipso"
            />
          </div>
        </div>

        {/* Items list — grouped */}
        <div className="flex-1 overflow-y-auto">
          {categories.map(cat => {
            const catItems = filtered.filter(i => (i.category?.name ?? 'Otros') === cat)
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-secondary px-5 py-2 bg-calipso-50 sticky top-0">
                  {cat}
                </p>
                {catItems.map(item => {
                  const qty = pending[item.id]?.qty ?? 0
                  const notes = pending[item.id]?.notes ?? ''
                  const expanded = showNotes[item.id]
                  return (
                    <div key={item.id} className="border-b border-calipso-50 last:border-0">
                      <div className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                          <p className="text-xs text-ink-secondary">{fmtCLP(item.price)}</p>
                        </div>

                        {/* Notes toggle */}
                        {qty > 0 && (
                          <button
                            onClick={() => setShowNotes(s => ({ ...s, [item.id]: !s[item.id] }))}
                            className="text-ink-secondary hover:text-calipso transition-colors p-1"
                            title="Agregar nota"
                          >
                            <Pencil size={12} />
                          </button>
                        )}

                        {/* Qty stepper */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setQty(item.id, Math.max(0, qty - 1))}
                            className="w-7 h-7 rounded-full border border-calipso/30 text-calipso font-bold flex items-center justify-center hover:bg-calipso hover:text-white transition-colors text-base"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm tabular-nums font-bold text-ink">{qty}</span>
                          <button
                            onClick={() => setQty(item.id, qty + 1)}
                            className="w-7 h-7 rounded-full bg-calipso text-white font-bold flex items-center justify-center hover:bg-calipso-700 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Notes input (expandable) */}
                      {qty > 0 && expanded && (
                        <div className="px-5 pb-3">
                          <input
                            type="text"
                            placeholder="Nota para cocina (sin sal, término medio…)"
                            value={notes}
                            onChange={e => setNotes(item.id, e.target.value)}
                            className="w-full text-sm border border-calipso-100 rounded-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calipso text-ink placeholder:text-ink/30"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-ink-secondary text-sm py-12">Sin resultados para "{search}"</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-calipso-100 bg-calipso-50">
          <button
            onClick={handleAdd}
            disabled={totalSelected === 0 || saving}
            className="w-full bg-calipso disabled:bg-calipso/40 text-white font-semibold py-3 rounded-input text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
            {totalSelected > 0 ? `Agregar ${totalSelected} ítem${totalSelected > 1 ? 's' : ''} a la comanda` : 'Selecciona platos'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PaymentModal ──────────────────────────────────────────────────────────────

function PaymentModal({ order, onConfirm, onClose }: {
  order: Order
  onConfirm: (method: string) => Promise<void>
  onClose: () => void
}) {
  const [method,   setMethod]   = useState<string>('')
  const [received, setReceived] = useState('')
  const [loading,  setLoading]  = useState(false)
  const change = method === 'efectivo' && received
    ? Math.max(0, parseInt(received.replace(/\D/g, '') || '0') - order.total)
    : null

  const handleConfirm = async () => {
    if (!method) return
    setLoading(true)
    try { await onConfirm(method) } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-card shadow-brand-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-calipso-100">
          <Receipt size={18} className="text-[#3B6D11]" />
          <span className="font-display font-semibold text-ink italic text-lg">Cobrar Mesa {order.table?.number}</span>
          <button onClick={onClose} className="ml-auto text-ink-secondary hover:text-ink"><X size={20} /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Total */}
          <div className="bg-calipso-50 rounded-card px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Total a cobrar</span>
            <span className="text-2xl font-bold text-ink tabular-nums">{fmtCLP(order.total)}</span>
          </div>

          {/* Items summary */}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {(order.items ?? []).filter(i => i.status !== 'delivered' || true).map(item => (
              <div key={item.id} className="flex justify-between text-sm text-ink-secondary">
                <span className="truncate mr-2">{item.menu_item?.name} ×{item.quantity}</span>
                <span className="tabular-nums flex-shrink-0">{fmtCLP(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-input border-2 text-sm font-semibold transition-all',
                    method === id
                      ? 'border-[#3B6D11] bg-[#D4EDDA] text-[#3B6D11]'
                      : 'border-calipso-100 text-ink hover:border-calipso/40'
                  )}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash change calculator */}
          {method === 'efectivo' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Monto recibido</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary text-sm">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={received}
                  onChange={e => setReceived(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 text-sm border border-calipso-100 rounded-input focus:outline-none focus:ring-2 focus:ring-calipso tabular-nums"
                />
              </div>
              {change !== null && (
                <div className={clsx(
                  'flex justify-between items-center px-3 py-2 rounded-input text-sm font-semibold',
                  change >= 0 ? 'bg-[#D4EDDA] text-[#3B6D11]' : 'bg-coral-light text-coral-dark'
                )}>
                  <span>{change >= 0 ? 'Vuelto' : 'Falta'}</span>
                  <span className="tabular-nums">{fmtCLP(Math.abs(change))}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={handleConfirm}
            disabled={!method || loading || (method === 'efectivo' && change !== null && change < 0)}
            className="w-full flex items-center justify-center gap-2 bg-[#3B6D11] disabled:opacity-50 text-white font-semibold py-3 rounded-input text-sm transition-colors hover:bg-[#2D5509]"
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── OrderPanel ────────────────────────────────────────────────────────────────

function OrderPanel({ table, order, menuItems, onRefresh }: {
  table: Table; order?: Order; menuItems: MenuItem[]; onRefresh: () => void
}) {
  const [showAdd,     setShowAdd]     = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showCancel,  setShowCancel]  = useState(false)
  const [editNotes,   setEditNotes]   = useState(false)
  const [notesValue,  setNotesValue]  = useState(order?.notes ?? '')
  const [loading,     setLoading]     = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const notesRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNotesValue(order?.notes ?? '')
    setEditNotes(false)
  }, [order?.id, order?.notes])

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setLoading(key); setError(null)
    try { await fn(); onRefresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(null) }
  }

  // No order → free table
  if (!order) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-calipso-50 flex items-center justify-center">
          <UtensilsCrossed size={28} className="text-calipso" />
        </div>
        <div>
          <p className="font-display italic text-xl text-ink">Mesa {table.number} — Libre</p>
          <p className="text-sm text-ink-secondary mt-1">{table.capacity} personas · {LOC_LABEL[table.location]}</p>
        </div>
        <button
          onClick={() => wrap('create', async () => { await createOrder(table.id) })}
          disabled={loading === 'create'}
          className="flex items-center gap-2 bg-calipso text-white px-6 py-3 rounded-input text-sm font-semibold hover:bg-calipso-700 transition-colors disabled:opacity-60"
        >
          {loading === 'create' ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
          Abrir comanda
        </button>
      </div>
    )
  }

  const items = order.items ?? []
  const groups: OrderItem['status'][] = ['pending', 'in_kitchen', 'ready', 'delivered']
  const hasPending   = items.some(i => i.status === 'pending')
  const allDelivered = items.length > 0 && items.every(i => i.status === 'delivered' || i.status === 'ready')
  const readyCount   = items.filter(i => i.status === 'ready').length
  const activeItems  = items.filter(i => i.status !== 'delivered')
  const progressPct  = activeItems.length > 0
    ? Math.round((activeItems.filter(i => i.status === 'ready').length / activeItems.length) * 100)
    : 0

  const handleAddItem = async (itemId: string, qty: number, notes: string) => {
    await addOrderItem(order.id, itemId, qty, notes)
    onRefresh()
  }

  const handleQtyChange = (item: OrderItem, delta: number) => {
    const newQty = item.quantity + delta
    if (newQty <= 0) { wrap(`remove-${item.id}`, () => removeOrderItem(item.id)) }
    else             { wrap(`qty-${item.id}`,    () => updateOrderItemQty(item.id, newQty)) }
  }

  const handleSaveNotes = () =>
    wrap('notes', async () => {
      await updateOrderNotes(order.id, notesValue)
      setEditNotes(false)
    })

  const handlePayment = async (method: string) => {
    await wrap('pay', async () => {
      await closeOrder(order.id)
      void method // could be stored in order notes or a separate field
    })
    setShowPayment(false)
  }

  const handleCancel = () => wrap('cancel', () => updateOrderStatus(order.id, 'cancelled'))

  return (
    <div className="flex flex-col h-full">

      {/* Panel header */}
      <div className="px-5 py-4 border-b border-calipso-100 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-ink text-xl italic">
                Mesa {table.number}
                <span className="text-ink-secondary font-normal text-sm ml-2 not-italic">
                  {LOC_LABEL[table.location]}
                </span>
              </h2>
              <span className={clsx(
                'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                STATUS_CFG[order.status].badge
              )}>
                {STATUS_CFG[order.status].label}
              </span>
            </div>
            <p className="text-sm text-ink-secondary mt-0.5">
              Abierta hace <span className="font-semibold">{elapsed(order.created_at)}</span>
              {elapsedMin(order.created_at) > 40 && (
                <span className="text-coral font-semibold ml-1">⚠ Tiempo excedido</span>
              )}
            </p>
          </div>
          <Link to="/admin/cocina" target="_blank"
            className="flex items-center gap-1 text-xs text-calipso hover:underline flex-shrink-0 mt-1">
            Cocina <ExternalLink size={11} />
          </Link>
        </div>

        {/* Progress bar */}
        {activeItems.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-ink-secondary mb-1">
              <span>Progreso cocina</span>
              <span className="tabular-nums font-semibold">{readyCount}/{activeItems.length} listos</span>
            </div>
            <div className="h-2 bg-calipso-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3B6D11] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Order notes */}
        <div className="mt-3">
          {editNotes ? (
            <div className="flex gap-2">
              <input
                ref={notesRef}
                autoFocus
                type="text"
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveNotes(); if (e.key === 'Escape') setEditNotes(false) }}
                placeholder="Nota de la comanda (alergias, preferencias…)"
                className="flex-1 text-sm border border-calipso-100 rounded-input px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-calipso"
              />
              <button onClick={handleSaveNotes} disabled={loading === 'notes'}
                className="text-xs bg-calipso text-white px-3 py-1.5 rounded-input font-semibold hover:bg-calipso-700">
                {loading === 'notes' ? <RefreshCw size={12} className="animate-spin" /> : 'Guardar'}
              </button>
              <button onClick={() => setEditNotes(false)} className="text-ink-secondary hover:text-ink p-1.5">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditNotes(true)}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-calipso transition-colors group"
            >
              <Pencil size={11} />
              {order.notes
                ? <span className="italic text-ink">{order.notes}</span>
                : <span className="group-hover:underline">Agregar nota a la comanda</span>
              }
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-coral-light text-coral text-sm px-3 py-2 rounded-input">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Items — grouped by status */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-calipso-50/30">
        {items.length === 0 && (
          <div className="text-center py-12">
            <UtensilsCrossed size={32} className="text-calipso/30 mx-auto mb-3" />
            <p className="text-sm text-ink-secondary">Comanda vacía — agrega platos</p>
          </div>
        )}

        {groups.map(status => {
          const groupItems = items.filter(i => i.status === status)
          if (groupItems.length === 0) return null
          const cfg  = ITEM_CFG[status]
          const Icon = cfg.Icon
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className={cfg.cls} />
                <span className={clsx('text-xs font-bold uppercase tracking-wider', cfg.cls)}>
                  {cfg.label} ({groupItems.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {groupItems.map(item => (
                  <div
                    key={item.id}
                    className={clsx(
                      'flex items-start gap-3 px-3 py-2.5 rounded-input transition-colors',
                      status === 'delivered'
                        ? 'opacity-40'
                        : status === 'ready'
                          ? 'bg-[#D4EDDA]/60 border border-[#3B6D11]/20'
                          : 'bg-white border border-calipso-50 shadow-sm'
                    )}
                  >
                    {/* Qty stepper (only for pending) */}
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      {status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleQtyChange(item, -1)}
                            disabled={!!loading}
                            className="w-5 h-5 rounded-full border border-calipso/30 text-calipso flex items-center justify-center hover:bg-calipso hover:text-white transition-colors disabled:opacity-40"
                          >
                            {(loading === `remove-${item.id}` || loading === `qty-${item.id}`)
                              ? <RefreshCw size={9} className="animate-spin" />
                              : <Minus size={10} />}
                          </button>
                          <span className="text-sm font-bold text-ink w-4 text-center tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => handleQtyChange(item, 1)}
                            disabled={!!loading}
                            className="w-5 h-5 rounded-full bg-calipso text-white flex items-center justify-center hover:bg-calipso-700 transition-colors disabled:opacity-40"
                          >
                            <Plus size={10} />
                          </button>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-ink-secondary w-10 tabular-nums">×{item.quantity}</span>
                      )}
                    </div>

                    {/* Name + notes */}
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-sm font-semibold text-ink leading-snug',
                        status === 'delivered' && 'line-through text-ink-secondary'
                      )}>
                        {item.menu_item?.name ?? item.menu_item_id}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-amber-600 italic mt-0.5">📝 {item.notes}</p>
                      )}
                    </div>

                    {/* Price */}
                    <span className="text-sm font-semibold text-ink tabular-nums flex-shrink-0">
                      {fmtCLP(item.unit_price * item.quantity)}
                    </span>

                    {/* Actions */}
                    {status === 'ready' && (
                      <button
                        onClick={() => wrap(`deliver-${item.id}`, () => updateOrderItemStatus(item.id, 'delivered'))}
                        disabled={loading === `deliver-${item.id}`}
                        className="text-xs font-semibold text-[#3B6D11] hover:bg-[#3B6D11] hover:text-white px-2 py-0.5 rounded transition-colors flex-shrink-0 border border-[#3B6D11]/30"
                        title="Marcar entregado"
                      >
                        {loading === `deliver-${item.id}` ? <RefreshCw size={11} className="animate-spin" /> : 'Entregar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer — actions */}
      <div className="border-t border-calipso-100 bg-white px-4 py-3 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-ink-secondary">Total comanda</span>
            {hasPending && <span className="text-xs text-ink-secondary/60 ml-2">(incl. pendientes)</span>}
          </div>
          <span className="text-2xl font-bold text-ink tabular-nums">{fmtCLP(order.total)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Always: Add */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 border border-calipso text-calipso text-xs font-semibold px-3 py-2 rounded-input hover:bg-calipso hover:text-white transition-colors"
          >
            <Plus size={13} /> Agregar
          </button>

          {/* Send to kitchen + print ticket */}
          {hasPending && order.status !== 'ready' && (
            <button
              onClick={() => {
                // Capturamos los ítems pendientes ANTES del envío
                const pendingItems = items.filter(i => i.status === 'pending')
                // Abrimos la ventana de forma síncrona (dentro del click handler)
                // para evitar que el bloqueador de popups la rechace
                const printWin = window.open('', '_blank', 'width=420,height=620,toolbar=no,menubar=no,location=no,status=no')
                wrap('kitchen', async () => {
                  await sendOrderToKitchen(order.id)
                  if (printWin) {
                    printWin.document.write(buildTicketHTML(order, table, pendingItems))
                    printWin.document.close()
                  }
                })
              }}
              disabled={loading === 'kitchen'}
              className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-input hover:bg-amber-600 transition-colors disabled:opacity-50 flex-1 justify-center"
            >
              {loading === 'kitchen' ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              Enviar a cocina
            </button>
          )}

          {/* Pay */}
          {(allDelivered || readyCount > 0) && !hasPending && (
            <button
              onClick={() => setShowPayment(true)}
              className="flex items-center gap-1.5 bg-[#3B6D11] text-white text-xs font-semibold px-3 py-2 rounded-input hover:bg-[#2D5509] transition-colors flex-1 justify-center"
            >
              <CreditCard size={13} /> Cobrar
            </button>
          )}

          {/* Cancel */}
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center gap-1.5 text-coral border border-coral/25 text-xs font-semibold px-3 py-2 rounded-input hover:bg-coral-light transition-colors ml-auto"
            >
              <Ban size={13} /> Cancelar
            </button>
          ) : (
            <div className="flex gap-1.5 ml-auto">
              <span className="text-xs text-ink-secondary self-center">¿Cancelar comanda?</span>
              <button
                onClick={handleCancel}
                disabled={loading === 'cancel'}
                className="text-xs bg-coral text-white font-semibold px-3 py-1.5 rounded-input hover:bg-coral-hover transition-colors"
              >
                {loading === 'cancel' ? <RefreshCw size={11} className="animate-spin" /> : 'Sí'}
              </button>
              <button onClick={() => setShowCancel(false)}
                className="text-xs border border-calipso-100 px-3 py-1.5 rounded-input hover:bg-calipso-50 transition-colors text-ink-secondary">
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddItemModal menuItems={menuItems} onAdd={handleAddItem} onClose={() => setShowAdd(false)} />
      )}
      {showPayment && (
        <PaymentModal order={order} onConfirm={handlePayment} onClose={() => setShowPayment(false)} />
      )}
    </div>
  )
}

// ── Order history ─────────────────────────────────────────────────────────────

function OrderHistoryView({ orders }: { orders: Order[] }) {
  const today = todayStr()
  const closed = orders
    .filter(o => (o.status === 'paid' || o.status === 'cancelled') &&
      o.updated_at?.startsWith(today))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const totalRevenue = closed
    .filter(o => o.status === 'paid')
    .reduce((s, o) => s + o.total, 0)

  const [expanded, setExpanded] = useState<string | null>(null)

  if (closed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <History size={40} className="text-calipso/30 mb-4" />
        <p className="font-display italic text-lg text-ink">Sin comandas cerradas hoy</p>
        <p className="text-sm text-ink-secondary mt-1">Las comandas cobradas o canceladas aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cobradas', value: closed.filter(o => o.status === 'paid').length, color: 'text-[#3B6D11]' },
          { label: 'Canceladas', value: closed.filter(o => o.status === 'cancelled').length, color: 'text-coral' },
          { label: 'Total recaudado', value: fmtCLP(totalRevenue), color: 'text-calipso' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-card p-4 shadow-brand text-center">
            <p className={clsx('text-xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-xs text-ink-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-card shadow-brand overflow-hidden">
        {closed.map((order, idx) => {
          const isExpanded = expanded === order.id
          const items = order.items ?? []
          return (
            <div key={order.id} className={clsx('border-b border-calipso-50 last:border-0', idx === 0 && '')}>
              <button
                onClick={() => setExpanded(isExpanded ? null : order.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-calipso-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">Mesa {order.table?.number ?? '—'}</span>
                    <span className={clsx(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      STATUS_CFG[order.status].badge
                    )}>
                      {STATUS_CFG[order.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {items.length} ítem{items.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(order.updated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    {order.notes && <span className="ml-2 italic">· {order.notes}</span>}
                  </p>
                </div>
                <span className="font-bold text-ink tabular-nums text-sm flex-shrink-0">
                  {fmtCLP(order.total)}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-ink-secondary flex-shrink-0" /> : <ChevronDown size={14} className="text-ink-secondary flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-3 space-y-1 bg-calipso-50/40">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-ink-secondary">
                      <span>{item.menu_item?.name ?? '—'} ×{item.quantity}{item.notes && <span className="italic ml-1 text-amber-600">({item.notes})</span>}</span>
                      <span className="tabular-nums">{fmtCLP(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DishRegistry ─────────────────────────────────────────────────────────────

type DishStat = {
  id: string
  name: string
  category: string
  qty: number
  orders: number
  revenue: number
}

function DishRegistry({ orders }: { orders: Order[] }) {
  const [period, setPeriod] = useState<'hoy' | 'todo'>('hoy')
  const [sortBy, setSortBy]  = useState<'qty' | 'revenue'>('qty')

  const today = todayStr()

  const relevant = (
    period === 'hoy'
      ? orders.filter(o => o.created_at.startsWith(today) || o.updated_at?.startsWith(today))
      : orders
  ).filter(o => o.status !== 'cancelled')

  const statsMap = new Map<string, DishStat>()
  for (const order of relevant) {
    for (const item of (order.items ?? [])) {
      const key  = item.menu_item_id
      const prev = statsMap.get(key)
      statsMap.set(key, {
        id:       key,
        name:     item.menu_item?.name ?? key,
        category: (item.menu_item as any)?.category?.name ?? '—',
        qty:     (prev?.qty     ?? 0) + item.quantity,
        orders:  (prev?.orders  ?? 0) + 1,
        revenue: (prev?.revenue ?? 0) + item.unit_price * item.quantity,
      })
    }
  }

  const stats = [...statsMap.values()].sort((a, b) =>
    sortBy === 'qty' ? b.qty - a.qty : b.revenue - a.revenue
  )
  const maxVal      = sortBy === 'qty' ? (stats[0]?.qty ?? 1) : (stats[0]?.revenue ?? 1)
  const totalQty    = stats.reduce((s, d) => s + d.qty,     0)
  const totalRev    = stats.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = stats.reduce((s, d) => s + d.orders,  0)

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Period */}
        <div className="flex rounded-input border border-calipso-100 overflow-hidden">
          {(['hoy', 'todo'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                'px-4 py-2 text-xs font-semibold transition-colors',
                period === p ? 'bg-calipso text-white' : 'text-ink-secondary hover:bg-calipso-50'
              )}
            >
              {p === 'hoy' ? 'Hoy' : 'Todo el período'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex rounded-input border border-calipso-100 overflow-hidden">
          {(['qty', 'revenue'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={clsx(
                'px-4 py-2 text-xs font-semibold transition-colors',
                sortBy === s ? 'bg-calipso text-white' : 'text-ink-secondary hover:bg-calipso-50'
              )}
            >
              {s === 'qty' ? 'Por cantidad' : 'Por ingresos'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Platos vendidos',  value: totalQty,            cls: 'text-ink' },
          { label: 'Líneas de pedido', value: totalOrders,         cls: 'text-calipso' },
          { label: 'Ingreso total',    value: fmtCLP(totalRev),    cls: 'text-[#3B6D11]' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-card p-4 shadow-brand text-center">
            <p className={clsx('text-xl font-bold tabular-nums', cls)}>{value}</p>
            <p className="text-xs text-ink-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={40} className="text-calipso/30 mb-4" />
          <p className="font-display italic text-lg text-ink">Sin datos para el período</p>
          <p className="text-sm text-ink-secondary mt-1">
            Los platos pedidos aparecerán aquí una vez que haya comandas.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-brand overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5.5rem_7rem] gap-2 px-5 py-2.5 bg-calipso-50 border-b border-calipso-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">#</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Plato</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary text-right">Unidades</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary text-right">Pedidos</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary text-right">Ingresos</span>
          </div>

          {stats.map((dish, idx) => {
            const barPct = Math.round(
              (sortBy === 'qty' ? dish.qty : dish.revenue) / maxVal * 100
            )
            const rankColor =
              idx === 0 ? 'text-amber-500' :
              idx === 1 ? 'text-zinc-400'  :
              idx === 2 ? 'text-orange-400' :
              'text-ink/20'
            const isTop = idx < 3

            return (
              <div key={dish.id} className={clsx(
                'border-b border-calipso-50 last:border-0',
                isTop && 'bg-calipso-50/30'
              )}>
                <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5.5rem_7rem] gap-2 items-center px-5 py-3">
                  {/* Rank */}
                  <span className={clsx('text-sm font-bold tabular-nums', rankColor)}>
                    {idx + 1}
                  </span>

                  {/* Name + category + bar */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-ink truncate">{dish.name}</p>
                      {idx === 0 && (
                        <TrendingUp size={12} className="text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-ink-secondary">{dish.category}</p>
                    <div className="mt-1.5 h-1.5 bg-calipso-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          idx === 0 ? 'bg-amber-400' : idx < 3 ? 'bg-calipso' : 'bg-calipso/50'
                        )}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Qty */}
                  <span className={clsx(
                    'text-sm font-bold tabular-nums text-right',
                    sortBy === 'qty' ? 'text-ink' : 'text-ink-secondary'
                  )}>
                    {dish.qty}
                  </span>

                  {/* Orders */}
                  <span className="text-sm text-ink-secondary tabular-nums text-right">
                    {dish.orders}
                  </span>

                  {/* Revenue */}
                  <span className={clsx(
                    'text-sm font-semibold tabular-nums text-right',
                    sortBy === 'revenue' ? 'text-[#3B6D11]' : 'text-ink-secondary'
                  )}>
                    {fmtCLP(dish.revenue)}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Footer total */}
          <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5.5rem_7rem] gap-2 items-center px-5 py-3 bg-calipso-50 border-t border-calipso-100">
            <span />
            <span className="text-xs font-bold text-ink uppercase tracking-wide">Total</span>
            <span className="text-sm font-bold text-ink tabular-nums text-right">{totalQty}</span>
            <span className="text-sm font-bold text-ink-secondary tabular-nums text-right">{totalOrders}</span>
            <span className="text-sm font-bold text-[#3B6D11] tabular-nums text-right">{fmtCLP(totalRev)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Orders() {
  const [tables,         setTables]         = useState<Table[]>([])
  const [orders,         setOrders]         = useState<Order[]>([])
  const [allOrders,      setAllOrders]      = useState<Order[]>([])
  const [menuItems,      setMenuItems]      = useState<MenuItem[]>([])
  const [selectedTable,  setSelectedTable]  = useState<string | null>(null)
  const [view,           setView]           = useState<'mesas' | 'historial' | 'registro'>('mesas')
  const [loading,        setLoading]        = useState(true)
  const [countdown,      setCountdown]      = useState(30)
  const countRef = useRef(30)

  const load = useCallback(async () => {
    const [t, o, m, all] = await Promise.all([
      getTables(), getActiveOrders(), getAllMenuItems(), getAllOrders(),
    ])
    setTables(t)
    setOrders(o)
    setMenuItems(m)
    setAllOrders(all)
    setLoading(false)
    countRef.current = 30
    setCountdown(30)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-select first occupied table
  useEffect(() => {
    if (!selectedTable && orders.length > 0) {
      setSelectedTable(orders[0].table_id)
    }
  }, [orders, selectedTable])

  // 30s auto-refresh countdown
  useEffect(() => {
    const t = setInterval(() => {
      countRef.current -= 1
      setCountdown(countRef.current)
      if (countRef.current <= 0) load()
    }, 1000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <PageLoader />

  const orderByTable   = Object.fromEntries(orders.map(o => [o.table_id, o]))
  const selTable       = tables.find(t => t.id === selectedTable)
  const selOrder       = selectedTable ? orderByTable[selectedTable] : undefined
  const activeCount    = orders.length
  const inKitchenCount = orders.filter(o => o.status === 'in_kitchen').length
  const readyCount     = orders.filter(o => o.status === 'ready').length
  const totalRevenue   = orders.reduce((s, o) => s + o.total, 0)

  return (
    <div className="flex flex-col h-full animate-fade-in font-body" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink font-bold italic">Comandas</h1>
          {/* Live stats */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm text-ink-secondary">
              <span className="font-bold text-ink tabular-nums">{activeCount}</span> mesa{activeCount !== 1 ? 's' : ''} activa{activeCount !== 1 ? 's' : ''}
            </span>
            {inKitchenCount > 0 && (
              <span className="text-sm text-amber-600 font-semibold">
                · {inKitchenCount} en cocina
              </span>
            )}
            {readyCount > 0 && (
              <span className="text-sm text-[#3B6D11] font-semibold">
                · {readyCount} listo{readyCount !== 1 ? 's' : ''}
              </span>
            )}
            {totalRevenue > 0 && (
              <span className="text-sm text-ink-secondary">
                · <span className="font-bold text-calipso tabular-nums">{fmtCLP(totalRevenue)}</span> en curso
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/cocina" target="_blank"
            className="flex items-center gap-1.5 border border-calipso text-calipso text-xs font-semibold px-3 py-2 rounded-input hover:bg-calipso hover:text-white transition-colors"
          >
            <ChefHat size={13} /> Panel Cocina
          </Link>
          <button
            onClick={load}
            className="flex items-center gap-1.5 border border-calipso-100 text-ink-secondary text-xs px-3 py-2 rounded-input hover:bg-calipso-50 transition-colors"
          >
            <RefreshCw size={13} /> {countdown}s
          </button>
        </div>
      </div>

      {/* ── View tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 border-b border-calipso-100 flex-shrink-0">
        {[
          { id: 'mesas',     label: 'Mesas',              Icon: TableProperties },
          { id: 'historial', label: 'Historial del día',   Icon: History },
          { id: 'registro',  label: 'Registro de platos',  Icon: BarChart2 },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id as 'mesas' | 'historial' | 'registro')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              view === id
                ? 'border-calipso text-calipso'
                : 'border-transparent text-ink-secondary hover:text-ink'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      {view === 'historial' ? (
        <div className="flex-1 overflow-y-auto">
          <OrderHistoryView orders={allOrders} />
        </div>
      ) : view === 'registro' ? (
        <div className="flex-1 overflow-y-auto">
          <DishRegistry orders={allOrders} />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Left: floor plan */}
          <div className="w-56 flex-shrink-0 overflow-y-auto space-y-4">
            {LOCATIONS.map(loc => {
              const locTables = tables.filter(t => t.location === loc && t.is_active)
              if (locTables.length === 0) return null
              return (
                <div key={loc}>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary mb-2 px-0.5">
                    {LOC_LABEL[loc]}
                  </p>
                  <div className="space-y-2">
                    {locTables.map(t => (
                      <TableCard
                        key={t.id}
                        table={t}
                        order={orderByTable[t.id]}
                        selected={selectedTable === t.id}
                        onClick={() => setSelectedTable(t.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: order panel */}
          <div className="flex-1 bg-white rounded-card shadow-brand overflow-hidden flex flex-col min-h-0">
            {selTable ? (
              <OrderPanel
                table={selTable}
                order={selOrder}
                menuItems={menuItems}
                onRefresh={load}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <TableProperties size={40} className="text-calipso/30 mb-4" />
                <p className="font-display italic text-xl text-ink">Selecciona una mesa</p>
                <p className="text-sm text-ink-secondary mt-1">Haz clic en cualquier mesa del plano para ver su comanda.</p>
                {activeCount > 0 && (
                  <button
                    onClick={() => setSelectedTable(orders[0].table_id)}
                    className="mt-4 flex items-center gap-1.5 text-sm text-calipso hover:underline"
                  >
                    Ir a la primera mesa activa <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
