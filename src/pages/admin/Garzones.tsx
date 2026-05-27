import { useState, useEffect } from 'react'
import { getAllWaiters, upsertWaiter, deleteWaiter } from '../../lib/api'
import type { Waiter } from '../../types'
import { Users, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, UserCheck, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

function initials(name: string) {
  return name.trim().split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_COLORS = [
  'bg-calipso text-white',
  'bg-amber-500 text-white',
  'bg-[#3B6D11] text-white',
  'bg-coral text-white',
  'bg-ink text-white',
  'bg-calipso-700 text-white',
]

export default function Garzones() {
  const [waiters, setWaiters]   = useState<Waiter[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState<string | null>(null)
  const [error,   setError]     = useState<string | null>(null)
  const [newName, setNewName]   = useState('')
  const [adding,  setAdding]    = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setWaiters(await getAllWaiters())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando garzones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving('new')
    setError(null)
    try {
      await upsertWaiter({ name })
      setNewName('')
      setAdding(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agregar')
    } finally {
      setSaving(null)
    }
  }

  const handleToggle = async (w: Waiter) => {
    setSaving(w.id)
    setError(null)
    try {
      await upsertWaiter({ ...w, is_active: !w.is_active })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (w: Waiter) => {
    if (!confirm(`¿Eliminar a ${w.name}? Esta acción no se puede deshacer.`)) return
    setSaving(w.id)
    setError(null)
    try {
      await deleteWaiter(w.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setSaving(null)
    }
  }

  const active   = waiters.filter(w => w.is_active)
  const inactive = waiters.filter(w => !w.is_active)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in font-body">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl text-ink font-bold italic">Garzones</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {active.length} garzon{active.length !== 1 ? 'es' : ''} activo{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-calipso text-white text-sm font-semibold px-4 py-2.5 rounded-input hover:bg-calipso-700 transition-colors"
        >
          <Plus size={15} /> Agregar garzon
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-coral-light text-coral text-sm px-4 py-3 rounded-card">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-card shadow-brand p-5 border-t-4 border-calipso">
          <p className="font-semibold text-ink mb-3">Nuevo garzon</p>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Nombre completo (ej. Ana García)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              className="flex-1 border border-calipso-100 rounded-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || saving === 'new'}
              className="bg-calipso disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-input text-sm hover:bg-calipso-700 transition-colors flex items-center gap-1.5"
            >
              {saving === 'new' ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Agregar
            </button>
            <button
              onClick={() => { setAdding(false); setNewName('') }}
              className="border border-calipso-100 text-ink-secondary px-3 py-2.5 rounded-input text-sm hover:bg-calipso-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Active waiters */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-20 rounded-card" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="text-calipso/30 mb-4" />
          <p className="font-display italic text-xl text-ink">Sin garzones registrados</p>
          <p className="text-sm text-ink-secondary mt-1">Agrega tu equipo para asignarlos a las comandas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {active.map((w, idx) => (
            <WaiterCard
              key={w.id}
              waiter={w}
              colorCls={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
              loading={saving === w.id}
              onToggle={() => handleToggle(w)}
              onDelete={() => handleDelete(w)}
            />
          ))}
        </div>
      )}

      {/* Inactive waiters */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary mb-3">
            Inactivos ({inactive.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
            {inactive.map((w) => (
              <WaiterCard
                key={w.id}
                waiter={w}
                colorCls="bg-ink/20 text-ink-secondary"
                loading={saving === w.id}
                onToggle={() => handleToggle(w)}
                onDelete={() => handleDelete(w)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WaiterCard({ waiter, colorCls, loading, onToggle, onDelete }: {
  waiter: Waiter
  colorCls: string
  loading: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={clsx(
      'bg-white rounded-card shadow-brand p-4 flex items-center gap-4 transition-all',
      waiter.is_active ? 'border-l-4 border-calipso' : 'border-l-4 border-ink/10'
    )}>
      {/* Avatar */}
      <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0', colorCls)}>
        {initials(waiter.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{waiter.name}</p>
        <p className={clsx('text-xs mt-0.5 flex items-center gap-1', waiter.is_active ? 'text-[#3B6D11]' : 'text-ink-secondary')}>
          <UserCheck size={11} />
          {waiter.is_active ? 'Activo' : 'Inactivo'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          disabled={loading}
          title={waiter.is_active ? 'Desactivar' : 'Activar'}
          className="p-2 rounded-input text-ink-secondary hover:text-calipso hover:bg-calipso-50 transition-colors disabled:opacity-50"
        >
          {loading
            ? <RefreshCw size={16} className="animate-spin" />
            : waiter.is_active
              ? <ToggleRight size={20} className="text-calipso" />
              : <ToggleLeft size={20} />
          }
        </button>
        <button
          onClick={onDelete}
          disabled={loading}
          title="Eliminar"
          className="p-2 rounded-input text-ink-secondary hover:text-coral hover:bg-coral-light transition-colors disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
