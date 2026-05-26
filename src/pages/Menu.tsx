import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, getMenuItems } from '../lib/api'
import type { Category, MenuItem } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { AlertCircle } from 'lucide-react'
import { PHOTOS } from '../lib/images'

// ── Design tokens ─────────────────────────────────────────────────────────────

const INK     = '#1C2B2D'
const INK60   = 'rgba(28,43,45,0.62)'
const INK10   = 'rgba(28,43,45,0.10)'
const CALIPSO = '#29B5D0'
const CORAL   = '#E8593C'
const PAPER   = '#FDFAF5'
const serif   = '"Cormorant Garamond", Georgia, serif'
const sans    = 'Jost, system-ui, sans-serif'

// ── Restriction filters ───────────────────────────────────────────────────────

const RESTRICTIONS = [
  { id: 'sin-gluten',   label: 'Sin gluten',   excludes: ['gluten'] },
  { id: 'sin-lacteos',  label: 'Sin lácteos',  excludes: ['lacteos'] },
  { id: 'sin-mariscos', label: 'Sin mariscos', excludes: ['moluscos', 'crustaceos', 'pescado'] },
]

// ── Allergen config ───────────────────────────────────────────────────────────

const ALLERGEN: Record<string, { label: string; icon: string }> = {
  gluten:     { label: 'Gluten',       icon: '🌾' },
  lacteos:    { label: 'Lácteos',      icon: '🥛' },
  moluscos:   { label: 'Moluscos',     icon: '🦪' },
  crustaceos: { label: 'Crustáceos',   icon: '🦐' },
  pescado:    { label: 'Pescado',      icon: '🐟' },
  nueces:     { label: 'Frutos secos', icon: '🌰' },
  huevos:     { label: 'Huevos',       icon: '🥚' },
  soja:       { label: 'Soja',         icon: '🫘' },
}

// ── Allergen badge ────────────────────────────────────────────────────────────

