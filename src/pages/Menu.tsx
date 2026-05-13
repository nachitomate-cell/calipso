import { useState, useEffect } from 'react'
import { getCategories, getMenuItems } from '../lib/api'
import type { Category, MenuItem } from '../types'
import { PageLoader } from '../components/ui/LoadingSpinner'
import { AlertCircle } from 'lucide-react'
import clsx from 'clsx'

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

const allergenLabels: Record<string, string> = {
  pescado: 'Pescado', moluscos: 'Moluscos', crustaceos: 'Crustáceos',
  gluten: 'Gluten', lacteos: 'Lácteos', huevos: 'Huevos',
  nueces: 'Frutos secos', soja: 'Soja',
}

function AllergenTag({ allergen }: { allergen: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border border-calipso-200 text-calipso-700 font-medium">
      {allergenLabels[allergen] ?? allergen}
    </span>
  )
}

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <div className={clsx(
      'bg-white rounded-card shadow-brand border border-transparent overflow-hidden transition-all duration-200 group',
      item.is_available
        ? 'hover:-translate-y-0.5 hover:shadow-brand-md hover:border-calipso/10'
        : 'opacity-50'
    )}>
      {/* Image placeholder — 4:3 ratio */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full aspect-[4/3] object-cover"
        />
      ) : (
        <div className="w-full aspect-[4/3] bg-calipso-50 flex items-center justify-center text-5xl">
          🍽️
        </div>
      )}

      <div className="p-5">
        {/* Name + badges */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display text-ink font-bold text-[17px] leading-snug flex-1">{item.name}</h3>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            {item.is_featured && (
              <span className="text-[10px] bg-calipso text-white px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wide">
                Plato del día
              </span>
            )}
            {!item.is_available && (
              <span className="text-[10px] bg-coral text-white px-2.5 py-0.5 rounded-full font-medium">
                Sin stock
              </span>
            )}
          </div>
        </div>

        {item.description && (
          <p className="text-ink-secondary text-sm leading-relaxed">{item.description}</p>
        )}

        {item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.allergens.map(a => <AllergenTag key={a} allergen={a} />)}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-calipso/10">
          <span className="font-semibold text-calipso text-lg tabular-nums">
            {formatPrice(item.price)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    Promise.all([getCategories(), getMenuItems()])
      .then(([cats, its]) => { setCategories(cats); setItems(its) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-calipso-50 pt-[68px]"><PageLoader /></div>
  )

  if (error) return (
    <div className="min-h-screen bg-calipso-50 pt-[68px] flex items-center justify-center">
      <div className="text-center p-8">
        <AlertCircle size={44} className="text-coral mx-auto mb-4" />
        <p className="font-display text-ink text-xl font-bold mb-1">No pudimos cargar la carta</p>
        <p className="text-ink-secondary text-sm">{error}</p>
      </div>
    </div>
  )

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(i => i.category_id === activeCategory)

  const itemsByCategory = categories
    .filter(c => activeCategory === 'all' || c.id === activeCategory)
    .map(cat => ({ ...cat, items: filteredItems.filter(i => i.category_id === cat.id) }))
    .filter(c => c.items.length > 0)

  return (
    <div className="min-h-screen bg-calipso-50 font-body">
      {/* Header */}
      <div className="bg-calipso pt-[68px] pb-14 px-4 text-center">
        <p className="text-white/60 text-[10px] tracking-[0.3em] uppercase mb-4 font-light">Cocina de Mar</p>
        <h1 className="font-display text-5xl md:text-7xl text-white font-bold italic">La Carta</h1>
        <div className="w-12 h-px bg-white/30 mx-auto mt-5" />
        <p className="text-white/50 text-xs mt-4 max-w-sm mx-auto">
          Carta de temporada · Precios incluyen IVA · Consulte alergias a su garzón
        </p>
      </div>

      {/* Category filter bar */}
      <div className="sticky top-[68px] z-30 bg-white/95 backdrop-blur-sm border-b border-calipso/10 shadow-brand">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-card text-sm font-medium transition-all duration-200',
                activeCategory === 'all'
                  ? 'bg-calipso text-white shadow-brand'
                  : 'text-ink-secondary hover:text-calipso hover:bg-calipso-50'
              )}
            >
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-card text-sm font-medium transition-all duration-200',
                  activeCategory === cat.id
                    ? 'bg-calipso text-white shadow-brand'
                    : 'text-ink-secondary hover:text-calipso hover:bg-calipso-50'
                )}
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {itemsByCategory.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌊</div>
            <p className="text-ink-secondary font-display italic text-lg">No hay platos en esta categoría.</p>
          </div>
        ) : (
          itemsByCategory.map(cat => (
            <section key={cat.id} id={`cat-${cat.slug}`} className="animate-fade-in">
              <div className="flex items-center gap-4 mb-8">
                {cat.icon && <span className="text-3xl">{cat.icon}</span>}
                <div>
                  <h2 className="font-display text-2xl md:text-3xl text-ink font-bold italic">{cat.name}</h2>
                  {cat.description && (
                    <p className="text-ink-secondary text-sm mt-0.5">{cat.description}</p>
                  )}
                </div>
                <div className="flex-1 h-px bg-calipso/15 ml-2" />
              </div>
              {/* 1 col mobile / 2 tablet / 3 desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cat.items.map(item => <MenuCard key={item.id} item={item} />)}
              </div>
            </section>
          ))
        )}

        <p className="text-center text-ink-secondary/40 text-xs pb-4">
          Carta sujeta a disponibilidad de producto · Informe alergias a su garzón
        </p>
      </div>
    </div>
  )
}
