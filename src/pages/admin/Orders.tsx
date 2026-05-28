import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  getActiveOrders, getAllOrders, getTables, getAllMenuItems, getWaiters,
  createOrder, addOrderItem, removeOrderItem,
  sendOrderToKitchen, updateOrderItemStatus, closeOrder,
  updateOrderStatus, updateOrderItemQty, updateOrderNotes,
} from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import type { Order, OrderItem, Table, MenuItem, Waiter } from '../../types'
import {
  UtensilsCrossed, Plus, Send, CreditCard, X,
  Clock, ChefHat, CheckCircle2, Truck, AlertCircle,
  RefreshCw, ExternalLink, Pencil, Ban, History,
  TableProperties, Banknote, Smartphone, Receipt, ArrowRight,
  ChevronDown, ChevronUp, Minus, BarChart2, TrendingUp, User2, Star, Zap, Eye,
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

const LOCATIONS: Table['location'][] = ['terraza', 'comedor', 'comedor2']
const LOC_LABEL = { terraza: 'Terraza', comedor: 'Comedor', comedor2: 'Comedor 2' }

const PAYMENT_METHODS = [
  { id: 'efectivo',     label: 'Efectivo',      Icon: Banknote },
  { id: 'debito',       label: 'Débito',        Icon: CreditCard },
  { id: 'credito',      label: 'Crédito',       Icon: CreditCard },
  { id: 'transferencia',label: 'Transferencia', Icon: Smartphone },
] as const

// ── Kitchen ticket ────────────────────────────────────────────────────────────

const LOC_CODE: Record<Table['location'], string> = {
  comedor:  'C',
  terraza:  'T',
  comedor2: 'C2',
}

const SLUG_TO_SECTION: Record<string, string> = {
  entradas: 'Entrada',
  ceviches: 'Entrada',
  fondos:   'Principal',
  arroces:  'Principal',
  postres:  'Postre',
  bebidas:  'Tragos - Vinos',
}
// Mismo orden que el sistema antiguo
const SECTION_ORDER = ['Entrada', 'Principal', 'Agregado', 'Tragos - Vinos', 'Postre']

// ── Helpers visuales del POSGrid ──────────────────────────────────────────────

/** Color de acento por categoría (borde izquierdo de la tarjeta) */
function catColor(slug: string | undefined): string {
  const MAP: Record<string, string> = {
    entradas: '#29B5D0', ceviches: '#29B5D0',
    fondos:   '#E8593C',
    arroces:  '#D97706',
    postres:  '#9333EA',
    bebidas:  '#3B6D11',
  }
  return MAP[slug ?? ''] ?? '#29B5D0'
}

/** Fondo de tarjeta seleccionada por categoría */
function catSelBg(slug: string | undefined): string {
  const MAP: Record<string, string> = {
    entradas: '#EBF8FB', ceviches: '#EBF8FB',
    fondos:   '#FEF0ED',
    arroces:  '#FFFBEB',
    postres:  '#F5F3FF',
    bebidas:  '#D4EDDA',
  }
  return MAP[slug ?? ''] ?? '#EBF8FB'
}

/** Emojis de alérgenos para mostrar en la tarjeta */
const ALLERGEN_EMOJI: Record<string, string> = {
  pescado: '🐟', moluscos: '🦑', crustaceos: '🦐',
  gluten: '🌾', lacteos: '🥛', nueces: '🥜', huevos: '🥚', soja: '🫘',
}

const ALLERGEN_LABEL: Record<string, string> = {
  pescado: 'Pescado', moluscos: 'Moluscos', crustaceos: 'Crustáceos',
  gluten: 'Gluten', lacteos: 'Lácteos', nueces: 'Frutos secos', huevos: 'Huevos', soja: 'Soja',
}

function buildTicketHTML(order: Order, table: Table, pendingItems: OrderItem[], waiterName?: string): string {
  const now  = new Date()
  const pad  = (n: number) => String(n).padStart(2, '0')
  const dt   = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const mesaCode = `${table.number}${LOC_CODE[table.location] ?? ''}`
  const waiter   = waiterName ?? order.waiter_name ?? ''

  const grouped: Record<string, OrderItem[]> = {}
  SECTION_ORDER.forEach(s => { grouped[s] = [] })
  pendingItems.forEach(item => {
    const slug    = item.menu_item?.category?.slug ?? ''
    const section = SLUG_TO_SECTION[slug] ?? 'Agregado'
    grouped[section].push(item)
  })

  const sectionsHTML = SECTION_ORDER.map(section => {
    const items = grouped[section]
    const itemsHTML = items.map(item => `
      <div class="item">
        <div class="item-row">
          <span class="qty">${item.quantity}</span>
          <span class="name">${item.menu_item?.name ?? item.menu_item_id}</span>
        </div>
        ${item.notes ? `<div class="note">${item.notes}</div>` : ''}
      </div>`).join('')
    return `<div class="section-label">${section}:</div>${itemsHTML}<div class="sep-short"></div>`
  }).join('\n')

  const noteHTML = order.notes
    ? `<div class="sep-full"></div><div class="order-note">&#128204; ${order.notes}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mesa N\xb0 ${mesaCode}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    width: 80mm;
    padding: 5mm 4mm 12mm;
    color: #000;
    font-size: 13px;
    line-height: 1.4;
  }
  .sep-full  { border: none; border-top: 1.5px solid #555; margin: 5px 0; }
  .sep-short { border: none; border-top: 1px solid #888; width: 65%; margin: 4px 0 6px; }
  .mesa-row   { display: flex; justify-content: space-between; align-items: baseline; padding: 2px 0 4px; }
  .mesa-label { font-size: 14px; font-weight: bold; }
  .mesa-num   { font-size: 14px; font-weight: bold; }
  .garzon-label { font-weight: bold; font-size: 13px; }
  .garzon-name  { font-size: 13px; margin: 1px 0 3px; }
  .datetime { font-size: 12px; padding: 3px 0 4px; }
  .section-label { font-weight: bold; font-size: 13px; margin-top: 2px; }
  .item      { margin: 2px 0 2px 2px; }
  .item-row  { display: flex; align-items: baseline; gap: 5px; }
  .qty       { font-size: 13px; min-width: 14px; flex-shrink: 0; }
  .name      { font-size: 13px; }
  .note      { font-size: 11px; font-style: italic; padding-left: 19px; color: #333; }
  .order-note { font-size: 12px; font-style: italic; padding: 3px 0; }
  @media print {
    body  { width: 80mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>
<div class="mesa-row">
  <span class="mesa-label">Mesa N\xb0 :</span>
  <span class="mesa-num">${mesaCode}</span>
</div>
<div class="sep-full"></div>
<div class="garzon-label">Garz\xf3n :</div>
<div class="garzon-name">${waiter}</div>
<div class="sep-full"></div>
<div class="datetime">${dt}</div>
<div class="sep-full"></div>
${sectionsHTML}
${noteHTML}
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 800);
  };
</script>
</body>
</html>`
}

// ── ComandaPreview ────────────────────────────────────────────────────────────
// Vista previa en pantalla antes de enviar a cocina (igual al sistema antiguo)

function ComandaPreview({ order, table, pendingItems, onConfirm, onClose }: {
  order: Order
  table: Table
  pendingItems: OrderItem[]
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dt  = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const mesaCode = `${table.number}${LOC_CODE[table.location] ?? ''}`

  // Agrupar ítems por sección
  const grouped: Record<string, OrderItem[]> = {}
  SECTION_ORDER.forEach(s => { grouped[s] = [] })
  pendingItems.forEach(item => {
    const slug    = item.menu_item?.category?.slug ?? ''
    const section = SLUG_TO_SECTION[slug] ?? 'Agregado'
    if (!grouped[section]) grouped[section] = []
    grouped[section].push(item)
  })

  const handleConfirm = async () => {
    setSaving(true)
    try { await onConfirm() } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-card shadow-brand-lg w-full max-w-sm flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-calipso-100 flex-shrink-0">
          <Eye size={20} className="text-calipso flex-shrink-0" />
          <span className="font-display italic text-lg font-bold text-ink flex-1">Vista previa — comanda</span>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink p-1"><X size={22} /></button>
        </div>

        {/* Ticket */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="border-2 border-dashed border-calipso-200 rounded-card bg-[#FAFAF7] p-5 font-mono">

            {/* Mesa */}
            <p className="text-center text-lg font-bold tracking-wide mb-1">
              MESA N° {mesaCode}
            </p>
            <div className="border-t-2 border-ink/60 my-2" />

            {/* Garzón + hora */}
            <p className="text-sm mb-0.5">
              <span className="font-bold">Garzón: </span>{order.waiter_name ?? '—'}
            </p>
            <p className="text-xs text-ink-secondary mb-2">{dt}</p>
            <div className="border-t border-ink/30 my-2" />

            {/* Secciones */}
            {SECTION_ORDER.map(section => {
              const sectionItems = grouped[section] ?? []
              return (
                <div key={section} className="mb-2">
                  <p className="text-sm font-bold flex items-center gap-1">
                    <span className="text-calipso text-base">»</span> {section}
                  </p>
                  {sectionItems.length > 0 ? (
                    <div className="pl-4 mt-1 space-y-0.5">
                      {sectionItems.map(item => (
                        <div key={item.id} className="text-sm flex gap-2 items-baseline">
                          <span className="font-bold w-5 flex-shrink-0 text-calipso">{item.quantity}</span>
                          <span className="flex-1">{item.menu_item?.name ?? '—'}</span>
                        </div>
                      ))}
                      {/* Notas de ítems */}
                      {sectionItems.some(i => i.notes) && (
                        <div className="mt-0.5 space-y-0.5">
                          {sectionItems.filter(i => i.notes).map(item => (
                            <p key={item.id} className="text-xs italic text-amber-700 pl-5">
                              ↳ {item.menu_item?.name}: {item.notes}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="pl-4 text-xs text-ink/25 mt-0.5">—</p>
                  )}
                  <div className="border-t border-dashed border-ink/20 mt-2" />
                </div>
              )
            })}

            {/* Nota de comanda */}
            {order.notes && (
              <p className="text-xs italic text-ink-secondary mt-1">📌 {order.notes}</p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="px-4 pb-5 pt-3 space-y-2 flex-shrink-0 border-t border-calipso-100">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full flex items-center justify-center gap-3 bg-amber-500 text-white text-lg font-bold py-4 rounded-input hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
            Confirmar y enviar a cocina
          </button>
          <button
            onClick={onClose}
            className="w-full text-base font-semibold text-ink-secondary py-3 rounded-input hover:bg-calipso-50 transition-colors border-2 border-calipso-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TableCard ─────────────────────────────────────────────────────────────────

function TableCard({ table, order, selected, onClick, onQuickSend }: {
  table: Table; order?: Order; selected: boolean; onClick: () => void; onQuickSend?: () => void
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
        'relative w-full text-left rounded-card border-2 p-4 transition-all duration-150',
        selected
          ? 'border-calipso bg-calipso-50 shadow-brand-md'
          : 'border-transparent bg-white shadow-brand hover:border-calipso/40',
        !table.is_active && 'opacity-40 pointer-events-none',
      )}
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      {/* Number + dot */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-2xl font-bold text-ink tabular-nums">#{table.number}</span>
        <span className={clsx(
          'w-3 h-3 rounded-full flex-shrink-0',
          !order ? 'bg-[#3B6D11]/50'
            : urg === 'urgent' ? 'bg-coral animate-pulse'
            : urg === 'warn'   ? 'bg-amber-400'
            : order ? STATUS_CFG[order.status].dot
            : 'bg-ink/20'
        )} />
      </div>

      {/* Location */}
      <p className="text-xs text-ink-secondary uppercase tracking-wide mb-1.5 font-medium">
        {table.capacity} pers · {LOC_LABEL[table.location]}
      </p>

      {/* Status */}
      {order ? (
        <>
          <p className={clsx('text-sm font-bold truncate', STATUS_CFG[order.status].text)}>
            {STATUS_CFG[order.status].label}
          </p>
          <p className="text-sm text-ink-secondary mt-0.5 tabular-nums font-medium">
            {elapsed(order.created_at)}
          </p>
          {/* Mini item status */}
          {items.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {pendingCount > 0 && (
                <span className="text-xs bg-calipso-50 text-calipso font-bold px-2 py-0.5 rounded-full">
                  {pendingCount} pend.
                </span>
              )}
              {inKitchen > 0 && (
                <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                  {inKitchen} cocina
                </span>
              )}
              {readyCount > 0 && (
                <span className="text-xs bg-[#D4EDDA] text-[#3B6D11] font-bold px-2 py-0.5 rounded-full">
                  {readyCount} listo{readyCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-base font-bold text-ink tabular-nums">{fmtCLP(order.total)}</p>
            {/* Quick-send button */}
            {pendingCount > 0 && onQuickSend && (
              <button
                onClick={e => { e.stopPropagation(); onQuickSend() }}
                className="flex items-center gap-1 text-xs bg-amber-500 text-white font-bold px-3 py-1.5 rounded-full hover:bg-amber-600 transition-colors"
                title="Enviar pendientes a cocina"
              >
                <Zap size={11} /> Cocina
              </button>
            )}
          </div>
        </>
      ) : (
        <span className="text-sm font-bold text-[#3B6D11]">Libre</span>
      )}
    </button>
  )
}

// ── POSGrid ───────────────────────────────────────────────────────────────────

type CartEntry = { qty: number; notes: string }

function POSGrid({ menuItems, frequentIds, existingItemIds, onAdd, onClose }: {
  menuItems: MenuItem[]
  frequentIds: string[]
  existingItemIds: string[]         // platos ya en la comanda (cualquier estado)
  onAdd: (items: { itemId: string; qty: number; notes: string }[]) => Promise<void>
  onClose: () => void
}) {
  const available   = menuItems.filter(i => i.is_available)
  const categories  = Array.from(new Set(available.map(i => i.category?.name ?? 'Otros')))
  const hasFav      = frequentIds.length > 0
  const TABS        = hasFav ? ['⭐ Frecuentes', ...categories] : categories
  const existingSet = new Set(existingItemIds)

  const [activeTab,   setActiveTab] = useState(TABS[0] ?? '')
  const [cart,        setCart]      = useState<Map<string, CartEntry>>(new Map())
  const [noteFor,     setNoteFor]   = useState<string | null>(null)
  const [saving,      setSaving]    = useState(false)
  const [showCart,    setShowCart]  = useState(false)

  const tabItems: MenuItem[] = activeTab === '⭐ Frecuentes'
    ? frequentIds.map(id => available.find(i => i.id === id)).filter(Boolean) as MenuItem[]
    : available.filter(i => (i.category?.name ?? 'Otros') === activeTab)

  const totalQty   = Array.from(cart.values()).reduce((s, v) => s + v.qty, 0)
  const totalPrice = Array.from(cart.entries()).reduce((s, [id, { qty }]) => {
    return s + (available.find(i => i.id === id)?.price ?? 0) * qty
  }, 0)

  const cartList = [...cart.entries()]
    .filter(([, v]) => v.qty > 0)
    .map(([id, entry]) => ({ id, item: available.find(i => i.id === id), ...entry }))
    .filter(r => r.item)

  const inc = (id: string) =>
    setCart(c => { const m = new Map(c); const p = m.get(id); m.set(id, { qty: (p?.qty ?? 0) + 1, notes: p?.notes ?? '' }); return m })
  const dec = (id: string) =>
    setCart(c => { const m = new Map(c); const p = m.get(id); if (!p || p.qty <= 1) m.delete(id); else m.set(id, { ...p, qty: p.qty - 1 }); return m })
  const setNote = (id: string, notes: string) =>
    setCart(c => { const m = new Map(c); const p = m.get(id); if (p) m.set(id, { ...p, notes }); return m })

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const items = cartList.map(({ id, qty, notes }) => ({ itemId: id, qty, notes }))
      await onAdd(items)
      onClose()
    } finally { setSaving(false) }
  }

  // Slug de categoría activa (para colorear la tab activa)
  const activeSlug = tabItems[0]?.category?.slug

  return (
    <div className="fixed inset-0 bg-ink/70 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-card shadow-brand-lg w-full max-w-lg flex flex-col"
        style={{ height: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-calipso-100 flex-shrink-0">
          <UtensilsCrossed size={20} className="text-calipso flex-shrink-0" />
          <span className="font-display font-semibold text-ink italic flex-1 text-lg">Agregar platos</span>
          {totalQty > 0 && (
            <button
              onClick={() => setShowCart(v => !v)}
              className="flex items-center gap-1.5 bg-calipso text-white text-sm font-bold px-3 py-1.5 rounded-full tabular-nums hover:bg-calipso-700 transition-colors"
            >
              {totalQty} · {fmtCLP(totalPrice)}
              <ChevronDown size={13} className={clsx('transition-transform', showCart && 'rotate-180')} />
            </button>
          )}
          <button onClick={onClose} className="text-ink-secondary hover:text-ink p-2 ml-1">
            <X size={24} />
          </button>
        </div>

        {/* ── Resumen del carrito (desplegable) ── */}
        {showCart && totalQty > 0 && (
          <div className="border-b border-calipso-100 bg-calipso-50/60 px-4 py-3 flex-shrink-0 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary mb-2">Revisión del pedido</p>
            {cartList.map(({ id, item, qty, notes }) => (
              <div key={id} className="flex items-center gap-3 bg-white rounded-input px-3 py-2.5 shadow-sm">
                {/* Qty badge */}
                <span
                  className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: catColor(item?.category?.slug) }}
                >
                  {qty}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-ink truncate">{item?.name}</p>
                  {notes && <p className="text-xs text-amber-700 italic truncate">📝 {notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-ink-secondary tabular-nums">
                    {fmtCLP((item?.price ?? 0) * qty)}
                  </span>
                  <button
                    onClick={() => { for (let i = 0; i < qty; i++) dec(id) }}
                    className="w-8 h-8 rounded-full border-2 border-coral/40 text-coral flex items-center justify-center hover:bg-coral-light"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs de categoría (coloreadas) ── */}
        <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-3 border-b border-calipso-100 flex-shrink-0">
          {TABS.map(tab => {
            const isFav    = tab === '⭐ Frecuentes'
            const slug     = isFav ? undefined : available.find(i => i.category?.name === tab)?.category?.slug
            const isActive = activeTab === tab
            const color    = catColor(slug)
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setNoteFor(null); setShowCart(false) }}
                className={clsx(
                  'flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border-2',
                  isActive ? 'text-white shadow-brand border-transparent' : 'bg-white text-ink-secondary hover:bg-gray-50 border-gray-100',
                )}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
              >
                {isFav && <Star size={12} className="fill-current" />}
                {isFav ? 'Frecuentes' : tab}
              </button>
            )
          })}
        </div>

        {/* ── Grid de platos ── */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start">
          {tabItems.map(item => {
            const entry    = cart.get(item.id)
            const qty      = entry?.qty ?? 0
            const notes    = entry?.notes ?? ''
            const sel      = qty > 0
            const slug     = item.category?.slug
            const color    = catColor(slug)
            const selBg    = catSelBg(slug)
            const already  = existingSet.has(item.id)   // ya está en la comanda
            const allergens = (item.allergens ?? []).filter(a => ALLERGEN_EMOJI[a])

            return (
              <div key={item.id}>
                {/* ── Tarjeta del plato ── */}
                <button
                  onClick={() => inc(item.id)}
                  className={clsx(
                    'relative w-full rounded-card border text-left transition-all active:scale-95 flex flex-col justify-between gap-1.5 overflow-hidden',
                    sel ? 'shadow-brand-md' : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm',
                  )}
                  style={{
                    minHeight: 120,
                    padding: '12px 12px 10px 14px',
                    backgroundColor: sel ? selBg : undefined,
                    borderColor:     sel ? color : undefined,
                    borderLeftWidth: '4px',
                    borderLeftColor: color,
                  }}
                >
                  {/* Qty bubble */}
                  {qty > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[28px] h-7 px-1.5 text-white text-sm font-bold rounded-full flex items-center justify-center shadow leading-none"
                      style={{ backgroundColor: color }}
                    >
                      {qty}
                    </span>
                  )}

                  {/* Badge "ya en comanda" */}
                  {already && qty === 0 && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                      ya pedido
                    </span>
                  )}

                  {/* Nombre */}
                  <p
                    className="text-base font-bold leading-tight pr-2"
                    style={{ color: sel ? color : '#1a1a1a' }}
                  >
                    {item.name}
                  </p>

                  {/* Precio */}
                  <p
                    className="text-base font-semibold"
                    style={{ color: sel ? color : '#666' }}
                  >
                    {fmtCLP(item.price)}
                  </p>

                  {/* Alérgenos */}
                  {allergens.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {allergens.map(a => (
                        <span
                          key={a}
                          title={ALLERGEN_LABEL[a]}
                          className="text-[11px] bg-black/5 rounded px-1 py-0.5 leading-none"
                        >
                          {ALLERGEN_EMOJI[a]}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {/* Controles (visibles cuando está seleccionado) */}
                {sel && (
                  <div className="flex items-center gap-1.5 mt-2 px-0.5">
                    <button
                      onClick={() => dec(item.id)}
                      className="w-11 h-11 rounded-full border-2 border-coral/40 text-coral flex items-center justify-center hover:bg-coral-light transition-colors flex-shrink-0"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={() => setNoteFor(noteFor === item.id ? null : item.id)}
                      className={clsx(
                        'flex-1 text-sm rounded-input px-2 py-2.5 text-left truncate transition-colors border',
                        notes
                          ? 'text-amber-700 bg-amber-50 font-medium border-amber-200'
                          : 'text-ink-secondary bg-white hover:bg-calipso-50 border-gray-100'
                      )}
                    >
                      {notes ? `📝 ${notes}` : '+ nota cocina'}
                    </button>
                  </div>
                )}

                {/* Input de nota inline */}
                {sel && noteFor === item.id && (
                  <input
                    autoFocus
                    type="text"
                    placeholder="sin sal, término medio…"
                    value={notes}
                    onChange={e => setNote(item.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setNoteFor(null) }}
                    className="mt-2 w-full text-base border border-amber-300 bg-amber-50 rounded-input px-3 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                )}
              </div>
            )
          })}

          {tabItems.length === 0 && (
            <p className="col-span-2 text-center text-ink-secondary text-base py-12">
              Sin platos disponibles aquí
            </p>
          )}
        </div>

        {/* ── Footer: leyenda alérgenos + CTA ── */}
        <div className="border-t border-calipso-100 flex-shrink-0 bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {/* Leyenda de alérgenos (solo si hay platos con alérgenos en la tab activa) */}
          {tabItems.some(i => (i.allergens ?? []).length > 0) && (
            <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
              {Array.from(new Set(tabItems.flatMap(i => i.allergens ?? []).filter(a => ALLERGEN_EMOJI[a]))).map(a => (
                <span key={a} className="text-xs text-ink-secondary flex items-center gap-1">
                  {ALLERGEN_EMOJI[a]} {ALLERGEN_LABEL[a]}
                </span>
              ))}
            </div>
          )}

          {/* Botón confirmar */}
          <div className="px-4 pb-4 pt-3">
            <button
              onClick={handleConfirm}
              disabled={totalQty === 0 || saving}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-5 rounded-input text-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: totalQty > 0 ? catColor(activeSlug) : '#29B5D0' }}
            >
              {saving
                ? <RefreshCw size={20} className="animate-spin" />
                : <Send size={20} />
              }
              {totalQty > 0
                ? `Agregar ${totalQty} ítem${totalQty !== 1 ? 's' : ''} · ${fmtCLP(totalPrice)}`
                : 'Selecciona platos'
              }
            </button>
          </div>
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
        <div className="flex items-center gap-3 px-5 py-5 border-b border-calipso-100">
          <Receipt size={22} className="text-[#3B6D11]" />
          <span className="font-display font-semibold text-ink italic text-xl flex-1">Cobrar Mesa {order.table?.number}</span>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink p-1"><X size={24} /></button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Total */}
          <div className="bg-calipso-50 rounded-card px-4 py-4 flex items-center justify-between">
            <span className="text-base font-semibold text-ink">Total a cobrar</span>
            <span className="text-3xl font-bold text-ink tabular-nums">{fmtCLP(order.total)}</span>
          </div>

          {/* Items summary */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {(order.items ?? []).map(item => (
              <div key={item.id} className="flex justify-between text-sm text-ink-secondary">
                <span className="truncate mr-2">{item.menu_item?.name} ×{item.quantity}</span>
                <span className="tabular-nums flex-shrink-0">{fmtCLP(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-ink-secondary mb-3">Método de pago</p>
            <div className="grid grid-cols-2 gap-2.5">
              {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={clsx(
                    'flex items-center gap-2.5 px-4 py-4 rounded-input border-2 text-base font-bold transition-all',
                    method === id
                      ? 'border-[#3B6D11] bg-[#D4EDDA] text-[#3B6D11]'
                      : 'border-calipso-100 text-ink hover:border-calipso/40'
                  )}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash change calculator */}
          {method === 'efectivo' && (
            <div className="space-y-2.5">
              <p className="text-sm font-bold uppercase tracking-wider text-ink-secondary">Monto recibido</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary text-base font-semibold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={received}
                  onChange={e => setReceived(e.target.value)}
                  className="w-full pl-9 pr-4 py-4 text-base border border-calipso-100 rounded-input focus:outline-none focus:ring-2 focus:ring-calipso tabular-nums"
                />
              </div>
              {change !== null && (
                <div className={clsx(
                  'flex justify-between items-center px-4 py-3 rounded-input text-base font-bold',
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
        <div className="px-5 pb-6">
          <button
            onClick={handleConfirm}
            disabled={!method || loading || (method === 'efectivo' && change !== null && change < 0)}
            className="w-full flex items-center justify-center gap-2.5 bg-[#3B6D11] disabled:opacity-50 text-white font-bold py-5 rounded-input text-lg transition-colors hover:bg-[#2D5509]"
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── OrderPanel ────────────────────────────────────────────────────────────────

function OrderPanel({ table, order, menuItems, waiters, frequentIds, onRefresh }: {
  table: Table; order?: Order; menuItems: MenuItem[]; waiters: Waiter[]; frequentIds: string[]; onRefresh: () => void
}) {
  const [showAdd,        setShowAdd]        = useState(false)
  const [showPayment,    setShowPayment]    = useState(false)
  const [showCancel,     setShowCancel]     = useState(false)
  const [showPreview,    setShowPreview]    = useState(false)
  const [editNotes,      setEditNotes]      = useState(false)
  const [notesValue,     setNotesValue]     = useState(order?.notes ?? '')
  const [loading,        setLoading]        = useState<string | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [selectedWaiter, setSelectedWaiter] = useState('')
  const notesRef   = useRef<HTMLInputElement>(null)
  const printWinRef = useRef<Window | null>(null)

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

  // No order → free table: select waiter then open
  if (!order) {
    return (
      <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
        {/* Mesa info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-calipso-50 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed size={30} className="text-calipso" />
          </div>
          <div>
            <p className="font-display italic text-2xl text-ink font-bold">Mesa {table.number} — Libre</p>
            <p className="text-base text-ink-secondary">{table.capacity} personas · {LOC_LABEL[table.location]}</p>
          </div>
        </div>

        {/* Waiter selector */}
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-secondary mb-4">
            <User2 size={14} /> ¿Quién atiende esta mesa?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {waiters.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWaiter(w.name)}
                className={clsx(
                  'px-4 py-4 rounded-card text-base font-bold border-2 transition-all text-left flex items-center gap-3',
                  selectedWaiter === w.name
                    ? 'border-calipso bg-calipso text-white shadow-brand-md'
                    : 'border-calipso-100 text-ink hover:border-calipso/40 bg-white'
                )}
              >
                <span className={clsx(
                  'inline-flex w-9 h-9 rounded-full items-center justify-center text-xs font-bold flex-shrink-0',
                  selectedWaiter === w.name ? 'bg-white/20 text-white' : 'bg-calipso-50 text-calipso'
                )}>
                  {w.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                </span>
                <span className="truncate">{w.name}</span>
              </button>
            ))}
          </div>
          {waiters.length === 0 && (
            <p className="text-sm text-ink-secondary italic">
              No hay garzones activos. Configúralos en{' '}
              <a href="/admin/garzones" className="text-calipso underline">Garzones</a>.
            </p>
          )}
        </div>

        {/* Open order */}
        <button
          onClick={() => wrap('create', async () => { await createOrder(table.id, selectedWaiter || undefined) })}
          disabled={loading === 'create' || (waiters.length > 0 && !selectedWaiter)}
          className="flex items-center justify-center gap-3 bg-calipso text-white px-6 py-5 rounded-input text-lg font-bold hover:bg-calipso-700 transition-colors disabled:opacity-50"
        >
          {loading === 'create' ? <RefreshCw size={20} className="animate-spin" /> : <Plus size={20} />}
          {selectedWaiter ? `Abrir comanda — ${selectedWaiter.split(' ')[0]}` : 'Abrir comanda'}
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

  const handleAddItems = async (items: { itemId: string; qty: number; notes: string }[]) => {
    for (const { itemId, qty, notes } of items) {
      await addOrderItem(order.id, itemId, qty, notes)
    }
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
      void method
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display font-bold text-ink text-2xl italic">
                Mesa {table.number}
                <span className="text-ink-secondary font-normal text-base ml-2 not-italic">
                  {LOC_LABEL[table.location]}
                </span>
              </h2>
              <span className={clsx(
                'text-sm font-bold px-3 py-1 rounded-full',
                STATUS_CFG[order.status].badge
              )}>
                {STATUS_CFG[order.status].label}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-base text-ink-secondary">
                Abierta hace <span className="font-bold">{elapsed(order.created_at)}</span>
                {elapsedMin(order.created_at) > 40 && (
                  <span className="text-coral font-bold ml-2">⚠ Tiempo excedido</span>
                )}
              </p>
              {order.waiter_name && (
                <span className="inline-flex items-center gap-1.5 text-sm bg-calipso-50 text-calipso font-bold px-2.5 py-1 rounded-full">
                  <User2 size={12} /> {order.waiter_name}
                </span>
              )}
            </div>
          </div>
          <Link to="/admin/cocina" target="_blank"
            className="flex items-center gap-1 text-sm text-calipso hover:underline flex-shrink-0 mt-1">
            Cocina <ExternalLink size={13} />
          </Link>
        </div>

        {/* Progress bar */}
        {activeItems.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-ink-secondary mb-1.5">
              <span>Progreso cocina</span>
              <span className="tabular-nums font-bold">{readyCount}/{activeItems.length} listos</span>
            </div>
            <div className="h-2.5 bg-calipso-50 rounded-full overflow-hidden">
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
                className="flex-1 text-base border border-calipso-100 rounded-input px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-calipso"
              />
              <button onClick={handleSaveNotes} disabled={loading === 'notes'}
                className="text-sm bg-calipso text-white px-4 py-2.5 rounded-input font-bold hover:bg-calipso-700">
                {loading === 'notes' ? <RefreshCw size={14} className="animate-spin" /> : 'Guardar'}
              </button>
              <button onClick={() => setEditNotes(false)} className="text-ink-secondary hover:text-ink p-2">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditNotes(true)}
              className="flex items-center gap-2 text-sm text-ink-secondary hover:text-calipso transition-colors group"
            >
              <Pencil size={13} />
              {order.notes
                ? <span className="italic text-ink text-sm">{order.notes}</span>
                : <span className="group-hover:underline">Agregar nota a la comanda</span>
              }
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-coral-light text-coral text-base px-4 py-3 rounded-input">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Items — grouped by status */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-calipso-50/30">
        {items.length === 0 && (
          <div className="text-center py-12">
            <UtensilsCrossed size={36} className="text-calipso/30 mx-auto mb-3" />
            <p className="text-base text-ink-secondary">Comanda vacía — agrega platos</p>
          </div>
        )}

        {groups.map(status => {
          const groupItems = items.filter(i => i.status === status)
          if (groupItems.length === 0) return null
          const cfg  = ITEM_CFG[status]
          const Icon = cfg.Icon
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2.5">
                <Icon size={15} className={cfg.cls} />
                <span className={clsx('text-sm font-bold uppercase tracking-wider', cfg.cls)}>
                  {cfg.label} ({groupItems.length})
                </span>
              </div>

              <div className="space-y-2">
                {groupItems.map(item => (
                  <div
                    key={item.id}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-4 rounded-input transition-colors',
                      status === 'delivered'
                        ? 'opacity-40'
                        : status === 'ready'
                          ? 'bg-[#D4EDDA]/60 border border-[#3B6D11]/20'
                          : 'bg-white border border-calipso-50 shadow-sm'
                    )}
                  >
                    {/* Qty stepper (only for pending) */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleQtyChange(item, -1)}
                            disabled={!!loading}
                            className="w-10 h-10 rounded-full border-2 border-calipso/30 text-calipso flex items-center justify-center hover:bg-calipso hover:text-white transition-colors disabled:opacity-40"
                          >
                            {(loading === `remove-${item.id}` || loading === `qty-${item.id}`)
                              ? <RefreshCw size={13} className="animate-spin" />
                              : <Minus size={16} />}
                          </button>
                          <span className="text-xl font-bold text-ink w-8 text-center tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => handleQtyChange(item, 1)}
                            disabled={!!loading}
                            className="w-10 h-10 rounded-full bg-calipso text-white flex items-center justify-center hover:bg-calipso-700 transition-colors disabled:opacity-40"
                          >
                            <Plus size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-ink-secondary w-12 tabular-nums">×{item.quantity}</span>
                      )}
                    </div>

                    {/* Name + notes */}
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-base font-bold text-ink leading-snug',
                        status === 'delivered' && 'line-through text-ink-secondary'
                      )}>
                        {item.menu_item?.name ?? item.menu_item_id}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-amber-600 italic mt-0.5">📝 {item.notes}</p>
                      )}
                    </div>

                    {/* Price */}
                    <span className="text-base font-bold text-ink tabular-nums flex-shrink-0">
                      {fmtCLP(item.unit_price * item.quantity)}
                    </span>

                    {/* Actions */}
                    {status === 'ready' && (
                      <button
                        onClick={() => wrap(`deliver-${item.id}`, () => updateOrderItemStatus(item.id, 'delivered'))}
                        disabled={loading === `deliver-${item.id}`}
                        className="text-sm font-bold text-[#3B6D11] hover:bg-[#3B6D11] hover:text-white px-3 py-2.5 rounded-input transition-colors flex-shrink-0 border-2 border-[#3B6D11]/40 min-h-[44px] flex items-center"
                        title="Marcar entregado"
                      >
                        {loading === `deliver-${item.id}` ? <RefreshCw size={13} className="animate-spin" /> : 'Entregar'}
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
      <div className="border-t border-calipso-100 bg-white px-4 py-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base text-ink-secondary font-medium">Total comanda</span>
            {hasPending && <span className="text-sm text-ink-secondary/60 ml-2">(incl. pendientes)</span>}
          </div>
          <span className="text-3xl font-bold text-ink tabular-nums">{fmtCLP(order.total)}</span>
        </div>

        {/* ── Botón: Agregar platos (siempre visible) */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-calipso text-calipso text-base font-bold px-4 py-3.5 rounded-input hover:bg-calipso hover:text-white transition-colors"
        >
          <Plus size={18} /> Agregar platos
        </button>

        {/* ── Botón: Ver comanda y enviar a cocina */}
        {hasPending && order.status !== 'ready' && (
          <button
            onClick={() => {
              // window.open debe estar en el click handler síncrono (evita bloqueador de popups)
              printWinRef.current = window.open('', '_blank', 'width=420,height=620,toolbar=no,menubar=no,location=no,status=no')
              setShowPreview(true)
            }}
            disabled={loading === 'kitchen'}
            className="w-full flex items-center justify-center gap-3 bg-amber-500 text-white text-lg font-bold px-4 py-4 rounded-input hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {loading === 'kitchen' ? <RefreshCw size={20} className="animate-spin" /> : <Eye size={20} />}
            Ver comanda y enviar
          </button>
        )}

        {/* ── Botón: Cobrar (grande, destacado) */}
        {(allDelivered || readyCount > 0) && !hasPending && (
          <button
            onClick={() => setShowPayment(true)}
            className="w-full flex items-center justify-center gap-3 bg-[#3B6D11] text-white text-lg font-bold px-4 py-4 rounded-input hover:bg-[#2D5509] transition-colors"
          >
            <CreditCard size={20} /> Cobrar mesa
          </button>
        )}

        {/* ── Cancelar comanda (pequeño, al fondo) */}
        {!showCancel ? (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-coral font-semibold py-2.5 rounded-input hover:bg-coral-light transition-colors"
          >
            <Ban size={14} /> Cancelar comanda
          </button>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-coral-light/60 rounded-input">
            <span className="flex-1 text-sm font-bold text-coral">¿Cancelar esta comanda?</span>
            <button
              onClick={handleCancel}
              disabled={loading === 'cancel'}
              className="text-sm bg-coral text-white font-bold px-5 py-2.5 rounded-input hover:bg-coral-hover transition-colors"
            >
              {loading === 'cancel' ? <RefreshCw size={13} className="animate-spin" /> : 'Sí, cancelar'}
            </button>
            <button onClick={() => setShowCancel(false)}
              className="text-sm border-2 border-calipso-100 px-5 py-2.5 rounded-input hover:bg-calipso-50 transition-colors text-ink-secondary font-semibold">
              No
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <POSGrid
          menuItems={menuItems}
          frequentIds={frequentIds}
          existingItemIds={items.map(i => i.menu_item_id)}
          onAdd={handleAddItems}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showPayment && (
        <PaymentModal order={order} onConfirm={handlePayment} onClose={() => setShowPayment(false)} />
      )}
      {showPreview && (
        <ComandaPreview
          order={order}
          table={table}
          pendingItems={items.filter(i => i.status === 'pending')}
          onConfirm={async () => {
            const pendingSnapshot = items.filter(i => i.status === 'pending')
            const pw = printWinRef.current
            wrap('kitchen', async () => {
              await sendOrderToKitchen(order.id)
              if (pw) {
                pw.document.write(buildTicketHTML(order, table, pendingSnapshot, order.waiter_name ?? undefined))
                pw.document.close()
              }
            })
            setShowPreview(false)
          }}
          onClose={() => {
            printWinRef.current?.close()
            printWinRef.current = null
            setShowPreview(false)
          }}
        />
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
        <p className="font-display italic text-xl text-ink">Sin comandas cerradas hoy</p>
        <p className="text-base text-ink-secondary mt-1">Las comandas cobradas o canceladas aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cobradas',       value: closed.filter(o => o.status === 'paid').length,      color: 'text-[#3B6D11]' },
          { label: 'Canceladas',     value: closed.filter(o => o.status === 'cancelled').length,  color: 'text-coral' },
          { label: 'Total recaudado',value: fmtCLP(totalRevenue),                                 color: 'text-calipso' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-card p-4 shadow-brand text-center">
            <p className={clsx('text-2xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-sm text-ink-secondary mt-1">{label}</p>
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
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-calipso-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-base">Mesa {order.table?.number ?? '—'}</span>
                    <span className={clsx(
                      'text-sm font-bold px-2.5 py-0.5 rounded-full',
                      STATUS_CFG[order.status].badge
                    )}>
                      {STATUS_CFG[order.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {items.length} ítem{items.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(order.updated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    {order.notes && <span className="ml-2 italic">· {order.notes}</span>}
                  </p>
                </div>
                <span className="font-bold text-ink tabular-nums text-base flex-shrink-0">
                  {fmtCLP(order.total)}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-ink-secondary flex-shrink-0" /> : <ChevronDown size={16} className="text-ink-secondary flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 space-y-1.5 bg-calipso-50/40">
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

// ── DishRegistry ──────────────────────────────────────────────────────────────

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
        <div className="flex rounded-input border border-calipso-100 overflow-hidden">
          {(['hoy', 'todo'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                'px-5 py-2.5 text-sm font-bold transition-colors',
                period === p ? 'bg-calipso text-white' : 'text-ink-secondary hover:bg-calipso-50'
              )}
            >
              {p === 'hoy' ? 'Hoy' : 'Todo el período'}
            </button>
          ))}
        </div>

        <div className="flex rounded-input border border-calipso-100 overflow-hidden">
          {(['qty', 'revenue'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={clsx(
                'px-5 py-2.5 text-sm font-bold transition-colors',
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
          { label: 'Platos vendidos',  value: totalQty,         cls: 'text-ink' },
          { label: 'Líneas de pedido', value: totalOrders,      cls: 'text-calipso' },
          { label: 'Ingreso total',    value: fmtCLP(totalRev), cls: 'text-[#3B6D11]' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-card p-4 shadow-brand text-center">
            <p className={clsx('text-2xl font-bold tabular-nums', cls)}>{value}</p>
            <p className="text-sm text-ink-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={40} className="text-calipso/30 mb-4" />
          <p className="font-display italic text-xl text-ink">Sin datos para el período</p>
          <p className="text-base text-ink-secondary mt-1">
            Los platos pedidos aparecerán aquí una vez que haya comandas.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-brand overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5.5rem_7rem] gap-2 px-5 py-3 bg-calipso-50 border-b border-calipso-100">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">#</span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Plato</span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary text-right">Unidades</span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary text-right">Pedidos</span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary text-right">Ingresos</span>
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
                <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5.5rem_7rem] gap-2 items-center px-5 py-3.5">
                  <span className={clsx('text-sm font-bold tabular-nums', rankColor)}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-ink truncate">{dish.name}</p>
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
                  <span className={clsx(
                    'text-sm font-bold tabular-nums text-right',
                    sortBy === 'qty' ? 'text-ink' : 'text-ink-secondary'
                  )}>
                    {dish.qty}
                  </span>
                  <span className="text-sm text-ink-secondary tabular-nums text-right">
                    {dish.orders}
                  </span>
                  <span className={clsx(
                    'text-sm font-bold tabular-nums text-right',
                    sortBy === 'revenue' ? 'text-[#3B6D11]' : 'text-ink-secondary'
                  )}>
                    {fmtCLP(dish.revenue)}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Footer total */}
          <div className="grid grid-cols-[2.5rem_1fr_5.5rem_5.5rem_7rem] gap-2 items-center px-5 py-3.5 bg-calipso-50 border-t border-calipso-100">
            <span />
            <span className="text-sm font-bold text-ink uppercase tracking-wide">Total</span>
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
  const [waiters,        setWaiters]        = useState<Waiter[]>([])
  const [selectedTable,  setSelectedTable]  = useState<string | null>(null)
  const [view,           setView]           = useState<'mesas' | 'historial' | 'registro'>('mesas')
  const [loading,        setLoading]        = useState(true)
  const [countdown,      setCountdown]      = useState(30)
  const countRef = useRef(30)

  const load = useCallback(async () => {
    const [t, o, m, all, w] = await Promise.all([
      getTables(), getActiveOrders(), getAllMenuItems(), getAllOrders(), getWaiters(),
    ])
    setTables(t)
    setOrders(o)
    setMenuItems(m)
    setAllOrders(all)
    setWaiters(w)
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

  // Platos más pedidos — para tab Frecuentes en el POSGrid
  const frequentIds = useMemo(() => {
    const counts = new Map<string, number>()
    for (const order of allOrders.filter(o => o.status !== 'cancelled')) {
      for (const item of (order.items ?? [])) {
        counts.set(item.menu_item_id, (counts.get(item.menu_item_id) ?? 0) + item.quantity)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id)
  }, [allOrders])

  // Envío rápido desde la TableCard
  const handleQuickSend = useCallback(async (order: Order) => {
    const pendingItems = (order.items ?? []).filter(i => i.status === 'pending')
    if (!pendingItems.length || !order.table) return
    const printWin = window.open('', '_blank', 'width=420,height=620,toolbar=no,menubar=no,location=no,status=no')
    try {
      await sendOrderToKitchen(order.id)
      if (printWin) {
        printWin.document.write(buildTicketHTML(order, order.table, pendingItems, order.waiter_name ?? undefined))
        printWin.document.close()
      }
      await load()
    } catch { printWin?.close() }
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
            <span className="text-base text-ink-secondary">
              <span className="font-bold text-ink tabular-nums">{activeCount}</span> mesa{activeCount !== 1 ? 's' : ''} activa{activeCount !== 1 ? 's' : ''}
            </span>
            {inKitchenCount > 0 && (
              <span className="text-base text-amber-600 font-bold">
                · {inKitchenCount} en cocina
              </span>
            )}
            {readyCount > 0 && (
              <span className="text-base text-[#3B6D11] font-bold">
                · {readyCount} listo{readyCount !== 1 ? 's' : ''}
              </span>
            )}
            {totalRevenue > 0 && (
              <span className="text-base text-ink-secondary">
                · <span className="font-bold text-calipso tabular-nums">{fmtCLP(totalRevenue)}</span> en curso
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/cocina" target="_blank"
            className="flex items-center gap-1.5 border border-calipso text-calipso text-sm font-bold px-4 py-2.5 rounded-input hover:bg-calipso hover:text-white transition-colors"
          >
            <ChefHat size={15} /> Panel Cocina
          </Link>
          <button
            onClick={load}
            className="flex items-center gap-1.5 border border-calipso-100 text-ink-secondary text-sm px-4 py-2.5 rounded-input hover:bg-calipso-50 transition-colors"
          >
            <RefreshCw size={14} /> {countdown}s
          </button>
        </div>
      </div>

      {/* ── View tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 border-b border-calipso-100 flex-shrink-0">
        {[
          { id: 'mesas',     label: 'Mesas',             Icon: TableProperties },
          { id: 'historial', label: 'Historial del día',  Icon: History },
          { id: 'registro',  label: 'Registro de platos', Icon: BarChart2 },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id as 'mesas' | 'historial' | 'registro')}
            className={clsx(
              'flex items-center gap-2 px-5 py-3.5 text-base font-bold border-b-2 -mb-px transition-colors',
              view === id
                ? 'border-calipso text-calipso'
                : 'border-transparent text-ink-secondary hover:text-ink'
            )}
          >
            <Icon size={17} /> {label}
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
          <div className="w-64 flex-shrink-0 overflow-y-auto space-y-4">
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
                        onQuickSend={orderByTable[t.id] ? () => handleQuickSend(orderByTable[t.id]) : undefined}
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
                waiters={waiters}
                frequentIds={frequentIds}
                onRefresh={load}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <TableProperties size={40} className="text-calipso/30 mb-4" />
                <p className="font-display italic text-xl text-ink">Selecciona una mesa</p>
                <p className="text-base text-ink-secondary mt-1">Haz clic en cualquier mesa del plano para ver su comanda.</p>
                {activeCount > 0 && (
                  <button
                    onClick={() => setSelectedTable(orders[0].table_id)}
                    className="mt-5 flex items-center gap-2 text-base text-calipso hover:underline font-semibold"
                  >
                    Ir a la primera mesa activa <ArrowRight size={16} />
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
