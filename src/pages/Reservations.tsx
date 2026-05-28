import { useState, useMemo } from 'react'
import { createReservation } from '../lib/api'
import { Input, TextArea } from '../components/ui/Input'
import { CheckCircle, AlertCircle, Users, Calendar, Clock, Waves, Home, Minus } from 'lucide-react'
import { PHOTOS } from '../lib/images'
import ChatWidget from '../components/ui/ChatWidget'

const INK = '#1C2B2D'
const CALIPSO = '#29B5D0'
const OVERLAY = 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.82))'

const timeSlots = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
]

type SectorPref = '' | 'terraza' | 'comedor'

interface FormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  party_size: string
  date: string
  time: string
  sector: SectorPref
  notes: string
}

interface SubmittedData {
  guest_name: string
  party_size: number
  date: string
  time: string
  sector: SectorPref
}

const initialForm: FormData = {
  guest_name: '', guest_email: '', guest_phone: '',
  party_size: '2', date: '', time: '', sector: '', notes: '',
}

const SECTOR_OPTIONS: { value: SectorPref; label: string; icon: React.ElementType }[] = [
  { value: 'terraza', label: 'Terraza',  icon: Waves },
  { value: 'comedor', label: 'Interior', icon: Home },
  { value: '',        label: 'Sin preferencia', icon: Minus },
]

