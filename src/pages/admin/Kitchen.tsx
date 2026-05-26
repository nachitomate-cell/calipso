import { useState, useEffect, useCallback, useRef } from 'react'
import { getActiveOrders, updateOrderItemStatus, updateOrderStatus } from '../../lib/api'
import type { Order, OrderItem } from '../../types'
import { ChefHat, Clock, CheckCircle2, Bell, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function urgency(iso: string): 'ok' | 'warn' | 'urgent' {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins > 40) return 'urgent'
  if (mins > 20) return 'warn'
  return 'ok'
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onUpdate }: { order: Order; onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const urg = urgency(order.created_at)
  const items = (order.items ?? []).filter(i => i.status !== 'delivered')
  const allReady = items.length > 0 && items.every(i => i.status === 'ready')
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)

  const markItem = async (item: OrderItem, next: OrderItem['status']) => {
    setLoading(item.id)
    try { await updateOrderItemStatus(item.id, next); onUpdate() }
    finally { setLoading(null) }
  }

  const markOrderReady = async () => {
    setLoading('order')
    try { await updateOrderStatus(order.id, 'ready'); onUpdate() }
    finally { setLoading(null) }
  }

  return (
    <div className={clsx(
      'rounded-card border flex flex-col overflow-hidden',
      urg === 'urgent' ? 'border-coral/60 bg-[#1A1010]' :
      urg === 'warn'   ? 'border-amber-500/40 bg-[#1A1700]' :
                         'border-white/10 bg-[#0F1E20]'
    )}>
      {/* Card header */}
      <div className={clsx(
        'px-4 py-3 flex items-center justify-between',
        urg === 'urgent' ? 'bg-coral/15' :
        urg === 'warn'   ? 'bg-amber-500/10' :
                           'bg-white/5'
      )}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white tabular-nums">#{order.table?.number ?? order.table_id}</span>
          {order.table && (
            <span className="text-[10px] text-white/50 uppercase tracking-wide">{order.table.location}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {urg === 'urgent' && <AlertTriangle size={14} className="text-coral animate-pulse" />}
          <div className={clsx(
            'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
            urg === 'urgent' ? 'bg-coral/20 text-coral' :
            urg === 'warn'   ? 'bg-amber-500/20 text-amber-400' :
                               'bg-white/10 text-white/60'
          )}>
            <Clock size={10} />
            {elapsed(order.created_at)}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {items.map(item => {
          const isReady = item.status === 'ready'
          const isKitchen = item.status === 'in_kitchen'
          const isPending = item.status === 'pending'
          return (
            <div
              key={item.id}
              className={clsx(
                'flex items-start gap-3 p-2.5 rounded-input transition-all',
                isReady ? 'bg-[#0D2010] border border-[#3B6D11]/40' : 'border border-white/8'
              )}
            >
              {/* Checkbox / status */}
              <button
                onClick={() => {
                  if (isReady) return
                  markItem(item, isKitchen || isPending ? 'ready' : 'in_kitchen')
                }}
                disabled={loading === item.id || isReady}
                className={clsx(
                  'w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors border',
                  isReady   ? 'bg-[#3B6D11] border-[#3B6D11]' :
                  isKitchen ? 'border-amber-500 hover:bg-amber-500/20' :
                              'border-white/30 hover:border-white/60'
                )}
              >
                {loading === item.id
                  ? <RefreshCw size={10} className="text-white animate-spin" />
                  : isReady
                    ? <CheckCircle2 size={12} className="text-white" />
                    : null
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className={clsx(
                  'text-sm font-medium',
                  isReady ? 'text-white/40 line-through' : 'text-white'
                )}>
                  <span className="text-white/50 mr-1">×{item.quantity}</span>
                  {item.menu_item?.name ?? item.menu_item_id}
                </p>
                {item.notes && (
                  <p className="text-[10px] text-amber-400/80 italic mt-0.5">{item.notes}</p>
                )}
              </div>

              {/* Status label */}
              <span className={clsx(
                'text-[10px] font-semibold uppercase tracking-wide flex-shrink-0',
                isReady   ? 'text-[#3B6D11]' :
                isKitchen ? 'text-amber-400' :
                            'text-white/40'
              )}>
                {isReady ? '✓ Listo' : isKitchen ? 'Cocinando' : 'Nuevo'}
              </span>
            </div>
          )
        })}

        {items.length === 0 && (
          <p className="text-white/30 text-sm text-center py-2">Sin ítems pendientes</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="text-xs text-white/30 mb-2">
          {items.filter(i => i.status === 'ready').length}/{items.length} ítems listos
        </div>
        <div className="w-full bg-white/10 rounded-full h-1 mb-3">
          <div
            className="bg-[#3B6D11] h-1 rounded-full transition-all"
            style={{
              width: items.length > 0
                ? `${(items.filter(i => i.status === 'ready').length / items.length) * 100}%`
                : '0%'
            }}
          />
        </div>
        {allReady && (
          <button
            onClick={markOrderReady}
            disabled={loading === 'order'}
            className="w-full flex items-center justify-center gap-2 bg-[#3B6D11] hover:bg-[#2D5509] text-white text-sm font-semibold py-2.5 rounded-input transition-colors"
          >
            {loading === 'order'
              ? <RefreshCw size={14} className="animate-spin" />
              : <Bell size={14} />
            }
            Marcar lista — Avisar al mozo
          </button>
        )}
        {!allReady && mins > 5 && (
          <p className={clsx('text-xs text-center', urg === 'urgent' ? 'text-coral/70' : 'text-white/20')}>
            {urg === 'urgent' ? '⚠ Tiempo excedido' : 'En preparación…'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const countRef = useRef(30)

  const load = useCallback(async () => {
    const all = await getActiveOrders()
    // Kitchen only shows in_kitchen and open orders
    setOrders(all.filter(o => o.status === 'in_kitchen' || o.status === 'open'))
    setLoading(false)
    countRef.current = 30
    setCountdown(30)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      countRef.current -= 1
      setCountdown(countRef.current)
      if (countRef.current <= 0) { load() }
    }, 1000)
    return () => clearInterval(timer)
  }, [load])

  const urgentCount = orders.filter(o => urgency(o.created_at) === 'urgent').length

  return (
    <div className="min-h-screen bg-[#080F10] font-body">
      {/* Top bar */}
      <div className="bg-[#0F1E20] border-b border-white/8 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/admin/comandas" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat size={18} className="text-calipso" />
            <span className="font-display italic text-white font-bold">Panel de Cocina</span>
          </div>
          {urgentCount > 0 && (
            <span className="bg-coral text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {urgentCount} URGENTE{urgentCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-white/30">
            {orders.length} comanda{orders.length !== 1 ? 's' : ''} activa{orders.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualizar ({countdown}s)
          </button>
        </div>
      </div>

      {/* Orders grid */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={24} className="text-calipso animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle2 size={48} className="text-[#3B6D11] mb-4" />
            <p className="text-white font-display italic text-xl">Sin comandas pendientes</p>
            <p className="text-white/40 text-sm mt-2">La cocina está al día</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Urgent first, then by time */}
            {[...orders].sort((a, b) => {
              const ua = urgency(a.created_at) === 'urgent' ? 0 : urgency(a.created_at) === 'warn' ? 1 : 2
              const ub = urgency(b.created_at) === 'urgent' ? 0 : urgency(b.created_at) === 'warn' ? 1 : 2
              if (ua !== ub) return ua - ub
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            }).map(order => (
              <OrderCard key={order.id} order={order} onUpdate={load} />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="fixed bottom-4 left-4 flex items-center gap-4 text-[10px] text-white/30">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20" /> &lt;20 min</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 20-40 min</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-coral" /> &gt;40 min</span>
        <span className="text-white/15">· Haz clic en cada ítem para marcarlo listo</span>
      </div>
    </div>
  )
}
