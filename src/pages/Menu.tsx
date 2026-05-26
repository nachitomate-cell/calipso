import { useState, useEffect, useRef } from 'react'
import { getCategories, getMenuItems } from '../lib/api'
import type { Category, MenuItem } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { AlertCircle } from 'lucide-react'
import { PHOTOS } from '../lib/images'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const INK     = '#1C2B2D'
const INK60   = 'rgba(28,43,45,0.62)'
const INK10   = 'rgba(28,43,45,0.10)'
const CALIPSO = '#29B5D0'
const PAPER   = '#FDFAF5'

const serif  = '"Cormorant Garamond", Georgia, serif'
const sans   = 'Jost, system-ui, sans-serif'

// ── Allergen badge ────────────────────────────────────────────────────────────

const allergenLabels: Record<string, string> = {
  gluten:     'Gluten',
  lacteos:    'Lácteos',
  moluscos:   'Moluscos',
  crustaceos: 'Crustáceos',
  pescado:    'Pescado',
  nueces:     'Frutos secos',
  huevos:     'Huevos',
  soja:       'Soja',
}

function AllergenBadge({ allergen, dark }: { allergen: string; dark?: boolean }) {
  const label = allergenLabels[allergen]
  if (!label) return null
  return (
    <span
      style={{
        fontFamily: sans,
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        padding: '3px 10px',
        borderRadius: '99px',
        border: dark ? '1px solid rgba(255,255,255,0.18)' : `1px solid rgba(186,117,23,0.30)`,
        background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(186,117,23,0.09)',
        color: dark ? 'rgba(255,255,255,0.55)' : '#854F0B',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </span>
  )
}

// ── Featured card ─────────────────────────────────────────────────────────────

function FeaturedCard({ item }: { item: MenuItem }) {
  return (
    <div
      style={{
        background: INK,
        padding: '28px 32px',
        borderBottom: `1px solid ${INK10}`,
      }}
    >
      <p style={{
        fontFamily: sans,
        fontSize: '10px',
        letterSpacing: '0.30em',
        textTransform: 'uppercase',
        color: CALIPSO,
        marginBottom: '16px',
      }}>
        — Plato del día —
      </p>

      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          style={{
            width: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
            display: 'block',
            marginBottom: '20px',
            borderRadius: '2px',
          }}
        />
      )}

      {/* Name + price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', minWidth: 0, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: '28px',
          color: 'white',
          lineHeight: 1.15,
          flex: '1 1 auto',
          minWidth: 0,
        }}>
          {item.name}
        </span>
        <span style={{
          fontFamily: serif,
          fontWeight: 400,
          fontSize: '24px',
          color: CALIPSO,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {formatPrice(item.price)}
        </span>
      </div>

      {item.description && (
        <p style={{
          fontFamily: sans,
          fontWeight: 300,
          fontSize: '14px',
          lineHeight: 1.75,
          color: 'rgba(255,255,255,0.55)',
          marginTop: '10px',
        }}>
          {item.description}
        </p>
      )}

      {item.allergens.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
          {item.allergens.map(a => <AllergenBadge key={a} allergen={a} dark />)}
        </div>
      )}
    </div>
  )
}

// ── Standard dish row ─────────────────────────────────────────────────────────

function DishRow({ item }: { item: MenuItem }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '22px 32px',
        borderBottom: `1px solid ${INK10}`,
        background: hovered && item.is_available ? '#F5F0E6' : PAPER,
        opacity: item.is_available ? 1 : 0.42,
        transition: 'background 200ms ease, box-shadow 200ms ease',
        boxShadow: hovered && item.is_available ? `inset 3px 0 0 ${CALIPSO}` : 'inset 3px 0 0 transparent',
      }}
    >
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          style={{
            width: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
            display: 'block',
            borderRadius: '2px',
            marginBottom: '16px',
          }}
        />
      )}

      {/* Name + dotted leader + price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0 }}>
        <span style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(22px, 4vw, 27px)',
          color: INK,
          lineHeight: 1.2,
          flex: '1 1 auto',
          minWidth: 0,
        }}>
          {item.name}
        </span>

        {/* Dotted leader */}
        <div style={{
          flexShrink: 0,
          flexGrow: 1,
          minWidth: '24px',
          maxWidth: '80px',
          borderBottom: `1.5px dotted rgba(28,43,45,0.18)`,
          marginBottom: '5px',
        }} />

        <span style={{
          fontFamily: serif,
          fontWeight: 400,
          fontSize: 'clamp(20px, 3.5vw, 24px)',
          color: CALIPSO,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {formatPrice(item.price)}
        </span>
      </div>

      {item.description && (
        <p style={{
          fontFamily: sans,
          fontWeight: 300,
          fontSize: '14px',
          lineHeight: 1.75,
          color: INK60,
          marginTop: '6px',
        }}>
          {item.description}
        </p>
      )}

      {(item.allergens.length > 0 || !item.is_available) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '12px' }}>
          {!item.is_available && (
            <span style={{
              fontFamily: sans,
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: '99px',
              border: '1px solid rgba(232,89,60,0.25)',
              background: 'rgba(232,89,60,0.08)',
              color: '#993C1D',
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

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ category }: { category: Category }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 32px 28px',
        borderBottom: `1px solid ${INK10}`,
        background: PAPER,
      }}
    >
      {/* Category icon / emoji */}
      {category.icon && (
        <div style={{
          fontSize: '38px',
          lineHeight: 1,
          marginBottom: '14px',
          filter: 'grayscale(0.15)',
        }}>
          {category.icon}
        </div>
      )}

      {/* Category name */}
      <h2 style={{
        fontFamily: serif,
        fontStyle: 'italic',
        fontWeight: 300,
        fontSize: 'clamp(34px, 6vw, 46px)',
        color: INK,
        lineHeight: 1.1,
        marginBottom: category.description ? '10px' : 0,
      }}>
        {category.name}
      </h2>

      {/* Decorative bar */}
      <div style={{
        width: '36px',
        height: '2px',
        background: CALIPSO,
        margin: `${category.description ? '12px' : '14px'} auto ${category.description ? '12px' : '0'}`,
      }} />

      {category.description && (
        <p style={{
          fontFamily: sans,
          fontWeight: 300,
          fontSize: '13.5px',
          lineHeight: 1.7,
          color: INK60,
          maxWidth: '480px',
          margin: '0 auto',
        }}>
          {category.description}
        </p>
      )}
    </div>
  )
}

// ── Ornament between sections ─────────────────────────────────────────────────

function Ornament() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', background: PAPER }}>
      <span style={{ color: CALIPSO, opacity: 0.45, letterSpacing: '10px', fontSize: '13px' }}>· · ·</span>
    </div>
  )
}

