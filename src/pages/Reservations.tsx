import { useState } from 'react'
import { createReservation } from '../lib/api'
import { Input, TextArea, Select } from '../components/ui/Input'
import { CheckCircle, AlertCircle, Users, Calendar, Clock } from 'lucide-react'
import { PHOTOS } from '../lib/images'

const INK = '#1C2B2D'
const CALIPSO = '#29B5D0'
const OVERLAY = 'linear-gradient(to bottom, rgba(28,43,45,0.55), rgba(28,43,45,0.75))'

const timeSlots = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
]

interface FormData {
  guest_name: string; guest_email: string; guest_phone: string
  party_size: string; date: string; time: string; notes: string
}

const initialForm: FormData = {
  guest_name: '', guest_email: '', guest_phone: '',
  party_size: '2', date: '', time: '', notes: '',
}

export default function Reservations() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [photoErrored, setPhotoErrored] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.guest_name.trim()) e.guest_name = 'Nombre requerido'
    if (!form.guest_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.guest_email = 'Email inválido'
    if (!form.guest_phone.trim()) e.guest_phone = 'Teléfono requerido'
    if (!form.date) e.date = 'Fecha requerida'
    if (!form.time) e.time = 'Horario requerido'
    return e
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
        guest_name: form.guest_name, guest_email: form.guest_email,
        guest_phone: form.guest_phone, party_size: parseInt(form.party_size),
        date: form.date, time: form.time,
        notes: form.notes || null, table_id: null,
      })
      setSuccess(true)
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

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Jost, system-ui, sans-serif', paddingTop: '68px' }}>

      {/* Mobile photo banner (collapses above the form) */}
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
            <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '32px', color: 'white' }}>
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
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: OVERLAY }} />
            {/* Copy on photo */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              padding: '48px 40px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '38px', color: 'white', lineHeight: 1.1, marginBottom: '12px' }}>
                Reserva tu<br />lugar junto al mar
              </p>
              <div style={{ width: '32px', height: '1.5px', background: CALIPSO, margin: '0 auto 16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.15em' }}>
                Primera línea costera · Concón
              </p>
            </div>
          </div>
        )}

        {/* ── Right: form ─────────────────────────────────────── */}
        <div style={{ background: '#FDFAF5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Dark header strip — only when no photo or mobile */}
          {!showPhoto && (
            <div style={{ background: INK, padding: '56px 32px 40px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Bienvenido
              </p>
              <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '42px', color: 'white' }}>
                Reservar una Mesa
              </h1>
              <div style={{ width: '40px', height: '1.5px', background: CALIPSO, margin: '16px auto 0' }} />
            </div>
          )}

          <div style={{ padding: '40px 32px', maxWidth: '520px', margin: '0 auto', width: '100%' }}>
            {/* Page title (photo variant) */}
            {showPhoto && (
              <div className="hidden md:block" style={{ marginBottom: '32px' }}>
                <p style={{ color: CALIPSO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Reservas
                </p>
                <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '36px', color: INK, lineHeight: 1.1 }}>
                  Reservar una Mesa
                </h1>
                <div style={{ width: '32px', height: '1.5px', background: CALIPSO, marginTop: '14px' }} />
              </div>
            )}

            {success ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(63,109,17,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={28} style={{ color: '#3B6D11' }} />
                </div>
                <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: '26px', color: INK, marginBottom: '10px' }}>
                  ¡Reserva Enviada!
                </h2>
                <p style={{ color: 'rgba(28,43,45,0.55)', fontSize: '13px', lineHeight: 1.7, marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>
                  Hemos recibido tu solicitud. Te confirmaremos por correo dentro de las próximas 24 horas.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  style={{ color: CALIPSO, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Hacer otra reserva
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Info strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '4px' }}>
                  {[
                    { icon: Users, label: 'Hasta 12 personas' },
                    { icon: Calendar, label: 'Martes a Domingo' },
                    { icon: Clock, label: '13:00 – 23:30' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: 'white', border: '1px solid rgba(28,43,45,0.07)', borderRadius: '4px' }}>
                      <Icon size={14} style={{ margin: '0 auto 4px', color: CALIPSO, display: 'block' }} />
                      <p style={{ fontSize: '10px', color: 'rgba(28,43,45,0.50)', fontWeight: 300, lineHeight: 1.3 }}>{label}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="Nombre completo *" placeholder="María González" value={form.guest_name} onChange={set('guest_name')} error={errors.guest_name} />
                  </div>
                  <Input label="Email *" type="email" placeholder="maria@correo.cl" value={form.guest_email} onChange={set('guest_email')} error={errors.guest_email} />
                  <Input label="Teléfono *" type="tel" placeholder="+56 9 1234 5678" value={form.guest_phone} onChange={set('guest_phone')} error={errors.guest_phone} />
                  <Select label="Personas *" value={form.party_size} onChange={set('party_size')}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>
                    ))}
                  </Select>
                  <Input label="Fecha *" type="date" min={today} value={form.date} onChange={set('date')} error={errors.date} />
                  <Select label="Horario *" value={form.time} onChange={set('time')} error={errors.time}>
                    <option value="">Seleccionar horario</option>
                    <optgroup label="Almuerzo">{timeSlots.slice(0,6).map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
                    <optgroup label="Cena">{timeSlots.slice(6).map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
                  </Select>
                </div>
                <TextArea label="Comentarios o solicitudes especiales" placeholder="Aniversario, alergias, preferencia terraza / interior…" rows={3} value={form.notes} onChange={set('notes')} />

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
                    background: loading ? 'rgba(232,89,60,0.6)' : '#E8593C',
                    color: 'white', border: 'none', cursor: loading ? 'default' : 'pointer',
                    padding: '14px', borderRadius: '4px',
                    fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500,
                    transition: 'background 200ms ease', fontFamily: 'Jost, sans-serif',
                  }}
                >
                  {loading ? 'Enviando…' : 'Confirmar Reserva'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(28,43,45,0.35)', letterSpacing: '0.05em' }}>
                  Al reservar aceptas nuestras políticas. Cancela con 24 h de anticipación.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
