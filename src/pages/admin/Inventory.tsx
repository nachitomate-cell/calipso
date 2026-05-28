import { useState, useEffect, useRef } from 'react'
import { getInventory, upsertInventoryItem, getInventoryByBarcode } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import {
  Package, Search, AlertTriangle, CheckCircle2, XCircle,
  Edit2, Check, X, RefreshCw, TrendingDown, Filter,
  Scan, Camera, CameraOff, Plus, Hash, ClipboardList, RotateCcw,
} from 'lucide-react'
import type { InventoryItem } from '../../types'
import clsx from 'clsx'

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

function itemDisplayName(inv: InventoryItem): string {
  return inv.menu_item?.name ?? inv.product_name ?? (inv.barcode ? `Cód. ${inv.barcode}` : `Ítem ${inv.id}`)
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

// ── Lista Tab ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'low' | 'out'

function ListaTab({
  inventory, onSave, saved, error,
}: {
  inventory: InventoryItem[]
  onSave: (id: string, qty: number) => Promise<void>
  saved: string | null
  error: string | null
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')

  const filtered = inventory.filter(inv => {
    const s = getStatus(inv)
    if (filter === 'low' && s !== 'low') return false
    if (filter === 'out' && s !== 'out') return false
    const name = itemDisplayName(inv).toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
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

  return (
    <div className="space-y-4">
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
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-calipso flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium text-ink">{itemDisplayName(inv)}</span>
                            {inv.barcode && (
                              <p className="text-[10px] text-ink-secondary font-mono">{inv.barcode}</p>
                            )}
                          </div>
                          {justSaved && (
                            <CheckCircle2 size={13} className="text-[#3B6D11] flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-ink-secondary text-xs">
                          {inv.menu_item?.category?.name ?? (inv.product_name ? 'Sin categoría' : '—')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <EditableQty inv={inv} onSave={onSave} />
                      </td>

                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <StockBar inv={inv} />
                      </td>

                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-ink-secondary tabular-nums">
                          {inv.min_stock} {inv.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="tabular-nums text-ink-secondary">
                          {fmtCLP(inv.cost_price)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <span className="text-xs text-ink-secondary">{fmtDate(inv.updated_at)}</span>
                      </td>

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

// ── Demo products (for presentation without scanner hardware) ─────────────────

const DEMO_PRODUCTS = [
  { barcode: '7801234000017', label: '🍹 Pisco Sour',   emoji: '🍹' },
  { barcode: '7801234000018', label: '🍷 Vino Blanco',  emoji: '🍷' },
  { barcode: '7801234000012', label: '🍚 Arroz Meloso', emoji: '🍚' },
  { barcode: '7800231003012', label: '🦪 Choros Vapor',  emoji: '🦪' },
]

// ── Scanner Tab ────────────────────────────────────────────────────────────────

interface ScanLogEntry {
  barcode: string
  name: string
  delta: number | null  // null = exact set
  newQty: number
  unit: string
  at: string
}

type ScanStatus = 'idle' | 'searching' | 'found' | 'new'

function ScannerTab({ onUpdate }: { onUpdate: () => void }) {
  const [barcodeValue, setBarcodeValue] = useState('')
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null)
  const [exactQty, setExactQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [sessionLog, setSessionLog] = useState<ScanLogEntry[]>([])

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showBarcodes, setShowBarcodes] = useState(false)

  const [newForm, setNewForm] = useState({
    product_name: '',
    unit: 'unidades' as InventoryItem['unit'],
    stock_quantity: '',
    min_stock: '',
    cost_price: '',
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  // Auto-focus input on mount, stop camera on unmount
  useEffect(() => {
    inputRef.current?.focus()
    return () => stopCamera()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopCamera = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null }
    if (streamRef.current)       { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    detectorRef.current = null
    if (videoRef.current)        { videoRef.current.srcObject = null }
    setCameraActive(false)
  }

  const handleSearch = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    // Debounce: scanner fires twice sometimes
    if (trimmed === lastScannedRef.current) return
    lastScannedRef.current = trimmed
    setTimeout(() => { lastScannedRef.current = null }, 2000)

    setScanStatus('searching')
    setBarcodeValue(trimmed)
    setFoundItem(null)

    try {
      const found = await getInventoryByBarcode(trimmed)
      if (found) {
        setFoundItem(found)
        setExactQty(String(found.stock_quantity))
        setScanStatus('found')
      } else {
        setScanStatus('new')
        setNewForm(f => ({ ...f, product_name: '' }))
      }
    } catch {
      setScanStatus('idle')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch(barcodeValue)
  }

  const getItemName = (item: InventoryItem) =>
    item.menu_item?.name ?? item.product_name ?? `Cód. ${item.barcode ?? item.id}`

  const logEntry = (item: InventoryItem, delta: number | null, newQty: number) => {
    setSessionLog(prev => [{
      barcode: barcodeValue,
      name: getItemName(item),
      delta,
      newQty,
      unit: item.unit,
      at: new Date().toISOString(),
    }, ...prev])
  }

  const handleAdjust = async (delta: number) => {
    if (!foundItem) return
    const newQty = Math.max(0, foundItem.stock_quantity + delta)
    setSaving(true)
    try {
      const updated = await upsertInventoryItem({ ...foundItem, stock_quantity: newQty })
      const merged = { ...updated, menu_item: foundItem.menu_item }
      setFoundItem(merged)
      setExactQty(String(newQty))
      logEntry(foundItem, delta, newQty)
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  const handleSetExact = async () => {
    if (!foundItem) return
    const qty = parseInt(exactQty)
    if (isNaN(qty) || qty < 0) return
    setSaving(true)
    try {
      const updated = await upsertInventoryItem({ ...foundItem, stock_quantity: qty })
      const merged = { ...updated, menu_item: foundItem.menu_item }
      setFoundItem(merged)
      logEntry(foundItem, null, qty)
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  const handleRegisterNew = async () => {
    if (!newForm.product_name.trim()) return
    setSaving(true)
    try {
      const qty = parseInt(newForm.stock_quantity) || 0
      const newItem = await upsertInventoryItem({
        menu_item_id: null,
        product_name: newForm.product_name.trim(),
        barcode: barcodeValue || null,
        unit: newForm.unit,
        stock_quantity: qty,
        min_stock: parseInt(newForm.min_stock) || 0,
        cost_price: parseInt(newForm.cost_price) || 0,
      })
      setFoundItem(newItem)
      setScanStatus('found')
      setExactQty(String(qty))
      setSessionLog(prev => [{
        barcode: barcodeValue,
        name: newForm.product_name.trim(),
        delta: null,
        newQty: qty,
        unit: newForm.unit,
        at: new Date().toISOString(),
      }, ...prev])
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  const startCamera = async () => {
    setCameraError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('La cámara no está disponible. Asegúrate de usar HTTPS.')
      return
    }

    try {
      // ── 1. Obtener stream (mismo para ambas rutas) ────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      // ── 2. Adjuntar al <video> — siempre en DOM gracias al hidden/visible CSS ──
      const video = videoRef.current!
      video.srcObject = stream
      video.setAttribute('playsinline', '')   // iOS Safari requiere este atributo
      video.muted = true

      // Esperar loadedmetadata antes de play() — obligatorio en iOS Safari
      await new Promise<void>(resolve => {
        if (video.readyState >= 2) { video.play().catch(() => {}); resolve(); return }
        video.onloadedmetadata = () => { video.play().catch(() => {}); resolve() }
        setTimeout(resolve, 3000)   // fallback por si el evento no dispara
      })

      setCameraActive(true)

      // ── 3a. Ruta nativa: BarcodeDetector (Chrome/Edge desktop y Android) ──────
      if ('BarcodeDetector' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        })
        detectorRef.current = detector

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodes = await (detectorRef.current as any).detect(videoRef.current)
            if (barcodes.length > 0) {
              const code: string = barcodes[0].rawValue
              stopCamera(); setBarcodeValue(code); await handleSearch(code)
            }
          } catch { /* frame vacío */ }
        }, 250)

      } else {
        // ── 3b. Ruta ZXing: Safari, Firefox, Chrome en iOS ────────────────────
        // ZXing solo decodifica frames de canvas — NO gestiona el stream
        const [{ HTMLCanvasElementLuminanceSource }, { MultiFormatReader, BinaryBitmap, HybridBinarizer }]
          = await Promise.all([import('@zxing/browser'), import('@zxing/library')])

        const zxReader = new MultiFormatReader()
        const canvas   = document.createElement('canvas')
        const ctx      = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
        detectorRef.current = zxReader

        scanIntervalRef.current = setInterval(() => {
          const v = videoRef.current
          if (!v || v.readyState < 2 || !v.videoWidth) return
          canvas.width  = v.videoWidth
          canvas.height = v.videoHeight
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
          try {
            const luminance = new HTMLCanvasElementLuminanceSource(canvas)
            const bitmap    = new BinaryBitmap(new HybridBinarizer(luminance))
            const result    = zxReader.decode(bitmap)
            const code      = result.getText()
            stopCamera(); setBarcodeValue(code); handleSearch(code)
          } catch { /* sin código en este frame */ }
        }, 300)
      }

    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      if (name === 'NotAllowedError') {
        setCameraError('Acceso a la cámara denegado. Habilítalo en Ajustes del navegador.')
      } else if (name === 'NotFoundError') {
        setCameraError('No se detectó cámara en este dispositivo.')
      } else {
        setCameraError('No se pudo iniciar la cámara.')
      }
      stopCamera()
    }
  }

  const resetScanner = () => {
    setScanStatus('idle')
    setBarcodeValue('')
    setFoundItem(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const ADJUST_DELTAS = [-10, -5, -1, +1, +5, +10, +25]

  return (
    <div className="space-y-4">
      {/* ── Barcode input card ── */}
      <div className="bg-white rounded-card shadow-brand p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scan size={16} className="text-calipso" />
          <p className="font-semibold text-ink">Escanear código de barras</p>
        </div>

        {/* Camera feed — el <video> siempre está en el DOM para que videoRef.current
             nunca sea null cuando se inicia la cámara (crítico en iOS Safari) */}
        <div
          className={clsx(
            'relative mb-4 rounded-card overflow-hidden bg-ink',
            !cameraActive && 'hidden'
          )}
          style={{ aspectRatio: '16/7' }}
        >
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          {cameraActive && (
            <>
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-20 border-2 border-calipso rounded-lg">
                  <div
                    className="absolute inset-x-0 h-0.5 bg-calipso/80 rounded"
                    style={{ animation: 'scanLine 1.8s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-2 right-2 bg-ink/70 text-white p-1.5 rounded-full hover:bg-ink transition-colors"
              >
                <X size={14} />
              </button>
              <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/80">
                Apunta al código de barras del producto
              </p>
            </>
          )}
        </div>

        {cameraError && (
          <div className="mb-3 flex items-center gap-2 text-sm text-coral bg-coral-light px-3 py-2.5 rounded-card">
            <AlertTriangle size={14} className="flex-shrink-0" /> {cameraError}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Código de barras — escribe o escanea con pistola…"
              value={barcodeValue}
              onChange={e => setBarcodeValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-3 border border-calipso-100 rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
          </div>
          <button
            onClick={() => handleSearch(barcodeValue)}
            disabled={!barcodeValue.trim() || scanStatus === 'searching'}
            className="px-4 py-2.5 bg-calipso text-white rounded-input text-sm font-semibold hover:bg-calipso-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            {scanStatus === 'searching'
              ? <RefreshCw size={14} className="animate-spin" />
              : <Search size={14} />}
            Buscar
          </button>
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            title={cameraActive ? 'Cerrar cámara' : 'Escanear con cámara'}
            className={clsx(
              'px-3 py-2.5 rounded-input text-sm font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0',
              cameraActive
                ? 'bg-ink text-white hover:bg-ink/80'
                : 'border border-calipso-100 text-calipso hover:bg-calipso-50'
            )}
          >
            {cameraActive ? <CameraOff size={15} /> : <Camera size={15} />}
          </button>
        </div>

        <p className="text-xs text-ink-secondary mt-2.5">
          Conecta una pistola USB/Bluetooth y apúntala al producto · o usa la cámara en Chrome/Edge
        </p>

        {/* ── Demo quick-scan ── */}
        <div className="mt-4 pt-4 border-t border-calipso-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest">
              Demo rápido — simular escaneo
            </p>
            <button
              onClick={() => setShowBarcodes(v => !v)}
              className="text-[10px] text-calipso hover:underline"
            >
              {showBarcodes ? 'Ocultar códigos' : 'Ver códigos para imprimir / cámara'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_PRODUCTS.map(p => (
              <button
                key={p.barcode}
                onClick={() => handleSearch(p.barcode)}
                disabled={scanStatus === 'searching'}
                className="flex items-center gap-1.5 px-3 py-2 bg-calipso-50 hover:bg-calipso/15 text-calipso text-sm font-semibold rounded-input transition-colors disabled:opacity-50"
              >
                {p.emoji} {p.label.replace(/^.+?\s/, '')}
              </button>
            ))}
          </div>

          {/* Barcode images for camera scanning */}
          {showBarcodes && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {DEMO_PRODUCTS.map(p => (
                <div key={p.barcode} className="bg-white border border-calipso-100 rounded-card p-3 text-center">
                  <img
                    src={`https://barcodeapi.org/api/ean13/${p.barcode}`}
                    alt={p.label}
                    className="mx-auto max-h-20 object-contain"
                    loading="lazy"
                  />
                  <p className="text-xs font-semibold text-ink mt-1.5">{p.label}</p>
                  <p className="text-[10px] font-mono text-ink-secondary">{p.barcode}</p>
                </div>
              ))}
              <p className="col-span-2 text-[10px] text-ink-secondary text-center">
                Muestra esta pantalla en el proyector y escanea con la cámara del teléfono
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Found product ── */}
      {scanStatus === 'found' && foundItem && (
        <div className="bg-white rounded-card shadow-brand p-5 border-t-4 border-[#3B6D11] animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-[#3B6D11]" />
            <p className="font-semibold text-ink">Producto encontrado</p>
            {barcodeValue && (
              <span className="ml-auto text-[10px] text-ink-secondary font-mono bg-calipso-50 px-2 py-0.5 rounded">
                {barcodeValue}
              </span>
            )}
          </div>

          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 bg-calipso-50 rounded-card flex items-center justify-center flex-shrink-0">
              <Package size={22} className="text-calipso" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-lg leading-tight">{getItemName(foundItem)}</p>
              {foundItem.menu_item?.category && (
                <p className="text-xs text-ink-secondary mt-0.5">{foundItem.menu_item.category.name}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm">
                  <span className={clsx(
                    'font-bold text-lg tabular-nums',
                    getStatus(foundItem) === 'ok' ? 'text-[#3B6D11]'
                      : getStatus(foundItem) === 'low' ? 'text-amber-600'
                      : 'text-coral'
                  )}>
                    {foundItem.stock_quantity}
                  </span>
                  <span className="text-ink-secondary ml-1 text-sm">{foundItem.unit}</span>
                </p>
                <span className="text-ink-secondary/40">·</span>
                <p className="text-xs text-ink-secondary">Mín: {foundItem.min_stock} {foundItem.unit}</p>
                <StockBar inv={foundItem} />
              </div>
            </div>
          </div>

          {/* Quick-adjust buttons */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest mb-2">
              Ajuste rápido
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ADJUST_DELTAS.map(delta => (
                <button
                  key={delta}
                  onClick={() => handleAdjust(delta)}
                  disabled={saving || (delta < 0 && foundItem.stock_quantity + delta < 0)}
                  className={clsx(
                    'px-3 py-2 rounded-input text-sm font-semibold transition-all disabled:opacity-40 active:scale-95',
                    delta < 0
                      ? 'bg-coral-light text-coral hover:bg-coral/25'
                      : 'bg-calipso-50 text-calipso hover:bg-calipso/20'
                  )}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* Exact quantity */}
          <div className="flex items-center gap-2 pt-4 border-t border-calipso-50">
            <p className="text-sm text-ink-secondary flex-shrink-0">Cantidad exacta:</p>
            <input
              type="number"
              min="0"
              value={exactQty}
              onChange={e => setExactQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetExact()}
              className="w-24 border border-calipso-100 rounded-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso text-center tabular-nums"
            />
            <span className="text-sm text-ink-secondary">{foundItem.unit}</span>
            <button
              onClick={handleSetExact}
              disabled={saving || exactQty === String(foundItem.stock_quantity)}
              className="ml-auto px-4 py-1.5 bg-calipso text-white rounded-input text-sm font-semibold hover:bg-calipso-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw size={12} className="animate-spin" />}
              Guardar
            </button>
          </div>

          <button
            onClick={resetScanner}
            className="mt-3 text-xs text-ink-secondary hover:text-ink transition-colors flex items-center gap-1"
          >
            <RotateCcw size={11} /> Escanear otro producto
          </button>
        </div>
      )}

      {/* ── Unknown barcode — register new ── */}
      {scanStatus === 'new' && (
        <div className="bg-white rounded-card shadow-brand p-5 border-t-4 border-amber-400 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="font-semibold text-ink">Código no registrado</p>
            {barcodeValue && (
              <span className="ml-auto text-[10px] text-ink-secondary font-mono bg-amber-50 px-2 py-0.5 rounded">
                {barcodeValue}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-secondary mb-4">
            Este código no existe en el inventario. Regístralo como nuevo producto.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest block mb-1">
                Nombre del producto *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ej. Aceite de oliva extra virgen 1L"
                value={newForm.product_name}
                onChange={e => setNewForm(f => ({ ...f, product_name: e.target.value }))}
                className="w-full border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest block mb-1">Unidad</label>
                <select
                  value={newForm.unit}
                  onChange={e => setNewForm(f => ({ ...f, unit: e.target.value as InventoryItem['unit'] }))}
                  className="w-full border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso bg-white"
                >
                  {(['unidades', 'kg', 'litros', 'porciones', 'botellas', 'docenas'] as const).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest block mb-1">Stock inicial</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newForm.stock_quantity}
                  onChange={e => setNewForm(f => ({ ...f, stock_quantity: e.target.value }))}
                  className="w-full border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest block mb-1">Stock mínimo</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newForm.min_stock}
                  onChange={e => setNewForm(f => ({ ...f, min_stock: e.target.value }))}
                  className="w-full border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest block mb-1">Costo unit. ($)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newForm.cost_price}
                  onChange={e => setNewForm(f => ({ ...f, cost_price: e.target.value }))}
                  className="w-full border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRegisterNew}
                disabled={saving || !newForm.product_name.trim()}
                className="flex-1 py-2.5 bg-calipso text-white rounded-input text-sm font-semibold hover:bg-calipso-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                Registrar producto
              </button>
              <button
                onClick={resetScanner}
                className="px-4 py-2.5 border border-calipso-100 text-ink-secondary rounded-input text-sm hover:bg-calipso-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Session log ── */}
      {sessionLog.length > 0 && (
        <div className="bg-white rounded-card shadow-brand p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink flex items-center gap-2">
              <ClipboardList size={14} className="text-calipso" />
              Sesión de escaneo
              <span className="text-xs font-normal text-ink-secondary">
                ({sessionLog.length} movimiento{sessionLog.length !== 1 ? 's' : ''})
              </span>
            </p>
            <button
              onClick={() => setSessionLog([])}
              className="text-xs text-ink-secondary hover:text-coral transition-colors"
            >
              Limpiar
            </button>
          </div>
          <div className="divide-y divide-calipso-50">
            {sessionLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-xs text-ink-secondary tabular-nums w-11 flex-shrink-0">
                  {new Date(entry.at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex-1 text-ink font-medium truncate">{entry.name}</span>
                <span className={clsx(
                  'font-bold tabular-nums flex-shrink-0',
                  entry.delta === null ? 'text-ink-secondary'
                    : entry.delta > 0 ? 'text-[#3B6D11]'
                    : 'text-coral'
                )}>
                  {entry.delta === null ? '=' : entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                </span>
                <span className="text-xs text-ink-secondary flex-shrink-0">→ {entry.newQty} {entry.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type MainTab = 'lista' | 'escanear'

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [tab, setTab] = useState<MainTab>('lista')

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

  const counts = {
    all: inventory.length,
    low: inventory.filter(i => getStatus(i) === 'low').length,
    out: inventory.filter(i => getStatus(i) === 'out').length,
  }

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
          className="flex items-center gap-2 text-sm text-calipso hover:underline self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Productos',    value: counts.all,                          color: 'text-ink',       bg: 'bg-white' },
          { label: 'Stock OK',     value: counts.all - counts.low - counts.out, color: 'text-[#3B6D11]', bg: 'bg-[#D4EDDA]' },
          { label: 'Bajo mínimo', value: counts.low,                           color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Sin stock',    value: counts.out,                           color: 'text-coral',     bg: 'bg-coral-light' },
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
          </p>
        </div>
      )}

      {/* Main tabs */}
      <div className="flex gap-1 p-1 bg-calipso-50 rounded-card w-fit">
        <button
          onClick={() => setTab('lista')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-input text-sm font-semibold transition-all',
            tab === 'lista' ? 'bg-white text-ink shadow-brand' : 'text-ink-secondary hover:text-ink'
          )}
        >
          <ClipboardList size={14} /> Lista
        </button>
        <button
          onClick={() => setTab('escanear')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-input text-sm font-semibold transition-all',
            tab === 'escanear' ? 'bg-white text-ink shadow-brand' : 'text-ink-secondary hover:text-ink'
          )}
        >
          <Scan size={14} /> Escanear
        </button>
      </div>

      {/* Tab content */}
      {tab === 'lista' ? (
        <ListaTab inventory={inventory} onSave={handleSave} saved={saved} error={error} />
      ) : (
        <ScannerTab onUpdate={load} />
      )}
    </div>
  )
}
