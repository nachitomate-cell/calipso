import { useState, useEffect, useRef } from 'react'
import { getInventory, upsertInventoryItem } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import {
  Package, Search, AlertTriangle, CheckCircle2, XCircle,
  Edit2, Check, X, RefreshCw, TrendingDown, Filter,
} from 'lucide-react'
import type { InventoryItem } from '../../types'

// ── helpers ───────────────────────────────────────────────────────────────────

type StockStatus = 'ok' | 'low' | 'out'

function getStatus(inv: InventoryItem): StockStatus {
  if (inv.stock_quantity === 0) return 'out'
  if (inv.stock_quantity < inv.min_stock) return 'low'
  return 'ok'
}

function fmtCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG: Record<StockStatus, { label: string; cls: string; icon: React.ElementType }> = {
  ok:  { label: 'OK',        cls: 'bg-[#D4EDDA] text-[#3B6D11]',   icon: CheckCircle2 },
  low: { label: 'Bajo',      cls: 'bg-amber-50 text-amber-700',     icon: AlertTriangle },
  out: { label: 'Sin stock', cls: 'bg-coral-light text-coral-dark', icon: XCircle },
}

// ── Inline edit cell ──────────────────────────────────────────────────────────

function EditableQty({
  inv, onSave,
}: {
  inv: InventoryItem
  onSave: (id: string, qty: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(inv.stock_quantity))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setValue(String(inv.stock_quantity))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 50)
  }

  const cancel = () => { setEditing(false); setValue(String(inv.stock_quantity)) }

  const save = async () => {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) { cancel(); return }
    setSaving(true)
    try { await onSave(inv.id, qty) } finally { setSaving(false); setEditing(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          className="w-20 border border-calipso rounded-input px-2 py-1 text-sm text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-calipso"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saving}
          className="p-1 rounded text-[#3B6D11] hover:bg-[#D4EDDA] transition-colors"
          aria-label="Guardar"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button
          onClick={cancel}
          className="p-1 rounded text-coral hover:bg-coral-light transition-colors"
          aria-label="Cancelar"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-2 group text-left"
      title="Clic para editar"
    >
      <span className="text-sm font-semibold text-ink tabular-nums">
        {inv.stock_quantity} <span className="font-normal text-ink-secondary">{inv.unit}</span>
      </span>
      <Edit2 size={12} className="text-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ── Stock progress bar ────────────────────────────────────────────────────────

function StockBar({ inv }: { inv: InventoryItem }) {
  const status = getStatus(inv)
  const pct = inv.min_stock > 0
    ? Math.min((inv.stock_quantity / (inv.min_stock * 2)) * 100, 100)
    : 100
  const color = status === 'ok' ? '#3B6D11' : status === 'low' ? '#D97706' : '#E8593C'

  return (
    <div className="w-24">
      <div className="h-1.5 rounded-full bg-calipso-50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'low' | 'out'

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setInventory(await getInventory())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (id: string, qty: number) => {
    const inv = inventory.find(i => i.id === id)
    if (!inv) return
    try {
      const updated = await upsertInventoryItem({ ...inv, stock_quantity: qty })
      setInventory(prev => prev.map(i => i.id === id
        ? { ...updated, menu_item: i.menu_item }
        : i
      ))
      setSaved(id)
      setTimeout(() => setSaved(null), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
      setTimeout(() => setError(null), 4000)
    }
  }

  const filtered = inventory.filter(inv => {
    const s = getStatus(inv)
    if (filter === 'low' && s !== 'low') return false
    if (filter === 'out' && s !== 'out') return false
    if (search && !inv.menu_item?.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: inventory.length,
    low: inventory.filter(i => getStatus(i) === 'low').length,
    out: inventory.filter(i => getStatus(i) === 'out').length,
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'Todos',      count: counts.all },
    { key: 'low', label: 'Bajo stock', count: counts.low },
    { key: 'out', label: 'Sin stock',  count: counts.out },
  ]

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink font-bold italic">Inventario</h1>
          <p className="text-ink-secondary text-sm mt-0.5">Control de stock por producto</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-calipso hover:underline"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Productos',    value: counts.all,                                  color: 'text-ink',     bg: 'bg-white' },
          { label: 'Stock OK',     value: counts.all - counts.low - counts.out,        color: 'text-[#3B6D11]', bg: 'bg-[#D4EDDA]' },
          { label: 'Bajo mínimo', value: counts.low,                                  color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Sin stock',    value: counts.out,                                  color: 'text-coral',   bg: 'bg-coral-light' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-card px-4 py-3 shadow-brand`}>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-ink-secondary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Alerts banner */}
      {(counts.out > 0 || counts.low > 0) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-card px-4 py-3">
          <TrendingDown size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {counts.out > 0 && (
              <><strong>{counts.out} producto{counts.out !== 1 ? 's' : ''}</strong> sin stock.{' '}</>
            )}
            {counts.low > 0 && (
              <><strong>{counts.low} producto{counts.low !== 1 ? 's' : ''}</strong> bajo el mínimo recomendado.{' '}</>
            )}
            Haz clic en el número de stock para actualizar la cantidad.
          </p>
        </div>
      )}

      {/* Toast */}
      {error && (
        <div className="bg-coral-light border border-coral/20 text-coral-dark text-sm px-4 py-3 rounded-card flex items-center gap-2">
          <XCircle size={15} /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 p-1 bg-calipso-50 rounded-card">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-input text-sm font-medium transition-all duration-150 ${
                filter === tab.key
                  ? 'bg-white text-ink shadow-brand'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  tab.key === 'out' ? 'bg-coral-light text-coral' :
                  tab.key === 'low' ? 'bg-amber-100 text-amber-700' :
                  'bg-calipso-50 text-calipso'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            placeholder="Buscar producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-calipso-100 rounded-input bg-white focus:outline-none focus:ring-2 focus:ring-calipso w-60"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-brand overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Filter size={32} className="text-calipso-200 mx-auto mb-3" />
            <p className="text-ink-secondary text-sm">No hay productos con esos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-calipso-100 bg-calipso-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden md:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider">Stock actual</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden sm:table-cell">Nivel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden lg:table-cell">Mín.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden lg:table-cell">Costo unit.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider hidden xl:table-cell">Actualizado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-calipso-50">
                {filtered.map(inv => {
                  const status = getStatus(inv)
                  const { label: sLabel, cls: sCls, icon: SIcon } = STATUS_CONFIG[status]
                  const justSaved = saved === inv.id

                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${justSaved ? 'bg-[#D4EDDA]/30' : 'hover:bg-calipso-50/50'}`}
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-calipso flex-shrink-0" />
                          <span className="font-medium text-ink">
                            {inv.menu_item?.name ?? `Ítem ${inv.menu_item_id}`}
                          </span>
                          {justSaved && (
                            <CheckCircle2 size={13} className="text-[#3B6D11] flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-ink-secondary text-xs">
                          {inv.menu_item?.category?.name ?? '—'}
                        </span>
                      </td>

                      {/* Stock (editable) */}
                      <td className="px-4 py-3.5">
                        <EditableQty inv={inv} onSave={handleSave} />
                      </td>

                      {/* Progress bar */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <StockBar inv={inv} />
                      </td>

                      {/* Min stock */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-ink-secondary tabular-nums">
                          {inv.min_stock} {inv.unit}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="tabular-nums text-ink-secondary">
                          {fmtCLP(inv.cost_price)}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <span className="text-xs text-ink-secondary">{fmtDate(inv.updated_at)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${sCls}`}>
                          <SIcon size={10} />
                          {sLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-secondary text-center">
        Haz clic en la cantidad de stock para editarla inline · Enter para guardar · Esc para cancelar
      </p>
    </div>
  )
}