function AllergenBadge({ allergen, dark }: { allergen: string; dark?: boolean }) {
  const cfg = ALLERGEN[allergen]
  if (!cfg) return null
  return (
    <span style={{
      fontFamily: sans,
      fontSize: '11.5px',
      fontWeight: 500,
      letterSpacing: '0.05em',
      padding: '3px 10px',
      borderRadius: '99px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      border: dark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(186,117,23,0.28)',
      background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(186,117,23,0.08)',
      color: dark ? 'rgba(255,255,255,0.55)' : '#854F0B',
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{ fontSize: '12px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ── Dish row ──────────────────────────────────────────────────────────────────

function DishRow({ item }: { item: MenuItem }) {
  const [hovered, setHovered] = useState(false)
  const featured = item.is_featured

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '22px 32px',
        borderBottom: `1px solid ${INK10}`,
        background: featured
          ? hovered ? '#EEF9FC' : '#F5FBFD'
          : hovered ? '#F5F0E6' : PAPER,
        opacity: item.is_available ? 1 : 0.42,
        transition: 'background 200ms ease, box-shadow 200ms ease',
        boxShadow: featured
          ? `inset 3px 0 0 ${CALIPSO}`
          : hovered && item.is_available ? `inset 3px 0 0 ${CALIPSO}` : 'inset 3px 0 0 transparent',
      }}
    >
      {/* Inner layout: text left, thumbnail right */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* Left: all text content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Chef badge */}
          {featured && (
            <p style={{
              fontFamily: sans,
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: CALIPSO,
              marginBottom: '8px',
            }}>
              ★ Chef recomienda
            </p>
          )}

          {/* ── Desktop: Name ··· Price (one line) ── */}
          <div className="hidden sm:flex items-baseline gap-2" style={{ minWidth: 0 }}>
            <span style={{
              fontFamily: serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(22px, 3.5vw, 27px)',
              color: INK,
              lineHeight: 1.2,
              flex: '1 1 auto',
              minWidth: 0,
            }}>
              {item.name}
            </span>
            <div
              className="flex-1 min-w-6 max-w-20 flex-shrink-0"
              style={{ borderBottom: '1.5px dotted rgba(28,43,45,0.18)', marginBottom: 5 }}
            />
            <span style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: 'clamp(20px, 3vw, 24px)',
              color: CALIPSO,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {`$${item.price.toLocaleString('es-CL')}`}
            </span>
          </div>

          {/* ── Mobile: Name, then Price below ── */}
          <div className="sm:hidden">
            <div style={{
              fontFamily: serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: '24px',
              color: INK,
              lineHeight: 1.2,
            }}>
              {item.name}
            </div>
            <div style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: '22px',
              color: CALIPSO,
              marginTop: '5px',
            }}>
              {`$${item.price.toLocaleString('es-CL')}`}
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: '14px',
              lineHeight: 1.75,
              color: INK60,
              marginTop: '7px',
            }}>
              {item.description}
            </p>
          )}

          {/* Badges row */}
          {(item.allergens.length > 0 || !item.is_available) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
              {!item.is_available && (
                <span style={{
                  fontFamily: sans,
                  fontSize: '11.5px',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  padding: '3px 10px',
                  borderRadius: '99px',
                  border: '1px solid rgba(232,89,60,0.28)',
                  background: 'rgba(232,89,60,0.07)',
                  color: '#993C1D',
                }}>
                  Sin stock
                </span>
              )}
              {item.allergens.map(a => <AllergenBadge key={a} allergen={a} />)}
            </div>
          )}
        </div>

        {/* Right: square thumbnail */}
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            style={{
              width: '96px',
              height: '96px',
              objectFit: 'cover',
              borderRadius: '4px',
              flexShrink: 0,
              alignSelf: 'flex-start',
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ category }: { category: Category }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 32px 28px',
      borderBottom: `1px solid ${INK10}`,
    }}>
      {category.icon && (
        <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '14px' }}>
          {category.icon}
        </div>
      )}
      <h2 style={{
        fontFamily: serif,
        fontStyle: 'italic',
        fontWeight: 300,
        fontSize: 'clamp(34px, 6vw, 46px)',
        color: INK,
        lineHeight: 1.1,
      }}>
        {category.name}
      </h2>
      <div style={{ width: '36px', height: '2px', background: CALIPSO, margin: '14px auto' }} />
      {category.description && (
        <p style={{
          fontFamily: sans,
          fontWeight: 300,
          fontSize: '13.5px',
          lineHeight: 1.75,
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

// ── Ornament ──────────────────────────────────────────────────────────────────

function Ornament() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <span style={{ color: CALIPSO, opacity: 0.45, letterSpacing: '10px', fontSize: '13px' }}>· · ·</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Menu() {
  const [categories,  setCategories]  = useState<Category[]>([])
  const [items,       setItems]       = useState<MenuItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [activeRestrictions, setActiveRestrictions] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [lang,        setLang]        = useState<'es' | 'en'>('es')
  const [navSticky,   setNavSticky]   = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    Promise.all([getCategories(), getMenuItems()])
      .then(([cats, its]) => { setCategories(cats); setItems(its) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Sticky nav on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return
      setNavSticky(window.scrollY > navRef.current.offsetTop - 68)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // IntersectionObserver — highlight active category as user scrolls
  useEffect(() => {
    if (categories.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (!visible.length) return
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        const slug = topmost.target.id.replace('sec-', '')
        const cat = categories.find(c => c.slug === slug)
        if (cat) setActiveCategory(cat.id)
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: 0 }
    )
    categories.forEach(cat => {
      const el = document.getElementById(`sec-${cat.slug}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [categories])

  // Scroll to section
  const scrollToSection = (catId: string) => {
    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setActiveCategory('all')
      return
    }
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const el = document.getElementById(`sec-${cat.slug}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 68 - 52 // header + nav
      window.scrollTo({ top: y, behavior: 'smooth' })
      setActiveCategory(catId)
    }
  }

  // Toggle restriction filter
  const toggleRestriction = (id: string) => {
    setActiveRestrictions(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Apply restriction filters to items
  const restrictedItems = useMemo(() => {
    if (activeRestrictions.size === 0) return items
    return items.filter(item => {
      for (const rid of activeRestrictions) {
        const r = RESTRICTIONS.find(f => f.id === rid)
        if (r && r.excludes.some(e => item.allergens.includes(e))) return false
      }
      return true
    })
  }, [items, activeRestrictions])

  // Count items per category (after restrictions)
  const countPerCategory = useMemo(() => {
    const map: Record<string, number> = {}
    categories.forEach(cat => {
      map[cat.id] = restrictedItems.filter(i => i.category_id === cat.id).length
    })
    return map
  }, [categories, restrictedItems])

  // Sections (always all, filtered by restrictions)
  const sections = useMemo(() =>
    categories
      .map(cat => ({
        ...cat,
        catItems: restrictedItems
          .filter(i => i.category_id === cat.id)
          .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)),
      }))
      .filter(s => s.catItems.length > 0),
    [categories, restrictedItems]
  )

  // ── Nav pills ─────────────────────────────────────────────────────────────

  const NavPills = ({ compact }: { compact?: boolean }) => (
    <div style={{ display: 'flex', overflowX: 'auto', gap: 0, scrollbarWidth: 'none' as const }}>
      {/* "Todo" → scroll to top */}
      <button
        onClick={() => scrollToSection('all')}
        style={{
          flexShrink: 0,
          padding: compact ? '10px 14px' : '13px 16px',
          fontFamily: sans,
          fontSize: '12px',
          fontWeight: activeCategory === 'all' ? 600 : 400,
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color: activeCategory === 'all' ? CALIPSO : 'rgba(255,255,255,0.60)',
          background: 'none',
          border: 'none',
          borderBottom: activeCategory === 'all' ? `2.5px solid ${CALIPSO}` : '2.5px solid transparent',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap' as const,
        }}
      >
        {lang === 'en' ? 'All' : 'Todo'}
      </button>

      {categories.map(cat => {
        const active = activeCategory === cat.id
        const count  = countPerCategory[cat.id] ?? 0
        return (
          <button
            key={cat.id}
            onClick={() => scrollToSection(cat.id)}
            style={{
              flexShrink: 0,
              padding: compact ? '10px 14px' : '13px 16px',
              fontFamily: sans,
              fontSize: '12px',
              fontWeight: active ? 600 : 400,
              letterSpacing: '0.16em',
              textTransform: 'uppercase' as const,
              color: active ? CALIPSO : 'rgba(255,255,255,0.60)',
              background: 'none',
              border: 'none',
              borderBottom: active ? `2.5px solid ${CALIPSO}` : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap' as const,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {cat.icon && <span style={{ fontSize: '13px' }}>{cat.icon}</span>}
            {cat.name}
            <span style={{
              fontFamily: sans,
              fontSize: '10px',
              fontWeight: 400,
              color: active ? 'rgba(41,181,208,0.65)' : 'rgba(255,255,255,0.30)',
              letterSpacing: 0,
            }}>
              ({count})
            </span>
          </button>
        )
      })}
    </div>
  )

  // ── Loading / error states ────────────────────────────────────────────────

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

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: PAPER, minHeight: '100vh' }}>

      {/* ── Hero header ───────────────────────────────────────── */}
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
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(28,43,45,0.58), rgba(28,43,45,0.82))' }} />
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

          {/* Wordmark */}
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
          <p style={{ fontFamily: sans, fontWeight: 400, fontSize: '12px', letterSpacing: '0.45em', textTransform: 'uppercase', color: CALIPSO }}>
            Restaurant
          </p>
          <div style={{ width: '52px', height: '1.5px', background: CALIPSO, margin: '18px auto 16px' }} />
          <p style={{ fontFamily: sans, fontWeight: 300, fontSize: '12px', color: 'rgba(255,255,255,0.42)', letterSpacing: '0.10em', marginBottom: '44px' }}>
            Primera línea costera &nbsp;·&nbsp; Concón, Chile
          </p>
        </div>

        {/* ── Category nav ─────────────────────────────────── */}
        <div ref={navRef} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: INK }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px' }}>
            <NavPills />
          </div>
        </div>

        {/* Sticky nav */}
        {navSticky && (
          <div style={{
            position: 'fixed',
            top: '68px',
            left: 0, right: 0,
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

      {/* ── Restriction filters ───────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: navSticky ? '68px' : 0,
        zIndex: 30,
        background: PAPER,
        borderBottom: `1px solid ${INK10}`,
        boxShadow: '0 1px 8px rgba(28,43,45,0.06)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <span style={{ fontFamily: sans, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK60, flexShrink: 0, paddingRight: '4px' }}>
            Filtrar:
          </span>
          {RESTRICTIONS.map(r => {
            const active = activeRestrictions.has(r.id)
            return (
              <button
                key={r.id}
                onClick={() => toggleRestriction(r.id)}
                style={{
                  flexShrink: 0,
                  fontFamily: sans,
                  fontSize: '11.5px',
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '0.05em',
                  padding: '5px 14px',
                  borderRadius: '99px',
                  border: active ? `1.5px solid ${CALIPSO}` : `1.5px solid ${INK10}`,
                  background: active ? `rgba(41,181,208,0.10)` : 'white',
                  color: active ? CALIPSO : INK60,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {active && '✓ '}{r.label}
              </button>
            )
          })}
          {activeRestrictions.size > 0 && (
            <button
              onClick={() => setActiveRestrictions(new Set())}
              style={{
                flexShrink: 0,
                fontFamily: sans,
                fontSize: '11px',
                letterSpacing: '0.08em',
                padding: '5px 12px',
                borderRadius: '99px',
                border: 'none',
                background: 'none',
                color: CORAL,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Menu sections ─────────────────────────────────────── */}
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px' }}>
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 300, fontSize: '24px', color: INK60, marginBottom: '12px' }}>
              Sin platos con estos filtros
            </p>
            <button
              onClick={() => setActiveRestrictions(new Set())}
              style={{
                fontFamily: sans,
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: CALIPSO,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          sections.map((section, idx) => (
            <section key={section.id} id={`sec-${section.slug}`}>
              {idx > 0 && <Ornament />}
              <SectionHeader category={section} />
              {section.catItems.map(item => <DishRow key={item.id} item={item} />)}
            </section>
          ))
        )}

        {/* ── CTA: Reservar ─────────────────────────────────── */}
        {sections.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '56px 32px',
            borderTop: `1px solid ${INK10}`,
            background: INK,
          }}>
            <p style={{
              fontFamily: serif,
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(26px, 5vw, 36px)',
              color: 'white',
              lineHeight: 1.2,
              marginBottom: '10px',
            }}>
              ¿Te gustó lo que viste?
            </p>
            <p style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: '13px',
              color: 'rgba(255,255,255,0.50)',
              letterSpacing: '0.06em',
              marginBottom: '28px',
            }}>
              Reserva tu mesa y disfruta de la carta junto al mar.
            </p>
            <Link
              to="/reservas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: sans,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'white',
                background: CORAL,
                border: 'none',
                padding: '15px 36px',
                borderRadius: '4px',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'background 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#D94E33')}
              onMouseLeave={e => (e.currentTarget.style.background = CORAL)}
            >
              Reservar una mesa →
            </Link>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────── */}
        <footer style={{ textAlign: 'center', padding: '52px 32px 72px', borderTop: `1px solid ${INK10}` }}>
          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 22px' }} />
          <p style={{ fontFamily: sans, fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK, opacity: 0.38, marginBottom: '6px' }}>
            Av. Borgoño 14900 &nbsp;·&nbsp; Concón &nbsp;·&nbsp; +56 9 8765 4321
          </p>
          <p style={{ fontFamily: sans, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: INK, opacity: 0.30, marginBottom: '22px' }}>
            Mar–Vie 13:00–23:00 &nbsp;·&nbsp; Sáb–Dom 12:30–23:30
          </p>
          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 22px' }} />
          <p style={{ fontFamily: sans, fontWeight: 300, fontSize: '12px', color: INK, opacity: 0.42, maxWidth: '400px', margin: '0 auto', lineHeight: 1.75 }}>
            Carta sujeta a disponibilidad del producto. Informe a su garzón sobre
            alergias o intolerancias alimentarias. Precios incluyen IVA.
          </p>
        </footer>
      </div>
    </div>
  )
}
