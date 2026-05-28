import { useState, useEffect } from 'react'
import { getAllOrders } from '../../lib/api'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import type { Order } from '../../types'
import { Printer, RefreshCw, TrendingUp, Wallet, Users, CalendarDays } from 'lucide-react'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtCLP(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }
function fmtPct(n: number, total: number) {
  if (total === 0) return '0%'
  return Math.round(n / total * 100) + '%'
}
function todayStr() { return new Date().toISOString().split('T')[0] }

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── constants ─────────────────────────────────────────────────────────────────

const PM_CONFIG: { id: string; label: string; cls: string; bar: string }[] = [
  { id: 'efectivo',      label: 'Efectivo',       cls: 'bg-[#D4EDDA] text-[#3B6D11]', bar: '#3B6D11' },
  { id: 'debito',        label: 'Débito',          cls: 'bg-calipso-50 text-calipso',  bar: '#29B5D0' },
  { id: 'credito',       label: 'Crédito',         cls: 'bg-purple-50 text-purple-700',bar: '#9333EA' },
  { id: 'transferencia', label: 'Transferencia',   cls: 'bg-amber-50 text-amber-700',  bar: '#D97706' },
]

// ── print helper ──────────────────────────────────────────────────────────────

function buildPrintHTML(
  date: string,
  paidOrders: Order[],
  pmBreakdown: { id: string; label: string; total: number; count: number }[],
  waiterBreakdown: { name: string; total: number; count: number; avgTicket: number }[],
  grandTotal: number,
): string {
  const dateLabel = fmtDate(date + 'T12:00:00')
  const pmRows = pmBreakdown.map(p => `
    <tr>
      <td>${p.label}</td>
      <td class="right">${p.count}</td>
      <td class="right">${fmtCLP(p.total)}</td>
      <td class="right">${fmtPct(p.total, grandTotal)}</td>
    </tr>`).join('')
  const waiterRows = waiterBreakdown.map(w => `
    <tr>
      <td>${w.name}</td>
      <td class="right">${w.count}</td>
      <td class="right">${fmtCLP(w.total)}</td>
      <td class="right">${fmtCLP(w.avgTicket)}</td>
    </tr>`).join('')
  const now = new Date()
  const printed = `${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cierre de Caja — ${dateLabel}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; padding: 12mm 10mm; color: #000; font-size: 13px; }
h1 { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
.sub { color: #666; font-size: 12px; margin-bottom: 14px; }
.sep { border: none; border-top: 1.5px solid #555; margin: 10px 0; }
.sep-dash { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; color: #333; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th { text-align: left; font-size: 11px; text-transform: uppercase; color: #888; padding: 3px 0; border-bottom: 1px solid #ddd; }
td { padding: 4px 0; font-size: 13px; }
.right { text-align: right; }
.total-row td { font-weight: bold; border-top: 1.5px solid #333; padding-top: 5px; }
.grand { font-size: 22px; font-weight: bold; }
.grand-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; }
.footer { font-size: 11px; color: #aaa; margin-top: 14px; }
@media print { @page { margin: 0; size: A4; } body { padding: 12mm 10mm; } }
</style>
</head>
<body>
<h1>Cierre de Caja</h1>
<p class="sub">${dateLabel}</p>
<hr class="sep"/>

<div class="grand-row">
  <span style="font-size:15px;color:#555;">Total recaudado</span>
  <span class="grand">${fmtCLP(grandTotal)}</span>
</div>
<hr class="sep-dash"/>
<p style="font-size:12px;color:#666;margin-bottom:12px;">${paidOrders.length} comanda${paidOrders.length !== 1 ? 's' : ''} cobrada${paidOrders.length !== 1 ? 's' : ''}</p>

<h2>Por método de pago</h2>
<table>
  <thead><tr><th>Método</th><th class="right">Ctas.</th><th class="right">Total</th><th class="right">%</th></tr></thead>
  <tbody>
    ${pmRows}
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="right">${paidOrders.length}</td>
      <td class="right">${fmtCLP(grandTotal)}</td>
      <td class="right">100%</td>
    </tr>
  </tbody>
</table>

<hr class="sep-dash"/>
<h2>Por garzón</h2>
<table>
  <thead><tr><th>Garzón</th><th class="right">Ctas.</th><th class="right">Total</th><th class="right">Prom.</th></tr></thead>
  <tbody>
    ${waiterRows}
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="right">${paidOrders.length}</td>
      <td class="right">${fmtCLP(grandTotal)}</td>
      <td class="right">${fmtCLP(paidOrders.length > 0 ? Math.round(grandTotal / paidOrders.length) : 0)}</td>
    </tr>
  </tbody>
</table>

<hr class="sep"/>
<p class="footer">Impreso: ${printed}</p>
<script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 800); }</script>
</body>
</html>`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CierreCaja() {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [date,    setDate]    = useState(todayStr())

  const load = async () => {
    setLoading(true)
    try { setOrders(await getAllOrders()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <PageLoader />

  // Filter to paid orders for selected date
  const paidOrders = orders.filter(
    o => o.status === 'paid' && o.updated_at?.startsWith(date)
  )

  const grandTotal = paidOrders.reduce((s, o) => s + o.total, 0)

  // ── Payment method breakdown ──
  const pmBreakdown = PM_CONFIG.map(pm => ({
    ...pm,
    total: paidOrders.filter(o => o.payment_method === pm.id).reduce((s, o) => s + o.total, 0),
    count: paidOrders.filter(o => o.payment_method === pm.id).length,
  })).filter(pm => pm.count > 0)

  const untagged = paidOrders.filter(o => !o.payment_method).length

  // ── Waiter breakdown ──
  const waiterMap = new Map<string, { total: number; count: number }>()
  for (const o of paidOrders) {
    const name = o.waiter_name ?? 'Sin asignar'
    const prev = waiterMap.get(name) ?? { total: 0, count: 0 }
    waiterMap.set(name, { total: prev.total + o.total, count: prev.count + 1 })
  }
  const waiterBreakdown = [...waiterMap.entries()]
    .map(([name, { total, count }]) => ({
      name, total, count,
      avgTicket: count > 0 ? Math.round(total / count) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const maxPm = Math.max(...pmBreakdown.map(p => p.total), 1)
  const maxWaiter = Math.max(...waiterBreakdown.map(w => w.total), 1)

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=700,height=900,menubar=no,toolbar=no,location=no')
    if (!win) return
    win.document.write(buildPrintHTML(date, paidOrders, pmBreakdown, waiterBreakdown, grandTotal))
    win.document.close()
  }

  return (
    <div className="space-y-6 animate-fade-in font-body max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-ink font-bold italic">Cierre de Caja</h1>
          <p className="text-ink-secondary text-sm mt-0.5">Resumen de ingresos por día</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date picker */}
          <div className="flex items-center gap-2 border border-calipso-100 rounded-input px-3 py-2 bg-white">
            <CalendarDays size={15} className="text-calipso" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 border border-calipso-100 text-ink-secondary text-sm px-3 py-2.5 rounded-input hover:bg-calipso-50 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handlePrint}
            disabled={paidOrders.length === 0}
            className="flex items-center gap-1.5 bg-calipso text-white text-sm font-semibold px-4 py-2.5 rounded-input hover:bg-calipso-700 transition-colors disabled:opacity-40"
          >
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {paidOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-card shadow-brand">
          <Wallet size={40} className="text-calipso/30 mb-4" />
          <p className="font-display italic text-xl text-ink">Sin comandas cobradas</p>
          <p className="text-base text-ink-secondary mt-1">No hay ingresos registrados para este día.</p>
        </div>
      ) : (
        <>
          {/* Grand total */}
          <div className="bg-white rounded-card shadow-brand px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-secondary font-medium uppercase tracking-wider">Total recaudado</p>
              <p className="text-4xl font-bold text-ink tabular-nums mt-1">{fmtCLP(grandTotal)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3 justify-end">
                <div className="text-center">
                  <p className="text-2xl font-bold text-calipso tabular-nums">{paidOrders.length}</p>
                  <p className="text-xs text-ink-secondary">comandas</p>
                </div>
                <div className="w-px h-10 bg-calipso-100" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#3B6D11] tabular-nums">
                    {fmtCLP(paidOrders.length > 0 ? Math.round(grandTotal / paidOrders.length) : 0)}
                  </p>
                  <p className="text-xs text-ink-secondary">ticket prom.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment method breakdown */}
          <div className="bg-white rounded-card shadow-brand overflow-hidden">
            <div className="px-5 py-3.5 border-b border-calipso-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-calipso" />
              <h2 className="font-semibold text-ink text-sm">Por método de pago</h2>
            </div>
            <div className="divide-y divide-calipso-50">
              {pmBreakdown.map(pm => {
                const barPct = Math.round(pm.total / maxPm * 100)
                return (
                  <div key={pm.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full', pm.cls)}>
                          {pm.label}
                        </span>
                        <span className="text-sm text-ink-secondary">
                          {pm.count} comanda{pm.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-ink tabular-nums">{fmtCLP(pm.total)}</span>
                        <span className="text-sm text-ink-secondary ml-2 tabular-nums">{fmtPct(pm.total, grandTotal)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-calipso-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, backgroundColor: pm.bar }}
                      />
                    </div>
                  </div>
                )
              })}
              {untagged > 0 && (
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs text-ink-secondary italic">{untagged} sin método registrado</span>
                </div>
              )}
            </div>
          </div>

          {/* Waiter breakdown */}
          {waiterBreakdown.length > 0 && (
            <div className="bg-white rounded-card shadow-brand overflow-hidden">
              <div className="px-5 py-3.5 border-b border-calipso-100 flex items-center gap-2">
                <Users size={16} className="text-calipso" />
                <h2 className="font-semibold text-ink text-sm">Por garzón</h2>
              </div>
              <div className="divide-y divide-calipso-50">
                {waiterBreakdown.map((w, idx) => {
                  const barPct = Math.round(w.total / maxWaiter * 100)
                  const rankColor = idx === 0 ? '#D97706' : idx === 1 ? '#9CA3AF' : '#C2793A'
                  return (
                    <div key={w.name} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ backgroundColor: idx < 3 ? rankColor : '#D1D5DB' }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-ink">{w.name}</p>
                            <p className="text-xs text-ink-secondary">
                              {w.count} comanda{w.count !== 1 ? 's' : ''} · prom. {fmtCLP(w.avgTicket)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-ink tabular-nums">{fmtCLP(w.total)}</span>
                          <span className="text-sm text-ink-secondary ml-2 tabular-nums">{fmtPct(w.total, grandTotal)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-calipso-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-calipso/70"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer total row */}
              <div className="px-5 py-3 bg-calipso-50 border-t border-calipso-100 flex justify-between items-center">
                <span className="text-sm font-bold text-ink uppercase tracking-wide">Total</span>
                <span className="font-bold text-calipso tabular-nums">{fmtCLP(grandTotal)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
