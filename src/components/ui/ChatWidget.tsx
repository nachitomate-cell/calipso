import { useState, useEffect, useRef, useCallback } from 'react'
import { createChatSession, sendChatMessage, getChatSession } from '../../lib/api'
import {
  MessageCircle, X, Send, ChevronDown,
  Phone, User, ChevronRight, Bot,
} from 'lucide-react'
import clsx from 'clsx'

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: '¿Cuál es el horario?',
    a: 'Atendemos martes a viernes de 13:00–16:00 y de 19:30–23:00. Sábado y domingo de 12:30–23:30. Los lunes permanecemos cerrados.',
  },
  {
    q: '¿Tienen terraza frente al mar?',
    a: 'Sí, nuestra terraza está en primera línea del Pacífico en Concón. La asignación de terraza o interior es según disponibilidad al llegar.',
  },
  {
    q: '¿Aceptan grupos grandes?',
    a: 'Atendemos grupos de hasta 12 personas. Para más de 8 personas recomendamos reservar con al menos 48 h de anticipación e indicarlo en las notas.',
  },
  {
    q: '¿Tienen opciones vegetarianas?',
    a: 'Contamos con entradas y postres vegetarianos. Para alergias o dietas específicas, indícalo en las notas de tu reserva y el chef lo tendrá en cuenta.',
  },
  {
    q: '¿Puedo llevar torta de cumpleaños?',
    a: '¡Con gusto! Solo avísanos al reservar para coordinar el servicio de corte y presentación. También podemos decorar la mesa si lo deseas.',
  },
  {
    q: '¿Cómo cancelo mi reserva?',
    a: 'Puedes cancelar hasta 24 h antes sin costo. Escríbenos aquí, envíanos un correo o llámanos al +56 9 8765 4321.',
  },
  {
    q: '¿Hay estacionamiento?',
    a: 'No contamos con estacionamiento propio, pero hay estacionamiento público en Av. Borgoño a 200 metros y espacios en la calle frente al restaurante.',
  },
  {
    q: '¿Qué pasa si llego tarde?',
    a: 'Mantenemos la reserva hasta 15 minutos después de tu hora. Si necesitas más tiempo, avísanos llamando al +56 9 8765 4321.',
  },
]

const STORAGE_KEY = 'calipso_chat_session'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalMessage {
  id: string
  sender: 'guest' | 'bot' | 'admin'
  text: string
  ts: number
}

interface ContactInfo {
  name: string
  phone: string
  email: string
}

type Phase = 'welcome' | 'chat' | 'contact-form' | 'sent'

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 bg-white rounded-2xl rounded-tl-sm shadow-sm w-fit">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-ink/30 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  )
}

function Bubble({ msg }: { msg: LocalMessage }) {
  const isGuest = msg.sender === 'guest'
  return (
    <div className={clsx('flex items-end gap-2', isGuest ? 'flex-row-reverse' : 'flex-row')}>
      {!isGuest && (
        <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center flex-shrink-0 mb-0.5">
          <Bot size={12} className="text-calipso" />
        </div>
      )}
      <div
        className={clsx(
          'max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
          isGuest
            ? 'bg-calipso text-white rounded-2xl rounded-br-sm'
            : 'bg-white text-ink rounded-2xl rounded-tl-sm'
        )}
      >
        {msg.text}
      </div>
    </div>
  )
}

// ── Contact form ──────────────────────────────────────────────────────────────

