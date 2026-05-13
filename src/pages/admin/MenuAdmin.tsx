import { useState, useEffect } from 'react'
import { getAllMenuItems, getAllCategories, upsertMenuItem, deleteMenuItem, deleteCategory } from '../../lib/api'
import type { MenuItem, Category } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Input, TextArea, Select } from '../../components/ui/Input'
import ImageUpload from '../../components/ui/ImageUpload'
import { Plus, Pencil, Trash2, Eye, EyeOff, Star } from 'lucide-react'
import clsx from 'clsx'

function formatPrice(p: number) {
  return `$${p.toLocaleString('es-CL')}`
}

export default function MenuAdmin() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items')

  const [itemModal, setItemModal] = useState<{ open: boolean; item?: MenuItem }>({ open: false })
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => Promise.all([getAllMenuItems(), getAllCategories()])
    .then(([its, cats]) => { setItems(its); setCategories(cats) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openItemModal = (item?: MenuItem) => {
    setItemForm(item ?? { is_available: true, is_featured: false, allergens: [], sort_order: 99 })
    setFormError('')
    setItemModal({ open: true, item })
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.name?.trim() || !itemForm.category_id || !itemForm.price) {
      setFormError('Nombre, categoría y precio son obligatorios')
      return
    }
    setSaving(true)
    try {
      await upsertMenuItem({
        ...(itemModal.item ? { id: itemModal.item.id } : {}),
        name: itemForm.name!,
        category_id: itemForm.category_id!,
        price: Number(itemForm.price),
        description: itemForm.description || null,
        image_url: itemForm.image_url || null,
        is_available: itemForm.is_available ?? true,
        is_featured: itemForm.is_featured ?? false,
        allergens: itemForm.allergens ?? [],
        sort_order: itemForm.sort_order ?? 99,
      })
      await load()
      setItemModal({ open: false })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in font-body">
      {/* Tab bar */}
      <div className="flex items-end gap-1 border-b border-calipso/15">
        {(['items', 'categories'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200',
              activeTab === tab
                ? 'border-calipso text-calipso'
                : 'border-transparent text-ink-secondary hover:text-ink'
            )}
          >
            {tab === 'items' ? `Platos (${items.length})` : `Categorías (${categories.length})`}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => openItemModal()}
          className="flex items-center gap-1.5 bg-coral hover:bg-coral-hover text-white text-sm font-semibold px-4 py-2 rounded-card transition-all duration-200 mb-1"
        >
          <Plus size={15} />
          Agregar plato
        </button>
      </div>

      {/* Items tab */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category_id === cat.id)
            if (!catItems.length) return null
            return (
              <div key={cat.id} className="bg-white rounded-card shadow-brand overflow-hidden">
                <div className="px-5 py-3 bg-calipso-50 border-b border-calipso/10 flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  <h3 className="font-semibold text-ink text-sm">{cat.name}</h3>
                  <span className="text-xs text-ink-secondary">({catItems.length})</span>
                </div>
                <div className="divide-y divide-calipso/5">
                  {catItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-calipso-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-ink text-sm">{item.name}</span>
                          {item.is_featured && <Star size={12} className="text-calipso fill-calipso/30" />}
                          <Badge variant={item.is_available ? 'available' : 'unavailable'}>
                            {item.is_available ? 'Disponible' : 'Sin stock'}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-ink-secondary text-xs mt-0.5 truncate max-w-md">{item.description}</p>
                        )}
                      </div>
                      <span className="font-semibold text-calipso text-sm tabular-nums flex-shrink-0">
                        {formatPrice(item.price)}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openItemModal(item)}
                          className="p-1.5 text-ink-secondary hover:text-calipso hover:bg-calipso-50 rounded-input transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id).then(load)}
                          className="p-1.5 text-ink-secondary hover:text-coral hover:bg-coral-light rounded-input transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Categories tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-card shadow-brand overflow-hidden">
          <div className="divide-y divide-calipso/5">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-calipso-50/50 transition-colors">
                <span className="text-2xl">{cat.icon ?? '🍽️'}</span>
                <div className="flex-1">
                  <p className="font-medium text-ink text-sm">{cat.name}</p>
                  <p className="text-ink-secondary text-xs">{cat.slug} · {items.filter(i => i.category_id === cat.id).length} platos</p>
                </div>
                <Badge variant={cat.is_active ? 'available' : 'unavailable'}>
                  {cat.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
                <button
                  onClick={() => deleteCategory(cat.id).then(load)}
                  className="p-1.5 text-ink-secondary hover:text-coral hover:bg-coral-light rounded-input transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={itemModal.open}
        onClose={() => setItemModal({ open: false })}
        title={itemModal.item ? 'Editar Plato' : 'Agregar Plato'}
        size="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 font-body">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre del plato *"
                placeholder="Ej: Congrio al Horno"
                value={itemForm.name ?? ''}
                onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <Select
              label="Categoría *"
              value={itemForm.category_id ?? ''}
              onChange={e => setItemForm(f => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input
              label="Precio (CLP) *"
              type="number"
              min="0"
              placeholder="12900"
              value={itemForm.price ?? ''}
              onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))}
            />
            <div className="col-span-2">
              <TextArea
                label="Descripción"
                rows={3}
                placeholder="Descripción del plato…"
                value={itemForm.description ?? ''}
                onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <ImageUpload
                currentUrl={itemForm.image_url}
                itemId={itemModal.item?.id}
                onUpload={url => setItemForm(f => ({ ...f, image_url: url }))}
                onClear={() => setItemForm(f => ({ ...f, image_url: undefined }))}
              />
            </div>
            <Input
              label="Orden de aparición"
              type="number"
              value={itemForm.sort_order ?? 99}
              onChange={e => setItemForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
            />
          </div>

          <div className="flex gap-5 pt-1">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={itemForm.is_available ?? true}
                onChange={e => setItemForm(f => ({ ...f, is_available: e.target.checked }))}
                className="rounded accent-calipso"
              />
              <span className="flex items-center gap-1 text-ink-secondary">
                {itemForm.is_available ? <Eye size={13} /> : <EyeOff size={13} />}
                Disponible
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={itemForm.is_featured ?? false}
                onChange={e => setItemForm(f => ({ ...f, is_featured: e.target.checked }))}
                className="rounded accent-calipso"
              />
              <span className="flex items-center gap-1 text-ink-secondary">
                <Star size={13} /> Plato del día
              </span>
            </label>
          </div>

          {formError && <p className="text-coral text-sm">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setItemModal({ open: false })}
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
