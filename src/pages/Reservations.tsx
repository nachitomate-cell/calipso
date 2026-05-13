import { useState } from 'react'
import { createReservation } from '../lib/api'
import { Input, TextArea, Select } from '../components/ui/Input'
import { CheckCircle, AlertCircle, Users, Calendar, Clock } from 'lucide-react'

const timeSlots = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
]

interface FormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  party_size: string
  date: string
  time: string
  notes: string
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
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone,
        party_size: parseInt(form.party_size),
        date: form.date,
        time: form.time,
        notes: form.notes || null,
        table_id: null,
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

  return (
    <div className="min-h-screen bg-calipso-50 font-body">
      {/* Header */}
      <div className="bg-calipso pt-[68px] pb-14 px-4 text-center">
        <p className="text-white/60 text-[10px] tracking-[0.3em] uppercase mb-4 font-light">Bienvenido</p>
        <h1 className="font-display text-5xl md:text-7xl text-white font-bold italic">Reservar una Mesa</h1>
        <div className="w-12 h-px bg-white/30 mx-auto mt-5" />
        <p className="text-white/50 text-xs mt-4 max-w-sm mx-auto">
          Tu reserva será confirmada por correo dentro de las 24 horas.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {success ? (
          <div className="bg-white rounded-card p-10 shadow-brand text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-status-free flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-[#3B6D11]" />
            </div>
            <h2 className="font-display text-2xl text-ink font-bold italic mb-2">¡Reserva Enviada!</h2>
            <p className="text-ink-secondary text-sm max-w-xs mx-auto mb-6">
              Hemos recibido tu solicitud. Te confirmaremos por correo dentro de las próximas 24 horas.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="text-calipso hover:text-calipso-700 text-sm font-medium transition-colors"
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-card p-6 sm:p-8 shadow-brand space-y-6">
            {/* Info strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: 'Hasta 12 personas' },
                { icon: Calendar, label: 'Martes a Domingo' },
                { icon: Clock, label: '13:00 – 23:30' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="text-center p-3 bg-calipso-50 rounded-input">
                  <Icon size={16} className="mx-auto text-calipso mb-1.5" />
                  <p className="text-[11px] text-ink-secondary font-medium leading-tight">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre completo *"
                placeholder="María González"
                value={form.guest_name}
                onChange={set('guest_name')}
                error={errors.guest_name}
              />
              <Input
                label="Email *"
                type="email"
                placeholder="maria@correo.cl"
                value={form.guest_email}
                onChange={set('guest_email')}
                error={errors.guest_email}
              />
              <Input
                label="Teléfono *"
                type="tel"
                placeholder="+56 9 1234 5678"
                value={form.guest_phone}
                onChange={set('guest_phone')}
                error={errors.guest_phone}
              />
              <Select
                label="Número de personas *"
                value={form.party_size}
                onChange={set('party_size')}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>
                ))}
              </Select>
              <Input
                label="Fecha *"
                type="date"
                min={today}
                value={form.date}
                onChange={set('date')}
                error={errors.date}
              />
              <Select
                label="Horario *"
                value={form.time}
                onChange={set('time')}
                error={errors.time}
              >
                <option value="">Seleccionar horario</option>
                <optgroup label="Almuerzo">
                  {timeSlots.slice(0, 6).map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Cena">
                  {timeSlots.slice(6).map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              </Select>
            </div>

            <TextArea
              label="Comentarios o solicitudes especiales"
              placeholder="Cumpleaños, alergias, preferencia de ubicación (terraza / interior)…"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
            />

            {serverError && (
              <div className="flex items-center gap-3 bg-coral-light text-coral-dark rounded-input p-4 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-semibold py-3.5 rounded-card transition-all duration-200 hover:shadow-brand-md text-sm tracking-wide uppercase"
            >
              {loading ? 'Enviando…' : 'Confirmar Reserva'}
            </button>

            <p className="text-center text-xs text-ink-secondary/50">
              Al reservar aceptas nuestras políticas. Cancela con 24 h de anticipación.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
