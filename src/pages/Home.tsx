import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Clock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen font-body">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-calipso">
        {/* Subtle wave texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.03) 40px,
              rgba(255,255,255,0.03) 80px
            )`,
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-arena-light to-transparent" />

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
          <p className="text-white/70 text-xs tracking-[0.3em] uppercase mb-8 font-body font-light">
            Concón, Chile · Cocina de Mar
          </p>
          <h1 className="font-display text-6xl sm:text-7xl md:text-9xl text-white font-bold italic leading-none mb-4">
            Calipso
          </h1>
          <p className="font-display text-white/60 text-xl italic mb-10">Restaurant</p>
          <p className="text-white/75 text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-10 font-light">
            El océano en su expresión más pura. Mariscos frescos del Pacífico,
            técnica depurada y una terraza frente al mar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/carta"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/60 hover:border-white text-white font-medium px-8 py-3.5 rounded-card transition-all duration-200 text-sm tracking-wide uppercase"
            >
              Ver la Carta <ArrowRight size={15} />
            </Link>
            <Link
              to="/reservas"
              className="inline-flex items-center justify-center gap-2 bg-coral hover:bg-coral-hover text-white font-semibold px-8 py-3.5 rounded-card transition-all duration-200 hover:shadow-brand-md text-sm tracking-wide uppercase"
            >
              Reservar una mesa
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-40">
          <div className="w-px h-10 bg-white mx-auto animate-bounce" />
        </div>
      </section>

      {/* ── Propuesta de valor ─────────────────────────────── */}
      <section className="bg-arena py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🌊',
                title: 'Del Océano a tu Mesa',
                desc: 'Trabajamos directamente con pescadores artesanales de Caleta Higuerillas y Quintero.',
              },
              {
                icon: '👨‍🍳',
                title: 'Técnica de Autor',
                desc: 'Cocina chilena contemporánea con influencias nikkei y mediterráneas.',
              },
              {
                icon: '🌅',
                title: 'Terraza Frente al Mar',
                desc: 'Disfruta el atardecer del Pacífico desde nuestra terraza sobre las rocas.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-8 bg-white rounded-card shadow-brand hover:shadow-brand-md transition-shadow duration-200">
                <div className="text-5xl mb-5">{icon}</div>
                <h3 className="font-display text-xl text-ink font-bold mb-3">{title}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platos destacados ─────────────────────────────── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-calipso text-xs tracking-[0.25em] uppercase font-body mb-3">Temporada</p>
            <h2 className="font-display text-4xl text-ink font-bold italic">Platos de Temporada</h2>
            <div className="w-16 h-px bg-calipso mx-auto mt-4 opacity-40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '🦞', name: 'Langosta a la Plancha', desc: 'Con mantequilla de ajo, papas doradas y rúcula', price: '$42.900' },
              { emoji: '🐙', name: 'Pulpo a la Brasa', desc: 'Sobre hummus de garbanzos, aceite de pimentón ahumado', price: '$12.900' },
              { emoji: '🍚', name: 'Arroz Meloso de Mariscos', desc: 'Bisque, langostinos, almejas, azafrán y alioli negro', price: '$19.900' },
            ].map(({ emoji, name, desc, price }) => (
              <div key={name} className="group bg-white rounded-card shadow-brand border border-calipso/10 overflow-hidden hover:-translate-y-0.5 hover:shadow-brand-md transition-all duration-200">
                <div className="bg-calipso-50 aspect-[4/3] flex items-center justify-center text-7xl group-hover:scale-105 transition-transform duration-300">
                  {emoji}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg text-ink font-bold">{name}</h3>
                  <p className="text-ink-secondary text-sm mt-1 leading-relaxed">{desc}</p>
                  <p className="text-calipso font-semibold text-base mt-3">{price}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/carta"
              className="inline-flex items-center gap-2 border border-calipso text-calipso hover:bg-calipso hover:text-white font-medium px-6 py-2.5 rounded-card transition-all duration-200 text-sm uppercase tracking-wide"
            >
              Ver carta completa <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Reserva ─────────────────────────────────────── */}
      <section className="bg-calipso-700 py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-white/60 text-xs tracking-[0.25em] uppercase mb-4 font-body">¿Listo para vivir la experiencia?</p>
          <h2 className="font-display text-4xl md:text-5xl text-white font-bold italic mb-6">
            Reserva tu Mesa
          </h2>
          <div className="flex flex-wrap justify-center gap-6 text-white/60 text-sm mb-8 font-light">
            <span className="flex items-center gap-2"><MapPin size={13} /> Av. Borgoño 14900, Concón</span>
            <span className="flex items-center gap-2"><Clock size={13} /> Mar–Dom 13:00–23:30</span>
          </div>
          <Link
            to="/reservas"
            className="inline-flex items-center gap-2 bg-coral hover:bg-coral-hover text-white font-semibold px-10 py-4 rounded-card transition-all duration-200 hover:shadow-brand-md text-sm tracking-wide uppercase"
          >
            Hacer Reserva <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
