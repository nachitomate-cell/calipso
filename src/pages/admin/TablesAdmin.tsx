import { useState, useEffect } from 'react'
import { getTables, upsertTable, deleteTable } from '../../lib/api'
import type { Table, TableLocation } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import clsx from 'clsx'

const locationLabels: Record<TableLocation, string> = {
  terraza: 'Terraza',
  interior: 'Interior',
  barra: 'Barra',
}

// Per spec: free=E1F5EE/3B6D11 | occupied=FAECE7/E8593C | reserved=FAEEDA/BA7517 | cleaning=F1EFE8/888780
// We use these for the table cards — active = "free" style, inactive = "cleaning" style
const tableCardStyle = {
  active: 'bg-status-free border-[#3B6D11]',
  inactive: 'bg-status-cleaning border-[#888780]',
}

const locationAccent: Record<TableLocation, string> = {
  terraza: 'text-calipso bg-calipso-50',
  interior: 'text-[#BA7517] bg-arena-warm',
  barra: 'text-ink-secondary bg-status-cleaning',
}

export default function TablesAdmin() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; table?: Table }>({ open: false })
  const [form, setForm] = useState<Partial<Table>>({})
  const [saving, setSaving] = useState(false)
  const [activeLocation, setActiveLocation] = useState<TableLocation | 'all'>('all')

  const load = () => getTables().then(setTables).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openModal = (table?: Table) => {
    setForm(table ?? { capacity: 2, location: 'interior', is_active: true })
    setModal({ open: true, table })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.number || !form.capacity) return
    setSaving(true)
    try {
      await upsertTable({
        ...(modal.table ? { id: modal.table.id } : {}),
        number: Number(form.number),
        capacity: Number(form.capacity),
        location: form.location ?? 'interior',
        is_active: form.is_active ?? true,
      })
      await load()
      setModal({ open: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const locations: (TableLocation | 'all')[] = ['all', 'terraza', 'interior', 'barra']
  const filtered = activeLocation === 'all' ? tables : tables.filter(t => t.location === activeLocation)
  const grouped: Record<TableLocation, Table[]> = {
    terraza: filtered.filter(t => t.location === 'terraza'),
    interior: filtered.filter(t => t.location === 'interior'),
    barra: filtered.filter(t => t.location === 'barra'),
  }

  return (
    <div className="space-y-6 animate-fade-in font-body">
      <div className="flex items-center justify-between">
        {/* Location filter */}
        <div className="flex gap-1 bg-white p-1 rounded-card shadow-brand">
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setActiveLocation(loc)}
              className={clsx(
                'px-3.5 py-1.5 rounded-input text-sm font-medium transition-all duration-200',
                activeLocation === loc
                  ? 'bg-calipso text-white shadow-brand'
                  : 'text-ink-secondary hover:text-calipso'
              )}
            >
              {loc === 'all' ? 'Todas' : locationLabels[loc]}
            </button>
          ))}
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 bg-coral hover:bg-coral-hover text-white text-sm font-semibold px-4 py-2 rounded-card transition-all duration-200"
        >
          <Plus size={15} /> Nueva Mesa
        </button>
      </div>

      {/* Table grid by location */}
      {(Object.entries(grouped) as [TableLocation, Table[]][])
        .filter(([, ts]) => ts.length > 0)
        .map(([location, ts]) => (
          <div key={location}>
            <div className="flex items-center gap-2 mb-4">
              <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider', locationAccent[location])}>
                {locationLabels[location]}
              </span>
              <span className="text-xs text-ink-secondary">{ts.length} mesa{ts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {ts.map(table => (
                <div
                  key={table.id}
                  className={clsx(
                    'border-2 rounded-card p-4 text-center relative group transition-all duration-200 hover:shadow-brand-md',
                    table.is_active ? tableCardStyle.active : tableCardStyle.inactive,
                    !table.is_active && 'opacity-50'
                  )}
                >
                  <p className="text-2xl font-bold text-ink tabular-nums">#{table.number}</p>
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs font-medium text-ink-secondary">
                    <Users size={11} />
                    {table.capacity} pers.
                  </div>
                  <span className={clsx(
                    'inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full',
                    table.is_active
                      ? 'bg-white/60 text-[#3B6D11]'
                      : 'bg-white/60 text-[#888780]'
                  )}>
                    {table.is_active ? 'Activa' : 'Inactiva'}
                  </span>

                  {/* Hover actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => openModal(table)}
                      className="p-1 bg-white rounded-lg shadow text-calipso hover:text-calipso-700"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => deleteTable(table.id).then(load)}
                      className="p-1 bg-white rounded-lg shadow text-coral hover:text-coral-hover"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      }

      {filtered.length === 0 && (
        <div className="text-center py-20 text-ink-secondary">
          <div className="text-5xl mb-4">🪑</div>
          <p className="font-display italic text-lg">No hay mesas en esta sección</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.table ? `Editar Mesa #${modal.table.number}` : 'Nueva Mesa'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4 font-body">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de mesa *"
              type="number"
              min="1"
              value={form.number ?? ''}
              onChange={e => setForm(f => ({ ...f, number: Number(e.target.value) }))}
            />
            <Input
              label="Capacidad *"
              type="number"
              min="1"
              max="20"
              value={form.capacity ?? ''}
              onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
            />
            <Select
              label="Ubicación"
              value={form.location ?? 'interior'}
              onChange={e => setForm(f => ({ ...f, location: e.target.value as TableLocation }))}
            >
              <option value="terraza">Terraza</option>
              <option value="interior">Interior</option>
              <option value="barra">Barra</option>
            </Select>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded accent-calipso"
                />
                Mesa activa
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal({ open: false })}
              className="flex-1 border border-calipso-200 text-ink-secondary py-2.5 rounded-card text-sm font-medium hover:bg-calipso-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-coral hover:bg-coral-hover text-white py-2.5 rounded-card text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