function ContactForm({
  pendingMessage,
  onSubmit,
  onCancel,
}: {
  pendingMessage: string
  onSubmit: (info: ContactInfo) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<ContactInfo>({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) { setError('Nombre y teléfono son requeridos'); return }
    setSaving(true)
    try { await onSubmit(form) } catch { setError('Error al enviar. Intenta de nuevo.') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-4 space-y-3 bg-calipso-50 rounded-2xl mx-1 border border-calipso/20">
      <p className="text-xs font-semibold text-ink uppercase tracking-wide">Para enviarte respuesta</p>

      {pendingMessage && (
        <div className="text-xs text-ink-secondary bg-white rounded-lg px-3 py-2 border border-calipso-100 truncate">
          <span className="text-ink/40">Tu mensaje: </span>{pendingMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            placeholder="Tu nombre *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full pl-8 pr-3 py-2 text-sm border border-calipso-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-calipso bg-white"
          />
        </div>
        <div className="relative">
          <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            placeholder="Teléfono *"
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full pl-8 pr-3 py-2 text-sm border border-calipso-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-calipso bg-white"
          />
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button" onClick={onCancel}
            className="flex-1 border border-calipso-100 text-ink-secondary text-xs py-2 rounded-lg hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={saving}
            className="flex-1 bg-calipso text-white text-xs font-semibold py-2 rounded-lg hover:bg-calipso-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {saving ? '…' : <><Send size={11} /> Enviar</>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('welcome')
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingMsg, setPendingMsg] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore session from storage
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
      if (stored?.id) {
        setSessionId(stored.id)
        setPhase('chat')
        // Load existing messages from API
        getChatSession(stored.id).then(session => {
          if (session?.messages) {
            setMessages(session.messages.map(m => ({
              id: m.id, sender: m.sender as LocalMessage['sender'],
              text: m.text, ts: new Date(m.created_at).getTime(),
            })))
          }
        })
      }
    } catch { /* ignore */ }
  }, [])

  // Poll for admin replies when chat is open and we have a session
  useEffect(() => {
    if (!sessionId || !open || phase !== 'chat') return
    const poll = setInterval(async () => {
      const session = await getChatSession(sessionId)
      if (!session?.messages) return
      const remote = session.messages.map(m => ({
        id: m.id, sender: m.sender as LocalMessage['sender'],
        text: m.text, ts: new Date(m.created_at).getTime(),
      }))
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newOnes = remote.filter(m => !existingIds.has(m.id))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })
    }, 8000)
    return () => clearInterval(poll)
  }, [sessionId, open, phase])

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => { if (open) scrollBottom() }, [messages, typing, open, scrollBottom])

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300) }
  }, [open])

  const addMsg = (sender: LocalMessage['sender'], text: string) => {
    const msg: LocalMessage = { id: `local-${Date.now()}-${Math.random()}`, sender, text, ts: Date.now() }
    setMessages(prev => [...prev, msg])
    return msg
  }

  const botReply = (text: string, delay = 700) => {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      addMsg('bot', text)
    }, delay + Math.random() * 300)
  }

  // FAQ click
  const handleFAQ = (faq: typeof FAQS[0]) => {
    setPhase('chat')
    addMsg('guest', faq.q)
    botReply(faq.a)
  }

  // Free text send
  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setPhase('chat')
    addMsg('guest', text)

    // If we have a session, send directly
    if (sessionId) {
      sendChatMessage(sessionId, text, 'guest')
      botReply('Gracias por tu mensaje. Un miembro de nuestro equipo te responderá a la brevedad.')
    } else {
      // Need contact info first
      setPendingMsg(text)
      setTimeout(() => setPhase('contact-form'), 600)
    }
  }

  // Contact form submitted
  const handleContactSubmit = async (info: ContactInfo) => {
    const session = await createChatSession(info.name, info.phone, info.email || undefined)
    setSessionId(session.id)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: session.id }))

    // Send all local guest messages + pending
    const allGuestMsgs = [...messages.filter(m => m.sender === 'guest').map(m => m.text), pendingMsg]
    for (const text of [...new Set(allGuestMsgs)]) {
      await sendChatMessage(session.id, text, 'guest')
    }
    setPendingMsg('')
    setPhase('sent')
    addMsg('admin', `Hola ${info.name}! Hemos recibido tu mensaje. Te contactaremos al ${info.phone} a la brevedad. ¡Gracias!`)
  }

  // "Comunicarme con el restaurante" button
  const handleEscalate = () => {
    if (sessionId) {
      // Already have session — send a flag message
      sendChatMessage(sessionId, '🔔 El cliente solicita atención personalizada', 'guest')
      botReply('¡Entendido! Hemos notificado al restaurante. Te contactarán pronto. También puedes llamar al +56 9 8765 4321.')
    } else {
      setPendingMsg(messages.filter(m => m.sender === 'guest').map(m => m.text).join(' | ') || 'Solicita atención')
      setPhase('contact-form')
    }
  }

  const hasGuestMessages = messages.some(m => m.sender === 'guest')

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Abrir chat de ayuda"
        className={clsx(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-brand-lg flex items-center justify-center transition-all duration-300',
          open ? 'bg-ink rotate-0 scale-95' : 'bg-[#E8593C] hover:bg-[#C04828] hover:scale-110'
        )}
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
      >
        {open
          ? <ChevronDown size={22} className="text-white" />
          : <MessageCircle size={22} className="text-white" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-calipso text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl overflow-hidden shadow-brand-lg"
          style={{
            height: 'min(520px, calc(100vh - 120px))',
            animation: 'slideUp 200ms ease-out',
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div className="bg-ink px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-calipso flex items-center justify-center flex-shrink-0">
              <MessageCircle size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none">Calipso Restaurant</p>
              <p className="text-white/50 text-[10px] mt-0.5">Respondemos en minutos</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto bg-[#F7F9FA] px-3 py-3 space-y-3 min-h-0">

            {/* Welcome / FAQ phase */}
            {(phase === 'welcome' || (phase === 'chat' && messages.length === 0)) && (
              <div className="space-y-3">
                <Bubble msg={{ id: 'welcome', sender: 'bot', ts: 0, text: '¡Hola! 👋 Estamos aquí para resolver tus dudas antes de reservar. ¿En qué podemos ayudarte?' }} />

                <div className="space-y-1.5 pl-8">
                  {FAQS.map(faq => (
                    <button
                      key={faq.q}
                      onClick={() => handleFAQ(faq)}
                      className="flex items-center gap-2 w-full text-left text-xs bg-white border border-calipso-100 hover:border-calipso hover:bg-calipso-50 px-3 py-2 rounded-xl text-ink transition-all duration-150 shadow-sm group"
                    >
                      <span className="flex-1">{faq.q}</span>
                      <ChevronRight size={11} className="text-calipso opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

            {/* Typing indicator */}
            {typing && <TypingDots />}

            {/* Contact form */}
            {phase === 'contact-form' && (
              <ContactForm
                pendingMessage={pendingMsg}
                onSubmit={handleContactSubmit}
                onCancel={() => setPhase('chat')}
              />
            )}

            {/* After sent — show quick actions */}
            {phase === 'sent' && (
              <div className="flex gap-2 flex-wrap pl-8">
                <button
                  onClick={() => { setPhase('welcome'); setMessages([]); setSessionId(null); sessionStorage.removeItem(STORAGE_KEY) }}
                  className="text-xs text-calipso hover:underline"
                >
                  Nueva consulta
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-calipso-100 flex-shrink-0">
            {/* Escalate CTA — shown before they have a session */}
            {!sessionId && hasGuestMessages && phase === 'chat' && (
              <div className="px-3 pt-2">
                <button
                  onClick={handleEscalate}
                  className="w-full flex items-center justify-center gap-2 bg-[#E8593C] hover:bg-[#C04828] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Phone size={12} /> Comunicarme con el restaurante
                </button>
              </div>
            )}

            {/* Escalate CTA — shown in welcome phase too */}
            {phase === 'welcome' && (
              <div className="px-3 pt-2">
                <button
                  onClick={handleEscalate}
                  className="w-full flex items-center justify-center gap-2 border border-[#E8593C]/50 text-[#E8593C] hover:bg-[#E8593C] hover:text-white text-xs font-semibold py-2 rounded-xl transition-all"
                >
                  <Phone size={12} /> Comunicarme con el restaurante
                </button>
              </div>
            )}

            {/* Input */}
            {phase !== 'contact-form' && (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escribe tu pregunta…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-calipso-100 focus:outline-none focus:ring-2 focus:ring-calipso bg-[#F7F9FA]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-full bg-calipso disabled:bg-calipso/30 text-white flex items-center justify-center transition-colors hover:bg-calipso-700 flex-shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            )}

            <p className="text-center text-[9px] text-ink/20 pb-2">Calipso Restaurant · Concón, Chile</p>
          </div>
        </div>
      )}
    </>
  )
}
