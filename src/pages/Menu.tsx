import { useState, useEffect, useRef } from 'react'
import { getCategories, getMenuItems } from '../lib/api'
import type { Category, MenuItem } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { AlertCircle } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

// ── Type tokens ──────────────────────────────────────────────────────────────

const T = {
  heading:     { fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300 } as React.CSSProperties,
  dishName:    { fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: '18px' } as React.CSSProperties,
  price:       { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400, fontSize: '17px' } as React.CSSProperties,
  label:       { fontFamily: 'Jost, system-ui, sans-serif', fontWeight: 400, letterSpacing: '0.25em', textTransform: 'uppercase' as const },
  desc:        { fontFamily: 'Jost, system-ui, sans-serif', fontWeight: 300, fontSize: '11.5px', lineHeight: 1.65 } as React.CSSProperties,
  ui:          { fontFamily: 'Jost, system-ui, sans-serif', fontWeight: 400 } as React.CSSProperties,
  catNav:      { fontFamily: 'Jost, system-ui, sans-serif', fontWeight: 400, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const },
}

const INK       = '#1C2B2D'
const INK55     = 'rgba(28,43,45,0.55)'
const INK08     = 'rgba(28,43,45,0.08)'
const INK20DOT  = 'rgba(28,43,45,0.20)'
const CALIPSO   = '#29B5D0'
const PAPER     = '#FDFAF5'
const HOVER_BG  = '#F7F2E8'

// ── Allergen badge component ──────────────────────────────────────────────────

