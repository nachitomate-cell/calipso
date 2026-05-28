import { useState, useEffect, useMemo } from 'react'
import {
  getCustomers, getCustomerVisits, upsertCustomer, deleteCustomer, getAllMenuItems,
} from '../../lib/api'
import type { Customer, CustomerVisit, CustomerTag, MenuItem } from '../../types'
import {
  BookUser, Plus, Search, Star, Trophy, Building2, Sparkles,
  AlertTriangle, Cake, Phone, Mail, CalendarDays, StickyNote,
  Trash2, X, Edit3, Check, ChevronRight, RefreshCw, Clock,
  TrendingUp, UtensilsCrossed, Users,
} from 'lucide-react'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysAgo(iso: string | null) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff < 7) return `hace ${diff} días`
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem.`
  return fmtDate(iso)
}

function initials(name: string) {
  return name.trim().split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_COLORS = [
  'bg-calipso text-white',
  'bg-amber-500 text-white',
  'bg-coral text-white',
  'bg-[#3B6D11] text-white',
  'bg-calipso-700 text-white',
  'bg-pink-500 text-white',
  'bg-indigo-500 text-white',
  'bg-orange-500 text-white',
]

function avatarColor(id: string) {
  const n = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// ── Tag config ────────────────────────────────────────────────────────────────

type TagConfig = { label: string; cls: string; icon: React.ReactNode }

const TAG_CONFIG: Record<CustomerTag, TagConfig> = {
  vip:        { label: 'VIP',         cls: 'bg-amber-50 text-amber-700 border border-amber-200',  icon: <Trophy size={10} /> },
  frecuente:  { label: 'Frecuente',   cls: 'bg-calipso-50 text-calipso border border-calipso/20', icon: <Star size={10} /> },
  corporativo:{ label: 'Corporativo', cls: 'bg-ink/5 text-ink border border-ink/15',              icon: <Building2 size={10} /> },
  nuevo:      { label: 'Nuevo',       cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <Sparkles size={10} /> },
  alergia:    { label: 'Alergia',     cls: 'bg-coral-light text-coral border border-coral/20',     icon: <AlertTriangle size={10} /> },
  cumpleanos: { label: 'Cumpleaños',  cls: 'bg-pink-50 text-pink-600 border border-pink-200',     icon: <Cake size={10} /> },
}

const ALL_TAGS: CustomerTag[] = ['vip', 'frecuente', 'corporativo', 'nuevo', 'alergia', 'cumpleanos']

function TagBadge({ tag, size = 'sm' }: { tag: CustomerTag; size?: 'sm' | 'xs' }) {
  const cfg = TAG_CONFIG[tag]
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 font-semibold rounded-full',
      size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5',
      cfg.cls
    )}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ── Blank form state ──────────────────────────────────────────────────────────

function blankForm(): Partial<Customer> & { name: string } {
  return { name: '', email: '', phone: '', birthday: '', notes: '', tags: [], favorite_dish_id: null }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [tagFilter, setTagFilter] = useState<CustomerTag | null>(null)
  const [selected, setSelected]   = useState<Customer | null>(null)
  const [visits, setVisits]       = useState<CustomerVisit[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(blankForm())
  const [saving, setSaving]       = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [editForm, setEditForm]   = useState<Customer | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const [c, m] = await Promise.all([getCustomers(), getAllMenuItems()])
      setCustomers(c)
      setMenuItems(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const loadVisits = async (customerId: string) => {
    setVisitsLoading(true)
    try {
      setVisits(await getCustomerVisits(customerId))
    } catch { /* silent */ }
    finally { setVisitsLoading(false) }
  }

  const handleSelect = (c: Customer) => {
    setSelected(c)
    setEditMode(false)
    setEditForm(null)
    loadVisits(c.id)
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return {
      total:    customers.length,
      vips:     customers.filter(c => c.tags.includes('vip')).length,
      newMonth: customers.filter(c => c.created_at >= monthStart).length,
      avgTicket: customers.length > 0
        ? Math.round(customers.reduce((s, c) => s + (c.total_visits > 0 ? c.total_spent / c.total_visits : 0), 0) / customers.filter(c => c.total_visits > 0).length || 0)
        : 0,
    }
  }, [customers])

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = customers
    if (tagFilter) list = list.filter(c => c.tags.includes(tagFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      )
    }
    return list
  }, [customers, tagFilter, search])

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const nc = await upsertCustomer({
        ...form,
        name: form.name.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        birthday: form.birthday?.trim() || null,
        notes: form.notes?.trim() || null,
      })
      setCustomers(prev => [nc, ...prev])
      setShowForm(false)
      setForm(blankForm())
      handleSelect(nc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm) return
    setSaving(true)
    setError(null)
    try {
      const updated = await upsertCustomer(editForm)
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelected(updated)
      setEditMode(false)
      setEditForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    try {
      await deleteCustomer(id)
      setCustomers(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in font-body h-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl text-ink font-bold italic">Clientes</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {customers.length} cliente{customers.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSelected(null) }}
          className="flex items-center gap-2 bg-calipso text-white text-sm font-semibold px-4 py-2.5 rounded-input hover:bg-calipso-700 transition-colors"
        >
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-coral-light text-coral text-sm px-4 py-3 rounded-card mb-4">
          <AlertTriangle size={15} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total clientes" value={kpis.total} icon={<BookUser size={18} />} color="text-calipso" />
        <KpiCard label="VIPs"           value={kpis.vips} icon={<Trophy size={18} />}    color="text-amber-600" />
        <KpiCard label="Nuevos este mes" value={kpis.newMonth} icon={<Sparkles size={18} />} color="text-emerald-600" />
        <KpiCard label="Ticket promedio" value={fmtCLP(kpis.avgTicket)} icon={<TrendingUp size={18} />} color="text-calipso-700" />
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-card shadow-brand border-t-4 border-calipso p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-ink">Nuevo cliente</p>
            <button onClick={() => { setShowForm(false); setForm(blankForm()) }} className="text-ink-secondary hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              autoFocus placeholder="Nombre completo *"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso col-span-full"
            />
            <input
              placeholder="Email" type="email"
              value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
            <input
              placeholder="Teléfono"
              value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
            <input
              placeholder="Cumpleaños" type="date"
              value={form.birthday ?? ''} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
              className="border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
            <div className="flex flex-wrap gap-1.5 items-center">
              {ALL_TAGS.map(tag => {
                const active = (form.tags ?? []).includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => setForm(f => ({
                      ...f,
                      tags: active
                        ? (f.tags ?? []).filter(t => t !== tag)
                        : [...(f.tags ?? []), tag]
                    }))}
                    className={clsx('text-[11px] px-2 py-1 rounded-full border font-semibold transition-colors',
                      active ? TAG_CONFIG[tag].cls : 'border-calipso-100 text-ink-secondary hover:border-calipso-300'
                    )}
                  >
                    {TAG_CONFIG[tag].label}
                  </button>
                )
              })}
            </div>
            <textarea
              placeholder="Notas (alergias, preferencias...)"
              value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso col-span-full resize-none"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || saving}
              className="bg-calipso disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-input text-sm hover:bg-calipso-700 transition-colors flex items-center gap-1.5"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(blankForm()) }}
              className="border border-calipso-100 text-ink-secondary px-4 py-2.5 rounded-input text-sm hover:bg-calipso-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Search + tag filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            placeholder="Buscar por nombre, email o teléfono…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-calipso-100 rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={clsx(
              'text-[11px] px-3 py-1.5 rounded-full font-semibold border transition-colors',
              tagFilter === null ? 'bg-calipso text-white border-calipso' : 'border-calipso-100 text-ink-secondary hover:border-calipso-300'
            )}
          >
            Todos
          </button>
          {ALL_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(t => t === tag ? null : tag)}
              className={clsx(
                'text-[11px] px-3 py-1.5 rounded-full font-semibold border transition-colors',
                tagFilter === tag ? TAG_CONFIG[tag].cls : 'border-calipso-100 text-ink-secondary hover:border-calipso-300'
              )}
            >
              {TAG_CONFIG[tag].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area: list + detail panel */}
      <div className={clsx('flex gap-6', selected ? 'items-start' : '')}>

        {/* Customer list */}
        <div className={clsx('min-w-0', selected ? 'flex-1 hidden lg:block' : 'flex-1')}>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-card" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookUser size={40} className="text-calipso/30 mb-4" />
              <p className="font-display italic text-xl text-ink">
                {search || tagFilter ? 'Sin resultados' : 'Sin clientes registrados'}
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                {search || tagFilter ? 'Prueba con otros filtros.' : 'Agrega tu primer cliente para comenzar.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  active={selected?.id === c.id}
                  onClick={() => handleSelect(c)}
                  menuItems={menuItems}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className={clsx(
            'bg-white rounded-card shadow-brand border border-calipso-100 overflow-hidden flex-shrink-0',
            'w-full lg:w-[400px]'
          )}>
            <CustomerDetail
              customer={editMode && editForm ? editForm : selected}
              visits={visits}
              visitsLoading={visitsLoading}
              menuItems={menuItems}
              editMode={editMode}
              saving={saving}
              onClose={() => { setSelected(null); setEditMode(false); setEditForm(null) }}
              onEdit={() => { setEditMode(true); setEditForm({ ...selected }) }}
              onCancelEdit={() => { setEditMode(false); setEditForm(null) }}
              onSaveEdit={handleSaveEdit}
              onDelete={() => handleDelete(selected.id, selected.name)}
              onChangeEditForm={patch => setEditForm(f => f ? { ...f, ...patch } : f)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Customer Row ──────────────────────────────────────────────────────────────

function CustomerRow({ customer: c, active, onClick, menuItems }: {
  customer: Customer
  active: boolean
  onClick: () => void
  menuItems: MenuItem[]
}) {
  const dish = c.favorite_dish ?? menuItems.find(m => m.id === c.favorite_dish_id)
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left bg-white rounded-card shadow-brand p-4 flex items-center gap-4 transition-all border-l-4 hover:shadow-md',
        active ? 'border-calipso ring-1 ring-calipso/20' : 'border-transparent'
      )}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
        avatarColor(c.id)
      )}>
        {initials(c.name)}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink text-sm">{c.name}</span>
          {c.tags.slice(0, 2).map(t => <TagBadge key={t} tag={t} size="xs" />)}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {c.email && (
            <span className="text-xs text-ink-secondary truncate max-w-[160px]">{c.email}</span>
          )}
          {dish && (
            <span className="text-xs text-calipso flex items-center gap-1">
              <Star size={10} className="fill-calipso" /> {dish.name}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 text-right hidden sm:block">
        <p className="text-sm font-semibold text-ink">{fmtCLP(c.total_spent)}</p>
        <p className="text-xs text-ink-secondary mt-0.5">
          {c.total_visits} visita{c.total_visits !== 1 ? 's' : ''} · {daysAgo(c.last_visit)}
        </p>
      </div>

      <ChevronRight size={15} className="text-ink-secondary flex-shrink-0 hidden sm:block" />
    </button>
  )
}

// ── Customer Detail ───────────────────────────────────────────────────────────

function CustomerDetail({
  customer: c, visits, visitsLoading, menuItems,
  editMode, saving, onClose, onEdit, onCancelEdit, onSaveEdit, onDelete, onChangeEditForm,
}: {
  customer: Customer
  visits: CustomerVisit[]
  visitsLoading: boolean
  menuItems: MenuItem[]
  editMode: boolean
  saving: boolean
  onClose: () => void
  onEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: () => void
  onChangeEditForm: (patch: Partial<Customer>) => void
}) {
  const dish = c.favorite_dish ?? menuItems.find(m => m.id === c.favorite_dish_id)
  const avgTicket = c.total_visits > 0 ? Math.round(c.total_spent / c.total_visits) : 0

  return (
    <div className="flex flex-col h-full max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="bg-calipso-700 px-5 py-5 flex items-start gap-4">
        <div className={clsx(
          'w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border-2 border-white/30',
          avatarColor(c.id)
        )}>
          {initials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          {editMode ? (
            <input
              value={c.name}
              onChange={e => onChangeEditForm({ name: e.target.value })}
              className="w-full bg-white/10 border border-white/30 rounded-input px-2 py-1 text-white placeholder-white/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          ) : (
            <p className="font-semibold text-white text-base leading-tight">{c.name}</p>
          )}
          <div className="flex gap-1 flex-wrap mt-1.5">
            {c.tags.map(t => <TagBadge key={t} tag={t} size="xs" />)}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {editMode ? (
            <>
              <button onClick={onSaveEdit} disabled={saving}
                className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-50">
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
              <button onClick={onCancelEdit}
                className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors">
                <X size={15} />
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit}
                className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors">
                <Edit3 size={15} />
              </button>
              <button onClick={onDelete}
                className="p-1.5 rounded text-white/80 hover:text-coral-light hover:bg-white/10 transition-colors">
                <Trash2 size={15} />
              </button>
              <button onClick={onClose}
                className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors">
                <X size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Contact info */}
        <div className="px-5 py-4 border-b border-calipso-100 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary">Contacto</p>
          {editMode ? (
            <div className="space-y-2">
              <EditField icon={<Mail size={13} />} label="Email" value={c.email ?? ''} onChange={v => onChangeEditForm({ email: v || null })} type="email" />
              <EditField icon={<Phone size={13} />} label="Teléfono" value={c.phone ?? ''} onChange={v => onChangeEditForm({ phone: v || null })} />
              <EditField icon={<Cake size={13} />} label="Cumpleaños" value={c.birthday ?? ''} onChange={v => onChangeEditForm({ birthday: v || null })} type="date" />
            </div>
          ) : (
            <div className="space-y-2">
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-ink hover:text-calipso transition-colors group">
                  <Mail size={13} className="text-ink-secondary flex-shrink-0" />
                  <span className="truncate group-hover:underline">{c.email}</span>
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-ink hover:text-calipso transition-colors group">
                  <Phone size={13} className="text-ink-secondary flex-shrink-0" />
                  <span className="group-hover:underline">{c.phone}</span>
                </a>
              )}
              {c.birthday && (
                <div className="flex items-center gap-2 text-sm text-ink">
                  <Cake size={13} className="text-ink-secondary flex-shrink-0" />
                  <span>{fmtDate(c.birthday)}</span>
                </div>
              )}
              {!c.email && !c.phone && !c.birthday && (
                <p className="text-sm text-ink-secondary italic">Sin datos de contacto</p>
              )}
            </div>
          )}
        </div>

        {/* Tags editor in edit mode */}
        {editMode && (
          <div className="px-5 py-4 border-b border-calipso-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary mb-2">Etiquetas</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(tag => {
                const active = c.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => onChangeEditForm({
                      tags: active ? c.tags.filter(t => t !== tag) : [...c.tags, tag]
                    })}
                    className={clsx(
                      'text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors',
                      active ? TAG_CONFIG[tag].cls : 'border-calipso-100 text-ink-secondary hover:border-calipso-300'
                    )}
                  >
                    {TAG_CONFIG[tag].label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="px-5 py-4 border-b border-calipso-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary mb-3">Estadísticas</p>
          <div className="grid grid-cols-2 gap-3">
            <StatMini
              icon={<CalendarDays size={14} className="text-calipso" />}
              label="Visitas" value={c.total_visits.toString()}
            />
            <StatMini
              icon={<TrendingUp size={14} className="text-calipso" />}
              label="Gasto total" value={fmtCLP(c.total_spent)}
            />
            <StatMini
              icon={<UtensilsCrossed size={14} className="text-calipso" />}
              label="Ticket promedio" value={fmtCLP(avgTicket)}
            />
            <StatMini
              icon={<Clock size={14} className="text-calipso" />}
              label="Última visita" value={daysAgo(c.last_visit) ?? '—'}
            />
          </div>
        </div>

        {/* Favorite dish */}
        {dish && (
          <div className="px-5 py-4 border-b border-calipso-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary mb-2">Plato favorito</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-calipso-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star size={18} className="text-calipso fill-calipso" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{dish.name}</p>
                <p className="text-xs text-ink-secondary">{fmtCLP(dish.price)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-5 py-4 border-b border-calipso-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary mb-2">Notas</p>
          {editMode ? (
            <textarea
              value={c.notes ?? ''}
              onChange={e => onChangeEditForm({ notes: e.target.value || null })}
              rows={3}
              placeholder="Alergias, preferencias, observaciones…"
              className="w-full border border-calipso-100 rounded-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-calipso"
            />
          ) : c.notes ? (
            <div className="flex items-start gap-2 text-sm text-ink">
              <StickyNote size={13} className="text-ink-secondary flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{c.notes}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-secondary italic">Sin notas</p>
          )}
        </div>

        {/* Visit history */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary mb-3">
            Historial de visitas
          </p>
          {visitsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-card" />)}
            </div>
          ) : visits.length === 0 ? (
            <p className="text-sm text-ink-secondary italic">Sin visitas registradas</p>
          ) : (
            <div className="space-y-2">
              {visits.slice(0, 8).map(v => (
                <VisitRow key={v.id} visit={v} menuItems={menuItems} />
              ))}
              {visits.length > 8 && (
                <p className="text-xs text-ink-secondary text-center pt-1">
                  +{visits.length - 8} visitas anteriores
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Visit Row ─────────────────────────────────────────────────────────────────

function VisitRow({ visit: v, menuItems }: { visit: CustomerVisit; menuItems: MenuItem[] }) {
  const dishNames = v.dishes
    .map(id => menuItems.find(m => m.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2)

  return (
    <div className="bg-calipso-50/50 rounded-card px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{fmtDate(v.visit_date)}</span>
        <span className="font-semibold text-calipso">{fmtCLP(v.amount_spent)}</span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-ink-secondary">
        <Users size={10} />
        <span>{v.party_size} pers.</span>
        {dishNames.length > 0 && (
          <span className="truncate">· {dishNames.join(', ')}{v.dishes.length > 2 ? ` +${v.dishes.length - 2}` : ''}</span>
        )}
        {v.notes && <span className="italic truncate">· {v.notes}</span>}
      </div>
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: {
  label: string; value: number | string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-white rounded-card shadow-brand p-4">
      <div className={clsx('mb-2', color)}>{icon}</div>
      <p className="text-xl font-bold text-ink leading-none">{value}</p>
      <p className="text-xs text-ink-secondary mt-1">{label}</p>
    </div>
  )
}

function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-calipso-50/40 rounded-lg px-3 py-2.5">
      {icon}
      <div>
        <p className="text-[10px] text-ink-secondary leading-none">{label}</p>
        <p className="text-sm font-semibold text-ink mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  )
}

function EditField({ icon, label, value, onChange, type = 'text' }: {
  icon: React.ReactNode; label: string; value: string
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-secondary flex-shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 border border-calipso-100 rounded-input px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
      />
    </div>
  )
}
