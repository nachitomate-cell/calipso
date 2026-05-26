import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getChatSessions, getChatSession, sendChatMessage,
  markChatSessionRead, resolveChatSession,
} from '../../lib/api'
import type { ChatSession, ChatMessage } from '../../types'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import {
  MessageCircle, Send, CheckCheck, RefreshCw,
  Phone, Mail, Clock, Circle, Check,
} from 'lucide-react'
import clsx from 'clsx'

// ── helpers ───────────────────────────────────────────────────────────────────

function elapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function lastMessage(session: ChatSession, messages: ChatMessage[]): string {
  const msgs = messages.filter(m => m.session_id === session.id)
  if (msgs.length === 0) return 'Sin mensajes'
  const last = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  const prefix = last.sender === 'admin' ? 'Tú: ' : last.sender === 'bot' ? 'Bot: ' : ''
  return prefix + last.text
}

// ── Session list item ─────────────────────────────────────────────────────────

function SessionItem({
  session, messages, selected, onClick,
}: {
  session: ChatSession
  messages: ChatMessage[]
  selected: boolean
  onClick: () => void
}) {
  const last = lastMessage(session, messages)
  const isOpen = session.status === 'open'

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-4 py-3.5 border-b border-calipso-50 transition-colors flex items-start gap-3',
        selected ? 'bg-calipso-50' : 'hover:bg-calipso-50/50'
      )}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5',
        isOpen ? 'bg-calipso text-white' : 'bg-ink/10 text-ink-secondary'
      )}>
        {(session.guest_name ?? '?')[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className={clsx('text-sm font-medium truncate', selected ? 'text-calipso' : 'text-ink')}>
            {session.guest_name ?? 'Visitante'}
          </p>
          <span className="text-[10px] text-ink-secondary flex-shrink-0">
            {elapsed(session.updated_at)}
          </span>
        </div>
        <p className="text-xs text-ink-secondary truncate">{last}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx(
            'text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
            isOpen ? 'bg-calipso-50 text-calipso' : 'bg-ink/8 text-ink-secondary'
          )}>
            {isOpen ? 'Abierta' : 'Resuelta'}
          </span>
          {session.unread_admin > 0 && (
            <span className="bg-coral text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {session.unread_admin} nuevo{session.unread_admin > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isAdmin = msg.sender === 'admin'
  const isBot = msg.sender === 'bot'

  return (
    <div className={clsx('flex items-end gap-2', isAdmin ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mb-0.5',
        isAdmin ? 'bg-calipso-700 text-white' :
        isBot   ? 'bg-ink text-calipso' :
                  'bg-calipso text-white'
      )}>
        {isAdmin ? 'A' : isBot ? '🤖' : 'C'}
      </div>

      <div className="max-w-[75%] space-y-0.5">
        <div className={clsx(
          'px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl shadow-sm',
          isAdmin
            ? 'bg-calipso-700 text-white rounded-br-sm'
            : isBot
              ? 'bg-ink/8 text-ink rounded-tl-sm border border-calipso-100'
              : 'bg-calipso-50 text-ink rounded-tl-sm border border-calipso-100'
        )}>
          {msg.text}
        </div>
        <p className={clsx(
          'text-[9px] px-1',
          isAdmin ? 'text-right text-ink-secondary' : 'text-ink-secondary'
        )}>
          {isAdmin ? 'Restaurante' : isBot ? 'Bot' : 'Cliente'} · {elapsed(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

// ── Conversation panel ────────────────────────────────────────────────────────

function ConversationPanel({
  session, onUpdate,
}: {
  session: ChatSession
  onUpdate: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const full = await getChatSession(session.id)
    setMessages(full?.messages ?? [])
    setLoading(false)
    // Mark read
    if (session.unread_admin > 0) {
      await markChatSessionRead(session.id)
      onUpdate()
    }
  }, [session.id, session.unread_admin, onUpdate])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  // Poll for new messages
  useEffect(() => {
    if (session.status === 'resolved') return
    const poll = setInterval(loadMessages, 10000)
    return () => clearInterval(poll)
  }, [session.id, session.status, loadMessages])

  const handleSend = async () => {
    const text = reply.trim()
    if (!text || sending) return
    setSending(true)
    setReply('')
    try {
      await sendChatMessage(session.id, text, 'admin')
      await loadMessages()
      onUpdate()
    } finally { setSending(false) }
  }

  const handleResolve = async () => {
    setResolving(true)
    try { await resolveChatSession(session.id); onUpdate() }
    finally { setResolving(false) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="px-5 py-4 border-b border-calipso-100 bg-white flex items-start justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-calipso flex items-center justify-center text-white font-bold flex-shrink-0">
            {(session.guest_name ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-display font-semibold italic text-ink text-base">
              {session.guest_name ?? 'Visitante anónimo'}
            </p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {session.guest_phone && (
                <a href={`tel:${session.guest_phone}`} className="flex items-center gap-1 text-xs text-ink-secondary hover:text-calipso transition-colors">
                  <Phone size={10} /> {session.guest_phone}
                </a>
              )}
              {session.guest_email && (
                <a href={`mailto:${session.guest_email}`} className="flex items-center gap-1 text-xs text-ink-secondary hover:text-calipso transition-colors">
                  <Mail size={10} /> {session.guest_email}
                </a>
              )}
              <span className="flex items-center gap-1 text-[10px] text-ink-secondary">
                <Clock size={9} /> Desde {elapsed(session.created_at)}
              </span>
            </div>
          </div>
        </div>

        {session.status === 'open' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-1.5 border border-[#3B6D11]/30 text-[#3B6D11] bg-[#D4EDDA] text-xs font-semibold px-3 py-2 rounded-input hover:bg-[#3B6D11] hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {resolving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCheck size={12} />}
            Marcar resuelta
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#F7F9FA] px-4 py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw size={20} className="text-calipso animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-ink-secondary text-sm py-8">Sin mensajes</p>
        ) : (
          messages.map(msg => <Bubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {session.status === 'open' ? (
        <div className="px-4 py-3 border-t border-calipso-100 bg-white flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              placeholder="Escribe tu respuesta… (Enter para enviar)"
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-calipso-100 focus:outline-none focus:ring-2 focus:ring-calipso resize-none bg-[#F7F9FA]"
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="w-9 h-9 rounded-full bg-calipso disabled:bg-calipso/30 text-white flex items-center justify-center transition-colors hover:bg-calipso-700 flex-shrink-0"
            >
              {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
          <p className="text-[10px] text-ink-secondary mt-1.5">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-calipso-100 bg-calipso-50/50 text-center">
          <p className="text-xs text-ink-secondary flex items-center justify-center gap-1.5">
            <Check size={12} className="text-[#3B6D11]" /> Conversación resuelta
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type FilterTab = 'open' | 'resolved' | 'all'

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('open')

  const load = useCallback(async () => {
    const s = await getChatSessions()
    setSessions(s)
    // Load all messages for list previews
    const msgs = await Promise.all(s.map(sess => getChatSession(sess.id)))
    setAllMessages(msgs.flatMap(m => m?.messages ?? []))
    if (!selectedId && s.length > 0) setSelectedId(s[0].id)
    setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  // Poll for new messages
  useEffect(() => {
    const poll = setInterval(load, 15000)
    return () => clearInterval(poll)
  }, [load])

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const filtered = sessions.filter(s =>
    filter === 'all' ? true :
    filter === 'open' ? s.status === 'open' :
    s.status === 'resolved'
  )

  const totalUnread = sessions.reduce((s, c) => s + c.unread_admin, 0)
  const selectedSession = sessions.find(s => s.id === selectedId)

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'open',     label: `Abiertas (${sessions.filter(s => s.status === 'open').length})` },
    { key: 'resolved', label: `Resueltas (${sessions.filter(s => s.status === 'resolved').length})` },
    { key: 'all',      label: 'Todas' },
  ]

  if (loading) return <PageLoader />

  return (
    <div className="font-body" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-ink font-bold italic flex items-center gap-2">
            Chat
            {totalUnread > 0 && (
              <span className="bg-coral text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </h1>
          <p className="text-ink-secondary text-sm mt-0.5">Mensajes de clientes en tiempo real</p>
        </div>
        <button onClick={load} className="text-ink-secondary hover:text-calipso transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Two-pane layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: session list */}
        <div className="w-72 flex-shrink-0 bg-white rounded-card shadow-brand flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-calipso-100">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={clsx(
                  'flex-1 py-2.5 text-[11px] font-semibold transition-colors',
                  filter === tab.key
                    ? 'text-calipso border-b-2 border-calipso'
                    : 'text-ink-secondary hover:text-ink'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Circle size={32} className="text-calipso-100 mb-3" />
                <p className="text-ink-secondary text-sm">Sin conversaciones</p>
              </div>
            ) : (
              filtered.map(session => (
                <SessionItem
                  key={session.id}
                  session={session}
                  messages={allMessages}
                  selected={selectedId === session.id}
                  onClick={() => handleSelect(session.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: conversation */}
        <div className="flex-1 bg-white rounded-card shadow-brand overflow-hidden flex flex-col min-w-0">
          {selectedSession ? (
            <ConversationPanel session={selectedSession} onUpdate={load} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageCircle size={40} className="text-calipso-200 mb-4" />
              <p className="font-display italic text-lg text-ink">Selecciona una conversación</p>
              <p className="text-sm text-ink-secondary mt-1">Haz clic en un chat de la lista</p>
              {totalUnread === 0 && sessions.length > 0 && (
                <p className="text-xs text-[#3B6D11] mt-3 flex items-center gap-1">
                  <CheckCheck size={12} /> Todo al día — sin mensajes sin leer
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