// ── Main Menu page ────────────────────────────────────────────────────────────

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems]           = useState<MenuItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [lang, setLang]             = useState<'es' | 'en'>('es')
  const navRef  = useRef<HTMLDivElement>(null)
  const [navSticky, setNavSticky]   = useState(false)

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
    <div style={{ minHeight: '100vh', background: PAPER, paddingTop: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <LoadingSpinner size="md" />
        <p style={{ fontFamily: sans, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: INK60, marginTop: '16px' }}>
          Cargando la carta…
        </p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: PAPER, paddingTop: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <AlertCircle size={38} style={{ color: '#993C1D', margin: '0 auto 16px' }} />
        <p style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 300, fontSize: '24px', color: INK, marginBottom: '8px' }}>
          No pudimos cargar la carta
        </p>
        <p style={{ fontFamily: sans, fontSize: '14px', color: INK60 }}>{error}</p>
      </div>
    </div>
  )

  const filtered = activeCategory === 'all'
    ? items
    : items.filter(i => i.category_id === activeCategory)

  const sections = categories
    .filter(c => activeCategory === 'all' || c.id === activeCategory)
    .map(cat => ({
      ...cat,
      featured: filtered.filter(i => i.category_id === cat.id && i.is_featured),
      standard: filtered.filter(i => i.category_id === cat.id && !i.is_featured),
    }))
    .filter(s => s.featured.length + s.standard.length > 0)

  // Shared nav pills renderer
  const NavPills = ({ compact }: { compact?: boolean }) => (
    <div style={{ display: 'flex', overflowX: 'auto', gap: 0, scrollbarWidth: 'none' }}>
      {[{ id: 'all', name: lang === 'en' ? 'All' : 'Todo', icon: null }, ...categories].map(cat => {
        const active = activeCategory === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              flexShrink: 0,
              padding: compact ? '11px 16px' : '14px 18px',
              fontFamily: sans,
              fontSize: '12px',
              fontWeight: active ? 600 : 400,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: active ? CALIPSO : 'rgba(255,255,255,0.65)',
              background: 'none',
              border: 'none',
              borderBottom: active ? `2.5px solid ${CALIPSO}` : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {'icon' in cat && cat.icon ? `${cat.icon} ` : ''}{cat.name}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{ background: PAPER, minHeight: '100vh' }}>

      {/* ── Hero header ──────────────────────────────────────── */}
      <div style={{ position: 'relative', background: INK, paddingTop: '68px', overflow: 'hidden' }}>
        {PHOTOS.menuHero && (
          <>
            <img
              src={PHOTOS.menuHero}
              alt=""
              aria-hidden="true"
              onError={e => { e.currentTarget.style.display = 'none' }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(28,43,45,0.58), rgba(28,43,45,0.80))' }} />
          </>
        )}

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '52px 24px 0', textAlign: 'center', position: 'relative', zIndex: 1 }}>

          {/* Language toggle */}
          <div style={{ position: 'absolute', top: '56px', right: '24px', display: 'flex', gap: '4px' }}>
            {(['es', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  fontFamily: sans,
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  border: lang === l ? 'none' : '1px solid rgba(255,255,255,0.18)',
                  background: lang === l ? 'rgba(255,255,255,0.14)' : 'transparent',
                  color: lang === l ? 'white' : 'rgba(255,255,255,0.38)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Wordmark — large */}
          <p style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(54px, 10vw, 72px)',
            color: 'white',
            lineHeight: 1,
            marginBottom: '6px',
            letterSpacing: '-0.01em',
          }}>
            Calipso
          </p>
          <p style={{
            fontFamily: sans,
            fontWeight: 400,
            fontSize: '12px',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: CALIPSO,
          }}>
            Restaurant
          </p>

          <div style={{ width: '52px', height: '1.5px', background: CALIPSO, margin: '18px auto 16px' }} />

          <p style={{
            fontFamily: sans,
            fontWeight: 300,
            fontSize: '12px',
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: '0.10em',
            marginBottom: '44px',
          }}>
            Primera línea costera &nbsp;·&nbsp; Concón, Chile
          </p>
        </div>

        {/* ── Category nav ─────────────────────────────────── */}
        <div
          ref={navRef}
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: INK }}
        >
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px' }}>
            <NavPills />
          </div>
        </div>

        {/* Sticky nav clone */}
        {navSticky && (
          <div style={{
            position: 'fixed',
            top: '68px',
            left: 0,
            right: 0,
            zIndex: 40,
            background: INK,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px' }}>
              <NavPills compact />
            </div>
          </div>
        )}
      </div>

      {/* ── Menu sections ────────────────────────────────────── */}
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '96px 32px' }}>
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 300, fontSize: '22px', color: INK60 }}>
              No hay platos en esta categoría
            </p>
          </div>
        ) : (
          sections.map((section, idx) => (
            <section key={section.id} id={`sec-${section.slug}`}>
              {idx > 0 && <Ornament />}

              <SectionHeader category={section} />

              {section.featured.map(item => (
                <FeaturedCard key={item.id} item={item} />
              ))}

              {section.standard.map(item => (
                <DishRow key={item.id} item={item} />
              ))}
            </section>
          ))
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer style={{ textAlign: 'center', padding: '56px 32px 72px', borderTop: `1px solid ${INK10}` }}>
          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 22px' }} />

          <p style={{
            fontFamily: sans,
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: INK,
            opacity: 0.38,
            marginBottom: '6px',
          }}>
            Av. Borgoño 14900 &nbsp;·&nbsp; Concón &nbsp;·&nbsp; +56 9 8765 4321
          </p>
          <p style={{
            fontFamily: sans,
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: INK,
            opacity: 0.30,
            marginBottom: '22px',
          }}>
            Mar–Vie 13:00–23:00 &nbsp;·&nbsp; Sáb–Dom 12:30–23:30
          </p>

          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 22px' }} />

          <p style={{
            fontFamily: sans,
            fontWeight: 300,
            fontSize: '12px',
            color: INK,
            opacity: 0.42,
            maxWidth: '400px',
            margin: '0 auto',
            lineHeight: 1.75,
          }}>
            Carta sujeta a disponibilidad del producto. Informe a su garzón sobre
            alergias o intolerancias alimentarias. Precios incluyen IVA.
          </p>
        </footer>
      </div>
    </div>
  )
}
