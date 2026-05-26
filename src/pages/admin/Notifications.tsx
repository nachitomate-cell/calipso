import { useState, useEffect } from 'react'
import { getReservations, getInventory, computeNotifications } from '../../lib/api'
import type { AppNotification, Reservation } from '../../types'
import { Link } from 'react-router-dom'
import {
  Bell, BellOff, CalendarDays, Package, CheckCircle2,
  ChevronRight, Mail, MessageSquare, Settings, ExternalLink,
  RefreshCw, Eye, Info,
} from 'lucide-react'
import clsx from 'clsx'
import { PageLoader } from '../../components/ui/LoadingSpinner'

// ── helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'calipso_notif_read'

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')) }
  catch { return new Set() }
}
function markRead(id: string) {
  const ids = getReadIds(); ids.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}
function markAllRead(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

function elapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const NOTIF_CFG = {
  reservation_new:     { icon: CalendarDays, cls: 'text-calipso',    bg: 'bg-calipso-50',   label: 'Reserva nueva' },
  reservation_pending: { icon: CalendarDays, cls: 'text-amber-600',  bg: 'bg-amber-50',     label: 'Sin confirmar' },
  stock_low:           { icon: Package,      cls: 'text-amber-600',  bg: 'bg-amber-50',     label: 'Stock bajo' },
  stock_out:           { icon: Package,      cls: 'text-coral',      bg: 'bg-coral-light',  label: 'Sin stock' },
  order_ready:         { icon: CheckCircle2, cls: 'text-[#3B6D11]',  bg: 'bg-[#D4EDDA]',   label: 'Listo' },
} as const

// ── Email preview modal ───────────────────────────────────────────────────────

function EmailPreview({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const date = new Date(reservation.date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-card shadow-brand-lg w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Email client header */}
        <div className="bg-calipso-50 px-4 py-3 border-b border-calipso-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-calipso" />
            <span className="text-sm font-semibold text-ink">Vista previa — Email de confirmación</span>
          </div>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink text-xs">Cerrar</button>
        </div>

        {/* Email content */}
        <div className="p-6">
          <div className="text-xs text-ink-secondary mb-4 space-y-0.5">
            <p><strong>Para:</strong> {reservation.guest_email}</p>
            <p><strong>Asunto:</strong> Confirmación de reserva — Calipso Restaurant Concón</p>
          </div>

          <div className="border border-calipso-100 rounded-card overflow-hidden">
            {/* Email header */}
            <div className="bg-ink text-white px-6 py-5 text-center">
              <p className="font-display italic text-2xl font-light">Calipso</p>
              <p className="text-white/60 text-xs tracking-widest uppercase mt-0.5">Restaurant · Concón</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#D4EDDA] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} className="text-[#3B6D11]" />
                </div>
                <h2 className="font-display italic text-xl text-ink">¡Reserva Confirmada!</h2>
                <p className="text-ink-secondary text-sm mt-1">Te esperamos en nuestra terraza frente al Pacífico</p>
              </div>

              <div className="bg-calipso-50 rounded-input px-4 py-3 space-y-2">
                {[
                  ['Nombre', reservation.guest_name],
                  ['Fecha', date],
                  ['Hora', reservation.time],
                  ['Personas', `${reservation.party_size} persona${reservation.party_size !== 1 ? 's' : ''}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-ink-secondary">{k}</span>
                    <span className="font-medium text-ink">{v}</span>
                  </div>
                ))}
              </div>

              {reservation.notes && (
                <div className="text-xs text-ink-secondary italic border-l-2 border-calipso pl-3">
                  Nota: {reservation.notes}
                </div>
              )}

              <p className="text-xs text-ink-secondary text-center">
                Av. Borgoño 14900, Concón · Cancela con 24h de anticipación al +56 9 8765 4321
              </p>
            </div>

            <div className="bg-ink/5 px-6 py-3 text-center">
              <p className="text-[10px] text-ink-secondary">
                © {new Date().getFullYear()} Calipso Restaurant Concón — no responder a este correo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Config panel ──────────────────────────────────────────────────────────────

type NotifSettings = {
  email_confirm: boolean
  email_reminder: boolean
  whatsapp_confirm: boolean
  admin_new_res: boolean
  stock_alerts: boolean
}

const DEFAULT_SETTINGS: NotifSettings = {
  email_confirm: true,
  email_reminder: true,
  whatsapp_confirm: false,
  admin_new_res: true,
  stock_alerts: true,
}

function ConfigPanel() {
  const [settings, setSettings] = useState<NotifSettings>(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('calipso_notif_settings') ?? '{}') } }
    catch { return DEFAULT_SETTINGS }
  })
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('calipso_resend_key') ?? '')
  const [saved, setSaved] = useState(false)

  const toggle = (key: keyof NotifSettings) => {
    setSettings(s => {
      const next = { ...s, [key]: !s[key] }
      localStorage.setItem('calipso_notif_settings', JSON.stringify(next))
      return next
    })
  }

  const saveKey = () => {
    localStorage.setItem('calipso_resend_key', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggles: { key: keyof NotifSettings; label: string; desc: string; icon: React.ElementType; badge?: string }[] = [
    { key: 'email_confirm',   label: 'Email de confirmación',         desc: 'Se envía automáticamente al confirmar una reserva', icon: Mail },
    { key: 'email_reminder',  label: 'Recordatorio 24h antes',         desc: 'Email automático el día anterior a la reserva',     icon: Mail },
    { key: 'whatsapp_confirm',label: 'WhatsApp de confirmación',       desc: 'Requiere Twilio o Meta API configurado',            icon: MessageSquare, badge: 'Pro' },
    { key: 'admin_new_res',   label: 'Alerta: nueva reserva',          desc: 'Notificación interna al llegar una nueva reserva',  icon: Bell },
    { key: 'stock_alerts',    label: 'Alertas de inventario',          desc: 'Aviso cuando un producto llega al stock mínimo',    icon: Package },
  ]

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="bg-white rounded-card p-5 shadow-brand">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={15} className="text-calipso" />
          <h3 className="font-display text-base font-semibold italic text-ink">Configuración de envíos</h3>
        </div>
        <p className="text-xs text-ink-secondary mb-4">
          Conecta{' '}
          <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-calipso hover:underline inline-flex items-center gap-0.5">
            Resend <ExternalLink size={10} />
          </a>
          {' '}para enviar emails automáticos. Es gratuito hasta 3.000 emails/mes.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="re_xxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="flex-1 border border-calipso-100 rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calipso"
          />
          <button
            onClick={saveKey}
            className={`px-4 py-2 rounded-input text-sm font-semibold transition-colors ${
              saved ? 'bg-[#D4EDDA] text-[#3B6D11]' : 'bg-calipso text-white hover:bg-calipso-700'
            }`}
          >
            {saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
        <p className="text-[10px] text-ink-secondary mt-2 flex items-center gap-1">
          <Info size={10} /> La clave se almacena en el navegador. Para producción, usar VITE_RESEND_KEY en .env
        </p>
      </div>

      {/* Toggle switches */}
      <div className="bg-white rounded-card shadow-brand divide-y divide-calipso-50">
        {toggles.map(({ key, label, desc, icon: Icon, badge }) => (
          <div key={key} className="flex items-center gap-4 px-5 py-4">
            <div className={`p-2 rounded-input ${settings[key] ? 'bg-calipso-50' : 'bg-calipso-50/40'}`}>
              <Icon size={15} className={settings[key] ? 'text-calipso' : 'text-ink-secondary'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink">{label}</p>
                {badge && (
                  <span className="text-[10px] bg-arena-warm text-[#BA7517] px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>
                )}
              </div>
              <p className="text-xs text-ink-secondary mt-0.5">{desc}</p>
            </div>
            {/* Toggle */}
            <button
              onClick={() => toggle(key)}
              className={clsx(
                'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200',
                settings[key] ? 'bg-calipso' : 'bg-calipso-100'
              )}
            >
              <span className={clsx(
                'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5',
                settings[key] ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds)
  const [tab, setTab] = useState<'log' | 'config'>('log')
  const [previewRes, setPreviewRes] = useState<Reservation | null>(null)

  const load = async () => {
    setLoading(true)
    const [resos, inv] = await Promise.all([getReservations(), getInventory()])
    setReservations(resos)
    setNotifications(computeNotifications(resos, inv))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = (id: string) => {
    markRead(id)
    setReadIds(getReadIds())
  }

  const handleMarkAllRead = () => {
    markAllRead(notifications.map(n => n.id))
    setReadIds(getReadIds())
  }

  const unread = notifications.filter(n => !readIds.has(n.id)).length

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink font-bold italic">Notificaciones</h1>
          <p className="text-ink-secondary text-sm mt-0.5">
            {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-calipso transition-colors"
            >
              <Eye size={13} /> Marcar todo leído
            </button>
          )}
          <button onClick={load} className="text-ink-secondary hover:text-calipso">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-calipso-50 rounded-card w-fit">
        {([['log', 'Centro de alertas'], ['config', 'Configuración']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-input text-sm font-medium transition-all ${
              tab === key ? 'bg-white text-ink shadow-brand' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {label}
            {key === 'log' && unread > 0 && (
              <span className="ml-1.5 bg-coral text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'config' ? (
        <ConfigPanel />
      ) : (
        <>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-card p-12 shadow-brand text-center">
              <BellOff size={40} className="text-calipso-200 mx-auto mb-4" />
              <p className="font-display italic text-lg text-ink">Sin notificaciones</p>
              <p className="text-ink-secondary text-sm mt-1">Todo está en orden</p>
            </div>
          ) : (
            <div className="bg-white rounded-card shadow-brand divide-y divide-calipso-50">
              {notifications.map(notif => {
                const { icon: Icon, cls, bg, label } = NOTIF_CFG[notif.type]
                const isRead = readIds.has(notif.id)
                const linkedRes = notif.type === 'reservation_new' || notif.type === 'reservation_pending'
                  ? reservations.find(r => notif.id.includes(r.id))
                  : undefined

                return (
                  <div
                    key={notif.id}
                    className={clsx(
                      'flex items-start gap-4 px-5 py-4 transition-colors',
                      !isRead && 'bg-calipso-50/30'
                    )}
                  >
                    {/* Unread dot */}
                    <div className="flex-shrink-0 mt-1 relative">
                      <div className={`p-2 rounded-full ${bg}`}>
                        <Icon size={15} className={cls} />
                      </div>
                      {!isRead && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-coral" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx(
                              'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                              bg, cls
                            )}>{label}</span>
                            <p className="text-sm font-medium text-ink">{notif.title}</p>
                          </div>
                          <p className="text-xs text-ink-secondary mt-0.5">{notif.body}</p>
                        </div>
                        <span className="text-[11px] text-ink-secondary flex-shrink-0">
                          {elapsed(notif.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        {notif.link && (
                          <Link
                            to={notif.link}
                            className="text-xs text-calipso hover:underline flex items-center gap-0.5"
                          >
                            Ver <ChevronRight size={11} />
                          </Link>
                        )}
                        {linkedRes && (
                          <button
                            onClick={() => setPreviewRes(linkedRes)}
                            className="text-xs text-ink-secondary hover:text-calipso flex items-center gap-0.5 transition-colors"
                          >
                            <Mail size={11} /> Ver email
                          </button>
                        )}
                        {!isRead && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="text-xs text-ink-secondary hover:text-ink transition-colors ml-auto"
                          >
                            Marcar leído
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {previewRes && (
        <EmailPreview reservation={previewRes} onClose={() => setPreviewRes(null)} />
      )}
    </div>
  )
}
