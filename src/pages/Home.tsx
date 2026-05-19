import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Clock, Waves, ChefHat, Sunset } from 'lucide-react'
import Carousel from '../components/ui/Carousel'
import { PHOTOS } from '../lib/images'

const INK = '#1C2B2D'
const CALIPSO = '#29B5D0'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Jost, system-ui, sans-serif' }}>

      {/* ── Hero Carousel ────────────────────────────────────── */}
      <Carousel
        slides={PHOTOS.carousel}
        interval={5000}
        fadeDuration={800}
        style={{ minHeight: '100svh', paddingTop: '68px' } as React.CSSProperties}
        className="flex flex-col"
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'Jost, sans-serif', fontWeight: 400, marginBottom: '20px' }}>
            Concón, Chile &nbsp;·&nbsp; Cocina de Mar
          </p>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(64px, 12vw, 110px)',
            color: 'white',
            lineHeight: 1,
            marginBottom: '8px',
          }}>
            Calipso
          </h1>
          <p style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: '18px',
            color: 'rgba(255,255,255,0.50)',
            marginBottom: '36px',
            letterSpacing: '0.15em',
          }}>
            Restaurant
          </p>
          <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '0 auto 32px' }} />
          <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '14px', maxWidth: '380px', lineHeight: 1.75, fontWeight: 300, marginBottom: '40px' }}>
            El océano en su expresión más pura. Mariscos frescos del Pacífico,
            técnica depurada y terraza frente al mar.
          </p>

          {/* CTAs — reserva (primario) + carta (secundario) */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/reservas"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#E8593C', color: 'white', fontWeight: 500,
                padding: '13px 30px', borderRadius: '4px', textDecoration: 'none',
                fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
                transition: 'background 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#C04828')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8593C')}
            >
              Reservar una mesa
            </Link>
            <Link
              to="/carta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                border: '1.5px solid rgba(255,255,255,0.60)',
                color: 'white', fontWeight: 400, padding: '13px 30px',
                borderRadius: '4px', textDecoration: 'none',
                fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
                transition: 'all 200ms ease',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'white'
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.60)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Ver la Carta <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Bottom fade — suave y gradual para no cortar la imagen */}
        <div style={{
          height: '140px',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(253,250,245,0.55) 60%, #FDFAF5 100%)',
          flexShrink: 0,
        }} />
      </Carousel>

      {/* ── Propuesta de valor ─────────────────────────────────── */}
      <section style={{ background: '#FDFAF5', padding: '72px 24px' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                Icon: Waves,
                title: 'Del Océano a tu Mesa',
                desc: 'Trabajamos directamente con pescadores artesanales de Caleta Higuerillas y Quintero.',
              },
              {
                Icon: ChefHat,
                title: 'Técnica de Autor',
                desc: 'Cocina chilena contemporánea con influencias nikkei y mediterráneas.',
              },
              {
                Icon: Sunset,
                title: 'Terraza Frente al Mar',
                desc: 'Disfruta el atardecer del Pacífico desde nuestra terraza sobre las rocas.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{ textAlign: 'center', padding: '32px 24px', background: 'white', borderRadius: '4px', border: '1px solid rgba(28,43,45,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                  <Icon size={30} strokeWidth={1.5} style={{ color: CALIPSO }} />
                </div>
                <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: '22px', color: INK, marginBottom: '12px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(28,43,45,0.72)', lineHeight: 1.7, fontWeight: 300 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sobre el restaurante (grid asimétrico con fotos) ───── */}
      {(PHOTOS.aboutLarge || PHOTOS.aboutSmall) && (
        <section style={{ background: INK, padding: '0' }}>
          <div className="grid grid-cols-1 md:grid-cols-[70%_30%]" style={{ minHeight: '380px' }}>
            {/* Foto grande */}
            <div style={{ position: 'relative', minHeight: '280px' }}>
              {PHOTOS.aboutLarge ? (
                <img
                  src={PHOTOS.aboutLarge}
                  alt="Interior de Calipso Restaurant con comensales"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)', minHeight: '280px' }} />
              )}
            </div>
            {/* Foto pequeña */}
            <div style={{ position: 'relative', minHeight: '200px' }}>
              {PHOTOS.aboutSmall ? (
                <img
                  src={PHOTOS.aboutSmall}
                  alt="Detalle artístico — Calipso Restaurant"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.02)', minHeight: '200px' }} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Platos destacados ─────────────────────────────────── */}
      <section style={{ background: 'white', padding: '72px 24px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ color: CALIPSO, fontSize: '10px', letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 400, marginBottom: '12px' }}>
              Temporada
            </p>
            <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '38px', color: INK, marginBottom: '0' }}>
              Platos de Temporada
            </h2>
            <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '16px auto 0', opacity: 0.5 }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ border: '1px solid rgba(28,43,45,0.08)', background: 'rgba(28,43,45,0.08)' }}>
            {[
              { name: 'Langosta a la Plancha',      desc: 'Mantequilla de ajo, papas doradas y rúcula',             price: '$42.900' },
              { name: 'Pulpo a la Brasa',            desc: 'Hummus de garbanzos, aceite de pimentón ahumado',       price: '$12.900' },
              { name: 'Arroz Meloso de Mariscos',    desc: 'Bisque, langostinos, almejas, azafrán y alioli negro',  price: '$19.900' },
            ].map(({ name, desc, price }) => (
              <div key={name} style={{ background: '#FDFAF5', padding: '28px 24px' }}>
                {/* Nombre ··· Precio */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: '20px', color: INK, flexShrink: 0 }}>
                    {name}
                  </h3>
                  <div style={{ flex: 1, borderBottom: '1px dotted rgba(28,43,45,0.25)', marginBottom: '3px', minWidth: '16px' }} />
                  <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400, fontSize: '17px', color: CALIPSO, flexShrink: 0 }}>
                    {price}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(28,43,45,0.68)', lineHeight: 1.6, fontWeight: 300 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <Link
              to="/carta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                border: `1.5px solid ${CALIPSO}`, color: CALIPSO,
                padding: '10px 24px', borderRadius: '4px', textDecoration: 'none',
                fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 400,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = CALIPSO; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CALIPSO }}
            >
              Ver carta completa <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Reservas ──────────────────────────────────────── */}
      <section style={{ background: INK, padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '10px', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: '16px' }}>
            ¿Listo para vivir la experiencia?
          </p>
          <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '40px', color: 'white', marginBottom: '24px' }}>
            Reserva tu Mesa
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginBottom: '32px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={12} /> Av. Borgoño 14900, Concón
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} /> Mar–Dom 13:00–23:30
            </span>
          </div>
          <Link
            to="/reservas"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#E8593C', color: 'white',
              padding: '14px 32px', borderRadius: '4px', textDecoration: 'none',
              fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500,
              transition: 'background 200ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#C04828')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E8593C')}
          >
            Hacer Reserva <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </div>
  )
}