function formatDateES(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function Reservations() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedData | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [photoErrored, setPhotoErrored] = useState(false)

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const maxDateStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
  }, [])

  const validate = (): Partial<Record<keyof FormData, string>> => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.guest_name.trim()) e.guest_name = 'Nombre requerido'
    if (!form.guest_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.guest_email = 'Email inválido'
    if (!form.guest_phone.trim()) e.guest_phone = 'Teléfono requerido'
    if (!form.date) {
      e.date = 'Fecha requerida'
    } else {
      const day = new Date(form.date + 'T12:00:00').getDay()
      if (day === 1) e.date = 'Cerrado los lunes'
    }
    if (!form.time) e.time = 'Horario requerido'
    return e
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm(f => ({ ...f, date: val }))
    // Live Monday check
    if (val) {
      const day = new Date(val + 'T12:00:00').getDay()
      if (day === 1) {
        setErrors(prev => ({ ...prev, date: 'Cerrado los lunes' }))
      } else {
        setErrors(prev => { const n = { ...prev }; delete n.date; return n })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setServerError(null)
    try {
      await createReservation({
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone,
        party_size: parseInt(form.party_size),
        date: form.date,
        time: form.time,
        sector: form.sector || null,
        notes: form.notes || null,
        table_id: null,
      })
      setSubmitted({
        guest_name: form.guest_name,
        party_size: parseInt(form.party_size),
        date: form.date,
        time: form.time,
        sector: form.sector,
      })
      setForm(initialForm)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }))

  const showPhoto = PHOTOS.reservations && !photoErrored

  const sectorLabel = submitted?.sector === 'terraza' ? 'Terraza'
    : submitted?.sector === 'comedor' ? 'Interior'
    : 'Sin preferencia'

  return (
    <>
    <div style={{ minHeight: '100vh', fontFamily: 'Jost, system-ui, sans-serif', paddingTop: '68px' }}>

      {/* Mobile photo banner */}
      {showPhoto && (
        <div className="md:hidden" style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
          <img
            src={PHOTOS.reservations}
            alt="Interior de Calipso Restaurant"
            onError={() => setPhotoErrored(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: OVERLAY }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '30px', color: 'white' }}>
              Reservar una Mesa
            </p>
          </div>
        </div>
      )}

      <div className={`flex ${showPhoto ? 'md:grid md:grid-cols-2' : ''}`} style={{ minHeight: showPhoto ? 'calc(100vh - 68px)' : 'auto' }}>

        {/* ── Left: photo (desktop only) ─────────────────────── */}
        {showPhoto && (
          <div className="hidden md:block" style={{ position: 'relative', overflow: 'hidden' }}>
            <img
              src={PHOTOS.reservations}
              alt="Interior de Calipso Restaurant"
              onError={() => setPhotoErrored(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: OVERLAY }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              padding: '48px 40px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '38px', color: 'white', lineHeight: 1.1, marginBottom: '12px' }}>
                Reserva tu<br />lugar junto al mar
              </p>
              <div style={{ width: '32px', height: '1.5px', background: CALIPSO, margin: '0 auto 16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '12px', letterSpacing: '0.15em' }}>
                Primera línea costera · Concón
              </p>
            </div>
          </div>
        )}

        {/* ── Right: form ─────────────────────────────────────── */}
        <div style={{ background: '#FDFAF5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Dark header strip — only when no photo */}
          {!showPhoto && (
            <div style={{ background: INK, padding: '56px 32px 40px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Bienvenido
              </p>
              <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '42px', color: 'white' }}>
                Reservar una Mesa
              </h1>
              <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '16px auto 0' }} />
            </div>
          )}

          <div style={{ padding: '36px 28px', maxWidth: '520px', margin: '0 auto', width: '100%' }}>

            {/* Page title (photo variant, desktop) */}
            {showPhoto && (
              <div className="hidden md:block" style={{ marginBottom: '28px' }}>
                <p style={{ color: CALIPSO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Reservas
                </p>
                <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '36px', color: INK, lineHeight: 1.1 }}>
                  Reservar una Mesa
                </h1>
                <div style={{ width: '32px', height: '1.5px', background: CALIPSO, marginTop: '14px' }} />
              </div>
            )}

            {/* ── Success screen ──────────────────────────────── */}
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0 32px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(41,181,208,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={30} style={{ color: CALIPSO }} />
                </div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: '28px', color: INK, marginBottom: '6px' }}>
                  ¡Reserva Enviada!
                </h2>
                <p style={{ color: 'rgba(28,43,45,0.65)', fontSize: '13px', marginBottom: '28px' }}>
                  Te confirmaremos por correo en las próximas horas.
                </p>

                {/* Summary card */}
                <div style={{ background: 'white', border: '1px solid rgba(28,43,45,0.09)', borderRadius: '8px', padding: '20px 24px', textAlign: 'left', marginBottom: '28px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: CALIPSO, marginBottom: '14px' }}>
                    Resumen de tu reserva
                  </p>
                  {[
                    { label: 'Nombre',   value: submitted.guest_name },
                    { label: 'Fecha',    value: formatDateES(submitted.date) },
                    { label: 'Horario',  value: submitted.time + ' hrs' },
                    { label: 'Personas', value: `${submitted.party_size} persona${submitted.party_size !== 1 ? 's' : ''}` },
                    { label: 'Sector',   value: sectorLabel },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid rgba(28,43,45,0.05)' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(28,43,45,0.55)', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '13px', color: INK, fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSubmitted(null)}
                  style={{ color: CALIPSO, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Hacer otra reserva
                </button>
              </div>

            ) : (
              /* ── Form ──────────────────────────────────────── */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Info strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px', marginBottom: '2px' }}>
                  {[
                    { icon: Users,    label: 'Hasta 12 personas' },
                    { icon: Calendar, label: 'Mar – Dom' },
                    { icon: Clock,    label: '13:00 – 22:00' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '9px 6px', background: 'white', border: '1px solid rgba(28,43,45,0.07)', borderRadius: '6px' }}>
                      <Icon size={14} style={{ margin: '0 auto 4px', color: CALIPSO, display: 'block' }} />
                      <p style={{ fontSize: '10px', color: 'rgba(28,43,45,0.70)', fontWeight: 400, lineHeight: 1.3 }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Guest info */}
                <Input
                  label="Nombre completo *"
                  placeholder="María González"
                  value={form.guest_name}
                  onChange={set('guest_name')}
                  error={errors.guest_name}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Input label="Email *" type="email" placeholder="maria@correo.cl" value={form.guest_email} onChange={set('guest_email')} error={errors.guest_email} />
                  <Input label="Teléfono *" type="tel" placeholder="+56 9 1234 5678" value={form.guest_phone} onChange={set('guest_phone')} error={errors.guest_phone} />
                </div>

                {/* Date / time / party */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Input
                    label="Fecha *"
                    type="date"
                    min={todayStr}
                    max={maxDateStr}
                    value={form.date}
                    onChange={handleDateChange}
                    error={errors.date}
                  />
                  {/* Party size — native select */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(28,43,45,0.65)', marginBottom: '5px' }}>
                      Personas *
                    </label>
                    <select
                      value={form.party_size}
                      onChange={set('party_size')}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '4px',
                        border: '1.5px solid rgba(28,43,45,0.18)', background: 'white',
                        fontSize: '14px', color: INK, fontFamily: 'Jost, sans-serif',
                        appearance: 'auto',
                      }}
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time slot */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(28,43,45,0.65)', marginBottom: '5px' }}>
                    Horario *
                  </label>
                  <select
                    value={form.time}
                    onChange={set('time')}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '4px',
                      border: `1.5px solid ${errors.time ? '#E8593C' : 'rgba(28,43,45,0.18)'}`,
                      background: 'white', fontSize: '14px', color: form.time ? INK : 'rgba(28,43,45,0.40)',
                      fontFamily: 'Jost, sans-serif', appearance: 'auto',
                    }}
                  >
                    <option value="">Seleccionar horario</option>
                    <optgroup label="── Almuerzo ──">
                      {timeSlots.slice(0, 6).map(t => <option key={t} value={t}>{t} hrs</option>)}
                    </optgroup>
                    <optgroup label="── Cena ──">
                      {timeSlots.slice(6).map(t => <option key={t} value={t}>{t} hrs</option>)}
                    </optgroup>
                  </select>
                  {errors.time && (
                    <p style={{ fontSize: '11px', color: '#E8593C', marginTop: '4px' }}>{errors.time}</p>
                  )}
                </div>

                {/* Sector preference */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(28,43,45,0.65)', marginBottom: '8px' }}>
                    Preferencia de sector
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {SECTOR_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = form.sector === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, sector: value }))}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '5px', padding: '10px 6px', borderRadius: '6px', cursor: 'pointer',
                            border: `1.5px solid ${active ? CALIPSO : 'rgba(28,43,45,0.13)'}`,
                            background: active ? 'rgba(41,181,208,0.06)' : 'white',
                            transition: 'all 150ms ease',
                            fontFamily: 'Jost, sans-serif',
                          }}
                        >
                          <Icon size={16} style={{ color: active ? CALIPSO : 'rgba(28,43,45,0.45)' }} />
                          <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, color: active ? CALIPSO : 'rgba(28,43,45,0.65)', letterSpacing: '0.04em', lineHeight: 1.2, textAlign: 'center' }}>
                            {label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <TextArea
                  label="Comentarios o solicitudes especiales"
                  placeholder="Aniversario, alergias, cumpleaños…"
                  rows={3}
                  value={form.notes}
                  onChange={set('notes')}
                />

                {serverError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(232,89,60,0.08)', color: '#993C1D', padding: '12px 16px', borderRadius: '4px', fontSize: '13px' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? 'rgba(232,89,60,0.60)' : '#E8593C',
                    color: 'white', border: 'none', cursor: loading ? 'default' : 'pointer',
                    padding: '14px', borderRadius: '4px', marginTop: '2px',
                    fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600,
                    transition: 'background 200ms ease', fontFamily: 'Jost, sans-serif',
                  }}
                >
                  {loading ? 'Enviando…' : 'Confirmar Reserva'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(28,43,45,0.50)', letterSpacing: '0.05em' }}>
                  Al reservar aceptas nuestras políticas · Cancela con 24 h de anticipación
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>

    <ChatWidget />
    </>
  )
}