const allergenConfig: Record<string, { label: string; bg: string; color: string }> = {
  gluten:     { label: 'Contiene gluten',  bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  lacteos:    { label: 'Contiene lácteos', bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  moluscos:   { label: 'Moluscos',         bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  crustaceos: { label: 'Crustáceos',       bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  pescado:    { label: 'Pescado',          bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  nueces:     { label: 'Frutos secos',     bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  huevos:     { label: 'Huevos',           bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
  soja:       { label: 'Soja',             bg: 'rgba(186,117,23,0.12)',  color: '#854F0B' },
}

function AllergenBadge({ allergen }: { allergen: string }) {
  const cfg = allergenConfig[allergen]
  if (!cfg) return null
  return (
    <span style={{
      ...T.label,
      fontSize: '9px',
      letterSpacing: '0.15em',
      background: cfg.bg,
      color: cfg.color,
      padding: '2px 6px',
      borderRadius: '2px',
    }}>
      {cfg.label}
    </span>
  )
}

// ── Featured "Plato del día" — full-width dark card ──────────────────────────

function FeaturedCard({ item }: { item: MenuItem }) {
  return (
    <div
      className="col-span-full"
      style={{
        background: INK,
        padding: '24px 28px',
        borderTop: `1px solid ${INK08}`,
        borderBottom: `1px solid ${INK08}`,
      }}
    >
      {/* Label */}
      <p style={{ ...T.label, fontSize: '9px', letterSpacing: '0.25em', color: CALIPSO, marginBottom: '12px' }}>
        — Plato del día —
      </p>

      {/* Image if present */}
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 0, display: 'block', marginBottom: '16px' }}
        />
      )}

      {/* Name + price row */}
      <div className="flex items-baseline gap-3">
        <span style={{ ...T.dishName, fontSize: '22px', color: 'white', fontWeight: 300 }}>
          {item.name}
        </span>
        <div className="flex-1" style={{ borderBottom: `1px dotted rgba(255,255,255,0.15)`, marginBottom: '4px' }} />
        <span style={{ ...T.price, fontSize: '19px', color: CALIPSO }}>
          {formatPrice(item.price)}
        </span>
      </div>

      {/* Description */}
      {item.description && (
        <p style={{ ...T.desc, color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
          {item.description}
        </p>
      )}

      {/* Allergens */}
      {item.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.allergens.map(a => (
            <span key={a} style={{
              ...T.label,
              fontSize: '9px',
              letterSpacing: '0.12em',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              padding: '2px 6px',
              borderRadius: '2px',
            }}>
              {allergenConfig[a]?.label ?? a}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Standard dish row — print-style ─────────────────────────────────────────

function DishRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${INK08}`,
        background: !item.is_available ? PAPER : hovered ? HOVER_BG : PAPER,
        opacity: item.is_available ? 1 : 0.45,
        transition: 'background 150ms ease',
      }}
    >
      {/* Image (optional) */}
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 0, display: 'block', marginBottom: '12px' }}
        />
      )}

      {/* Name ··· Price row */}
      <div className="flex items-baseline gap-2">
        <span style={{ ...T.dishName, color: INK, flexShrink: 0, maxWidth: '55%' }}>
          {item.name}
        </span>
        {/* Dotted leader */}
        <div
          className="flex-1"
          style={{ borderBottom: `1px dotted ${INK20DOT}`, minWidth: '24px', marginBottom: '3px' }}
        />
        <span style={{ ...T.price, color: INK, flexShrink: 0 }}>
          {formatPrice(item.price)}
        </span>
      </div>

      {/* Description */}
      {item.description && (
        <p style={{ ...T.desc, color: INK55, marginTop: '5px' }}>
          {item.description}
        </p>
      )}

      {/* Tags row */}
      {(item.allergens.length > 0 || !item.is_available) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {!item.is_available && (
            <span style={{
              ...T.label,
              fontSize: '9px',
              letterSpacing: '0.15em',
              background: 'rgba(232,89,60,0.10)',
              color: '#993C1D',
              padding: '2px 6px',
              borderRadius: '2px',
            }}>
              Sin stock
            </span>
          )}
          {item.allergens.map(a => <AllergenBadge key={a} allergen={a} />)}
        </div>
      )}
    </div>
  )
}

// ── Section ornament ──────────────────────────────────────────────────────────

function Ornament() {
  return (
    <div className="text-center py-8">
      <span style={{ color: CALIPSO, opacity: 0.4, letterSpacing: '8px', fontSize: '14px' }}>· · ·</span>
    </div>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-2">
      <div className="flex-1" style={{ borderBottom: `1px solid ${INK08}` }} />
      <span style={{
        ...T.label,
        fontSize: '10px',
        letterSpacing: '0.35em',
        color: INK,
        opacity: 0.4,
      }}>
        {name}
      </span>
      <div className="flex-1" style={{ borderBottom: `1px solid ${INK08}` }} />
    </div>
  )
}

// ── Main Menu page ────────────────────────────────────────────────────────────

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const navRef = useRef<HTMLDivElement>(null)
  const [navSticky, setNavSticky] = useState(false)

  useEffect(() => {
    Promise.all([getCategories(), getMenuItems()])
      .then(([cats, its]) => { setCategories(cats); setItems(its) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return
      setNavSticky(window.scrollY > navRef.current.offsetTop - 68)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER, paddingTop: '68px' }}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="md" />
        <p style={{ ...T.label, fontSize: '10px', letterSpacing: '0.25em', color: INK55 }}>Cargando la carta…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER, paddingTop: '68px' }}>
      <div className="text-center p-8 space-y-3">
        <AlertCircle size={36} style={{ color: '#993C1D', margin: '0 auto' }} />
        <p style={{ ...T.heading, fontSize: '22px', color: INK }}>No pudimos cargar la carta</p>
        <p style={{ ...T.desc, color: INK55 }}>{error}</p>
      </div>
    </div>
  )

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category_id === activeCategory)

  const sections = categories
    .filter(c => activeCategory === 'all' || c.id === activeCategory)
    .map(cat => ({
      ...cat,
      featured: filtered.filter(i => i.category_id === cat.id && i.is_featured),
      standard: filtered.filter(i => i.category_id === cat.id && !i.is_featured),
    }))
    .filter(s => s.featured.length + s.standard.length > 0)

  return (
    <div style={{ background: PAPER, minHeight: '100vh' }}>

      {/* ── Dark header section ─────────────────────────────── */}
      <div style={{ background: INK, paddingTop: '68px' }}>
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-0 text-center relative">

          {/* Language toggle — top right */}
          <div className="absolute top-14 right-6 flex gap-1">
            {(['es', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  ...T.ui,
                  fontSize: '10px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '4px 9px',
                  borderRadius: '2px',
                  border: lang === l ? 'none' : `1px solid rgba(28,43,45,0.15)`,
                  background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: lang === l ? 'white' : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Logo wordmark */}
          <p style={{ ...T.heading, fontSize: '42px', color: 'white', lineHeight: 1.1, marginBottom: '4px' }}>
            Calipso
          </p>
          <p style={{ ...T.label, fontSize: '10px', letterSpacing: '0.35em', color: CALIPSO }}>
            RESTAURANT
          </p>

          {/* Decorative line */}
          <div style={{ width: '60px', height: '1.5px', background: CALIPSO, margin: '14px auto 14px' }} />

          {/* Tagline */}
          <p style={{ ...T.ui, fontSize: '11px', color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', marginBottom: '32px' }}>
            Primera línea costera &nbsp;·&nbsp; Concón, Chile
          </p>
        </div>

        {/* ── Category nav ─────────────────────────────────── */}
        <div ref={navRef} style={{ background: INK, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory('all')}
                style={{
                  ...T.catNav,
                  flexShrink: 0,
                  padding: '14px 16px',
                  color: activeCategory === 'all' ? CALIPSO : 'rgba(255,255,255,0.40)',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeCategory === 'all' ? `2px solid ${CALIPSO}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {lang === 'en' ? 'All' : 'Todo'}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    ...T.catNav,
                    flexShrink: 0,
                    padding: '14px 16px',
                    color: activeCategory === cat.id ? CALIPSO : 'rgba(255,255,255,0.40)',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeCategory === cat.id ? `2px solid ${CALIPSO}` : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky shadow nav clone */}
        {navSticky && (
          <div
            className="fixed top-[68px] left-0 right-0 z-40"
            style={{ background: INK, borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            <div className="max-w-3xl mx-auto px-4">
              <div className="flex overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveCategory('all')}
                  style={{
                    ...T.catNav,
                    flexShrink: 0, padding: '12px 14px',
                    color: activeCategory === 'all' ? CALIPSO : 'rgba(255,255,255,0.40)',
                    background: 'none', border: 'none',
                    borderBottom: activeCategory === 'all' ? `2px solid ${CALIPSO}` : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'en' ? 'All' : 'Todo'}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      ...T.catNav,
                      flexShrink: 0, padding: '12px 14px',
                      color: activeCategory === cat.id ? CALIPSO : 'rgba(255,255,255,0.40)',
                      background: 'none', border: 'none',
                      borderBottom: activeCategory === cat.id ? `2px solid ${CALIPSO}` : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Menu content ──────────────────────────────────── */}
      <div className="max-w-3xl mx-auto">
        {sections.length === 0 ? (
          <div className="text-center py-24">
            <p style={{ ...T.heading, fontSize: '20px', color: INK55 }}>No hay platos en esta categoría</p>
          </div>
        ) : (
          sections.map((section, sIdx) => (
            <section key={section.id} id={`sec-${section.slug}`}>
              {/* Ornament before section (except first) */}
              {sIdx > 0 && <Ornament />}

              {/* Section divider */}
              <SectionDivider name={section.name} />

              {/* Category heading */}
              <div className="text-center py-6 px-6">
                <h2 style={{ ...T.heading, fontSize: '32px', color: INK, lineHeight: 1.1 }}>
                  {section.name}
                </h2>
                {section.description && (
                  <p style={{ ...T.desc, color: INK55, marginTop: '6px', fontSize: '12px' }}>
                    {section.description}
                  </p>
                )}
              </div>

              {/* Items grid — 2 col desktop, 1 col mobile */}
              <div
                className="grid grid-cols-1 md:grid-cols-2"
                style={{ borderTop: `1px solid ${INK08}`, borderLeft: `1px solid ${INK08}`, background: PAPER }}
              >
                {/* Featured items — full width */}
                {section.featured.map(item => (
                  <FeaturedCard key={item.id} item={item} />
                ))}

                {/* Standard items */}
                {section.standard.map((item) => {
                  return (
                    <div
                      key={item.id}
                      style={{ borderRight: `1px solid ${INK08}`, borderBottom: `1px solid ${INK08}` }}
                    >
                      <DishRow item={item} isLast={false} />
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}

        {/* ── Footer of carta ────────────────────────────── */}
        <footer className="text-center py-14 px-6" style={{ borderTop: `1px solid ${INK08}` }}>
          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 20px' }} />

          <p style={{ ...T.label, fontSize: '11px', letterSpacing: '0.15em', color: INK, opacity: 0.35, marginBottom: '4px' }}>
            AV. BORGOÑO 14900 &nbsp;·&nbsp; CONCÓN &nbsp;·&nbsp; +56 9 8765 4321
          </p>
          <p style={{ ...T.label, fontSize: '10px', letterSpacing: '0.1em', color: INK, opacity: 0.28, marginBottom: '20px' }}>
            MAR–VIE 13:00–23:00 &nbsp;·&nbsp; SÁB–DOM 12:30–23:30
          </p>

          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 20px' }} />

          <p style={{ ...T.ui, fontSize: '10px', color: INK, opacity: 0.45, maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>
            Carta sujeta a disponibilidad del producto. Informe a su garzón sobre alergias o
            intolerancias alimentarias. Precios incluyen IVA.
          </p>
        </footer>
      </div>
    </div>
  )
}
