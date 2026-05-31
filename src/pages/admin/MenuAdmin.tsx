import { useState, useEffect } from 'react'
import { getAllMenuItems, getAllCategories, upsertMenuItem, deleteMenuItem, deleteCategory, toggle86MenuItem, upsertCategory } from '../../lib/api'
import type { MenuItem, Category } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Input, TextArea, Select } from '../../components/ui/Input'
import ImageUpload from '../../components/ui/ImageUpload'
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Ban, RotateCcw, Tag } from 'lucide-react'
import clsx from 'clsx'

function formatPrice(p: number) {
  return `$${p.toLocaleString('es-CL')}`
}

const ALLERGEN_LIST = [
  { key: 'pescado',     label: 'Pescado'     },
  { key: 'mariscos',    label: 'Mariscos'    },
  { key: 'moluscos',    label: 'Moluscos'    },
  { key: 'crustaceos',  label: 'Crustáceos'  },
  { key: 'gluten',      label: 'Gluten'      },
  { key: 'lacteos',     label: 'Lácteos'     },
  { key: 'huevos',      label: 'Huevos'      },
  { key: 'nueces',      label: 'Nueces'      },
  { key: 'soja',        label: 'Soja'        },
  { key: 'apio',        label: 'Apio'        },
  { key: 'mostaza',     label: 'Mostaza'     },
  { key: 'sesamo',      label: 'Sésamo'      },
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function MenuAdmin() {
  const [items, setItems]         = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items')

  // Item modal
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: MenuItem }>({ open: false })
  const [itemForm, setItemForm]   = useState<Partial<MenuItem>>({})
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  // Category modal
  const [catModal, setCatModal]   = useState<{ open: boolean; cat?: Category }>({ open: false })
  const [catForm, setCatForm]     = useState<Partial<Category>>({})
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError]   = useState('')

  const load = () => Promise.all([getAllMenuItems(), getAllCategories()])
    .then(([its, cats]) => { setItems(its); setCategories(cats) })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  // ── Item modal ──────────────────────────────────────────────────────────────

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

  const toggleAllergen = (key: string) => {
    setItemForm(f => {
      const curr = f.allergens ?? []
      return {
        ...f,
        allergens: curr.includes(key)
          ? curr.filter(a => a !== key)
          : [...curr, key],
      }
    })
  }

  // ── Category modal ──────────────────────────────────────────────────────────

  const openCatModal = (cat?: Category) => {
    setCatForm(cat ?? { is_active: true, sort_order: 99 })
    setCatError('')
    setCatModal({ open: true, cat })
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catForm.name?.trim()) { setCatError('Nombre requerido'); return }
    setCatSaving(true)
    try {
      await upsertCategory({
        ...(catModal.cat ? { id: catModal.cat.id } : {}),
        name: catForm.name!,
        slug: catForm.slug || slugify(catForm.name!),
        description: catForm.description || null,
        icon: catForm.icon || null,
        sort_order: catForm.sort_order ?? 99,
        is_active: catForm.is_active ?? true,
      })
      await load()
      setCatModal({ open: false })
    } catch (e) {
      setCatError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setCatSaving(false) }
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
        {activeTab === 'items' ? (
          <button
            onClick={() => openItemModal()}
            className="flex items-center gap-1.5 bg-coral hover:bg-coral-hover text-white text-sm font-semibold px-4 py-2 rounded-card transition-all duration-200 mb-1"
          >
            <Plus size={15} /> Agregar plato
          </button>
        ) : (
          <button
            onClick={() => openCatModal()}
            className="flex items-center gap-1.5 bg-calipso hover:bg-calipso-700 text-white text-sm font-semibold px-4 py-2 rounded-card transition-all duration-200 mb-1"
          >
            <Plus size={15} /> Agregar categoría
          </button>
        )}
      </div>

      {/* ── Items tab ── */}
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
                    <div key={item.id} className={clsx(
                      'flex items-center gap-4 px-5 py-3.5 hover:bg-calipso-50/50 transition-colors',
                      item.is_86d && 'bg-amber-50/60'
                    )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={clsx('font-medium text-sm', item.is_86d ? 'text-amber-700 line-through' : 'text-ink')}>
                            {item.name}
                          </span>
                          {item.is_featured && <Star size={12} className="text-calipso fill-calipso/30" />}
                          <Badge variant={item.is_available ? 'available' : 'unavailable'}>
                            {item.is_available ? 'Disponible' : 'Sin stock'}
                          </Badge>
                          {item.is_86d && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              86'd — Agotado hoy
                            </span>
                          )}
                          {item.allergens?.length > 0 && (
                            <span className="text-[10px] text-ink-secondary flex items-center gap-0.5">
                              <Tag size={9} /> {item.allergens.join(', ')}
                            </span>
                          )}
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
                          onClick={() => toggle86MenuItem(item.id, !item.is_86d).then(load)}
                          className={clsx(
                            'p-1.5 rounded-input transition-colors',
                            item.is_86d
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'text-ink-secondary hover:text-amber-600 hover:bg-amber-50'
                          )}
                          title={item.is_86d ? 'Restablecer disponibilidad' : 'Marcar como agotado hoy (86)'}
                        >
                          {item.is_86d ? <RotateCcw size={13} /> : <Ban size={13} />}
                        </button>
                        <button
                          onClick={() => openItemModal(item)}
                          className="p-1.5 text-ink-secondary hover:text-calipso hover:bg-calipso-50 rounded-input transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`¿Eliminar "${item.name}"?`)) deleteMenuItem(item.id).then(load) }}
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

          {items.length === 0 && (
            <div className="py-16 text-center text-ink-secondary">
              <p className="text-sm">No hay platos en la carta. Crea primero una categoría y luego agrega platos.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Categories tab ── */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-card shadow-brand overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center text-ink-secondary">
              <p className="text-sm mb-3">Sin categorías todavía.</p>
              <button onClick={() => openCatModal()} className="text-calipso font-semibold text-sm hover:underline flex items-center gap-1 mx-auto">
                <Plus size={14} /> Crear primera categoría
              </button>
            </div>
          ) : (
            <div className="divide-y divide-calipso/5">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-calipso-50/50 transition-colors">
                  <span className="text-2xl w-9 text-center">{cat.icon ?? '🍽️'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-ink text-sm">{cat.name}</p>
                    <p className="text-ink-secondary text-xs">
                      {cat.slug}
                      {cat.description && ` · ${cat.description}`}
                      {' · '}{items.filter(i => i.category_id === cat.id).length} platos
                    </p>
                  </div>
                  <Badge variant={cat.is_active ? 'available' : 'unavailable'}>
                    {cat.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openCatModal(cat)}
                      className="p-1.5 text-ink-secondary hover:text-calipso hover:bg-calipso-50 rounded-input transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar categoría "${cat.name}"?`)) deleteCategory(cat.id).then(load) }}
                      className="p-1.5 text-ink-secondary hover:text-coral hover:bg-coral-light rounded-input transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Item modal ── */}
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
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
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

          {/* Allergens */}
          <div>
            <p className="text-xs font-semibold text-calipso-700 uppercase tracking-wide mb-2">
              Alérgenos
            </p>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_LIST.map(({ key, label }) => {
                const active = (itemForm.allergens ?? []).includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAllergen(key)}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      active
                        ? 'bg-coral/10 border-coral text-coral'
                        : 'border-calipso-100 text-ink-secondary hover:border-calipso hover:text-ink'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
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
                Disponible en carta
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

      {/* ── Category modal ── */}
      <Modal
        open={catModal.open}
        onClose={() => setCatModal({ open: false })}
        title={catModal.cat ? 'Editar Categoría' : 'Nueva Categoría'}
        size="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 font-body">
          <div className="grid grid-cols-4 gap-3">
            {/* Emoji icon */}
            <div>
              <label className="block text-xs font-semibold text-calipso-700 uppercase tracking-wide mb-1.5">
                Ícono
              </label>
              <input
                type="text"
                placeholder="🦞"
                maxLength={4}
                value={catForm.icon ?? ''}
                onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full border border-calipso-200 rounded-input px-3 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-calipso"
              />
            </div>
            {/* Name */}
            <div className="col-span-3">
              <Input
                label="Nombre *"
                placeholder="Ej: Fondos de Mar"
                value={catForm.name ?? ''}
                onChange={e => {
                  const name = e.target.value
                  setCatForm(f => ({
                    ...f,
                    name,
                    // Auto-fill slug only if not manually edited or is a new category
                    ...(!catModal.cat ? { slug: slugify(name) } : {}),
                  }))
                }}
              />
            </div>
          </div>

          <Input
            label="Slug (URL)"
            placeholder="fondos-de-mar"
            value={catForm.slug ?? ''}
            onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))}
          />

          <TextArea
            label="Descripción (opcional)"
            rows={2}
            placeholder="Breve descripción para la carta digital…"
            value={catForm.description ?? ''}
            onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Orden"
              type="number"
              value={catForm.sort_order ?? 99}
              onChange={e => setCatForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
            />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={catForm.is_active ?? true}
                  onChange={e => setCatForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded accent-calipso"
                />
                <span className="text-ink-secondary">Activa</span>
              </label>
            </div>
          </div>

          {catError && <p className="text-coral text-sm">{catError}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCatModal({ open: false })}
              className="flex-1 border border-calipso-200 text-ink-secondary py-2.5 rounded-card text-sm font-medium hover:bg-calipso-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={catSaving}
              className="flex-1 bg-calipso hover:bg-calipso-700 text-white py-2.5 rounded-card text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {catSaving ? 'Guardando…' : catModal.cat ? 'Actualizar' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
