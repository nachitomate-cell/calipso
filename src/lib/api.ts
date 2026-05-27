import { supabase } from './supabase'
import {
  mockCategories, mockMenuItems, mockTables, mockReservations,
  mockInventory, mockOrders, mockOrderItems, mockHistoricalOrders,
  mockChatSessions, mockChatMessages, mockWaiters,
} from './mock-data'
import type { Category, MenuItem, Table, Reservation, InventoryItem, Order, OrderItem, AppNotification, ChatSession, ChatMessage, Waiter } from '../types'

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL

// ── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  if (USE_MOCK) return mockCategories.filter(c => c.is_active)
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data as Category[]
}

export async function getAllCategories(): Promise<Category[]> {
  if (USE_MOCK) return mockCategories
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data as Category[]
}

export async function upsertCategory(cat: Partial<Category> & { name: string; slug: string }): Promise<Category> {
  if (USE_MOCK) throw new Error('Connect Supabase to save data')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('categories') as any).upsert(cat).select().single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string): Promise<void> {
  if (USE_MOCK) throw new Error('Connect Supabase to save data')
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItems(): Promise<MenuItem[]> {
  if (USE_MOCK) return mockMenuItems.filter(i => i.is_available)
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, category:categories(*)')
    .eq('is_available', true)
    .order('sort_order')
  if (error) throw error
  return data as unknown as MenuItem[]
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  if (USE_MOCK) return mockMenuItems
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, category:categories(*)')
    .order('sort_order')
  if (error) throw error
  return data as unknown as MenuItem[]
}

export async function upsertMenuItem(item: Partial<MenuItem> & { name: string; category_id: string; price: number }): Promise<MenuItem> {
  if (USE_MOCK) throw new Error('Connect Supabase to save data')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('menu_items') as any).upsert(item).select().single()
  if (error) throw error
  return data as MenuItem
}

export async function deleteMenuItem(id: string): Promise<void> {
  if (USE_MOCK) throw new Error('Connect Supabase to save data')
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw error
}

// ── Tables ────────────────────────────────────────────────────────────────────

export async function getTables(): Promise<Table[]> {
  if (USE_MOCK) return mockTables
  const { data, error } = await supabase.from('tables').select('*').order('number')
  if (error) throw error
  return data as Table[]
}

export async function upsertTable(table: Partial<Table> & { number: number; capacity: number }): Promise<Table> {
  if (USE_MOCK) throw new Error('Connect Supabase to save data')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tables') as any).upsert(table).select().single()
  if (error) throw error
  return data as Table
}

export async function deleteTable(id: string): Promise<void> {
  if (USE_MOCK) throw new Error('Connect Supabase to save data')
  const { error } = await supabase.from('tables').delete().eq('id', id)
  if (error) throw error
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function getReservations(): Promise<Reservation[]> {
  if (USE_MOCK) return mockReservations
  const { data, error } = await supabase
    .from('reservations')
    .select('*, table:tables(*)')
    .order('date', { ascending: true })
    .order('time', { ascending: true })
  if (error) throw error
  return data as unknown as Reservation[]
}

export async function createReservation(res: Omit<Reservation, 'id' | 'created_at' | 'status'>): Promise<Reservation> {
  if (USE_MOCK) {
    const mock: Reservation = { ...res, id: Date.now().toString(), status: 'pending', created_at: new Date().toISOString() }
    mockReservations.push(mock)
    return mock
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('reservations') as any)
    .insert({ ...res, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data as Reservation
}

export async function updateReservationStatus(id: string, status: Reservation['status']): Promise<void> {
  if (USE_MOCK) {
    const r = mockReservations.find(r => r.id === id)
    if (r) r.status = status
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('reservations') as any).update({ status }).eq('id', id)
  if (error) throw error
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventory(): Promise<InventoryItem[]> {
  if (USE_MOCK) {
    return mockInventory.map(inv => ({
      ...inv,
      menu_item: inv.menu_item_id ? mockMenuItems.find(m => m.id === inv.menu_item_id) : undefined,
    }))
  }
  const { data, error } = await supabase
    .from('inventory')
    .select('*, menu_item:menu_items(*)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as InventoryItem[]
}

export async function getInventoryByBarcode(barcode: string): Promise<InventoryItem | null> {
  if (USE_MOCK) {
    const inv = mockInventory.find(i => i.barcode === barcode)
    if (!inv) return null
    return {
      ...inv,
      menu_item: inv.menu_item_id ? mockMenuItems.find(m => m.id === inv.menu_item_id) : undefined,
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('inventory') as any)
    .select('*, menu_item:menu_items(*)')
    .eq('barcode', barcode)
    .maybeSingle()
  if (error) throw error
  return data as InventoryItem | null
}

// ── Orders ────────────────────────────────────────────────────────────────────

function hydrateOrders(orders: Order[]): Order[] {
  return orders.map(ord => ({
    ...ord,
    table: mockTables.find(t => t.id === ord.table_id),
    items: mockOrderItems
      .filter(i => i.order_id === ord.id)
      .map(i => ({ ...i, menu_item: mockMenuItems.find(m => m.id === i.menu_item_id) })),
  }))
}

export async function getActiveOrders(): Promise<Order[]> {
  if (USE_MOCK) {
    const active = mockOrders.filter(o => o.status !== 'paid' && o.status !== 'cancelled')
    return hydrateOrders(active)
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, table:tables(*), items:order_items(*, menu_item:menu_items(*))')
    .not('status', 'in', '("paid","cancelled")')
    .order('created_at')
  if (error) throw error
  return data as unknown as Order[]
}

export async function getAllOrders(): Promise<Order[]> {
  if (USE_MOCK) return [...hydrateOrders(mockOrders), ...mockHistoricalOrders]
  const { data, error } = await supabase
    .from('orders')
    .select('*, table:tables(*), items:order_items(*, menu_item:menu_items(*))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Order[]
}

export async function createOrder(tableId: string, waiterName?: string, notes?: string): Promise<Order> {
  if (USE_MOCK) {
    const order: Order = {
      id: `ord-${Date.now()}`, table_id: tableId, status: 'open',
      notes: notes ?? null, waiter_name: waiterName ?? null, total: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    mockOrders.push(order)
    return { ...order, table: mockTables.find(t => t.id === tableId), items: [] }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('orders') as any)
    .insert({ table_id: tableId, notes: notes ?? null, waiter_name: waiterName ?? null, status: 'open', total: 0 })
    .select().single()
  if (error) throw error
  return data as Order
}

export async function addOrderItem(
  orderId: string, menuItemId: string, quantity: number, notes?: string
): Promise<OrderItem> {
  const menuItem = mockMenuItems.find(m => m.id === menuItemId)
  const unitPrice = menuItem?.price ?? 0

  if (USE_MOCK) {
    // Remove existing item with same menu_item_id and pending status
    const existIdx = mockOrderItems.findIndex(
      i => i.order_id === orderId && i.menu_item_id === menuItemId && i.status === 'pending'
    )
    if (existIdx >= 0) {
      mockOrderItems[existIdx].quantity += quantity
      const item = mockOrderItems[existIdx]
      updateOrderTotal(orderId)
      return { ...item, menu_item: menuItem }
    }
    const item: OrderItem = {
      id: `oi-${Date.now()}`, order_id: orderId, menu_item_id: menuItemId,
      quantity, unit_price: unitPrice, notes: notes ?? null,
      status: 'pending', created_at: new Date().toISOString(),
    }
    mockOrderItems.push(item)
    updateOrderTotal(orderId)
    return { ...item, menu_item: menuItem }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('order_items') as any)
    .insert({ order_id: orderId, menu_item_id: menuItemId, quantity, unit_price: unitPrice, notes: notes ?? null, status: 'pending' })
    .select().single()
  if (error) throw error
  return data as OrderItem
}

function updateOrderTotal(orderId: string) {
  const order = mockOrders.find(o => o.id === orderId)
  if (!order) return
  const items = mockOrderItems.filter(i => i.order_id === orderId)
  order.total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  order.updated_at = new Date().toISOString()
}

export async function removeOrderItem(itemId: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockOrderItems.findIndex(i => i.id === itemId)
    if (idx >= 0) {
      const orderId = mockOrderItems[idx].order_id
      mockOrderItems.splice(idx, 1)
      updateOrderTotal(orderId)
    }
    return
  }
  const { error } = await supabase.from('order_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function updateOrderItemStatus(itemId: string, status: OrderItem['status']): Promise<void> {
  if (USE_MOCK) {
    const item = mockOrderItems.find(i => i.id === itemId)
    if (item) { item.status = status }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('order_items') as any).update({ status }).eq('id', itemId)
  if (error) throw error
}

export async function updateOrderItemQty(itemId: string, quantity: number): Promise<void> {
  if (USE_MOCK) {
    const item = mockOrderItems.find(i => i.id === itemId)
    if (item) { item.quantity = quantity; updateOrderTotal(item.order_id) }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('order_items') as any).update({ quantity }).eq('id', itemId)
  if (error) throw error
}

export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
  if (USE_MOCK) {
    const order = mockOrders.find(o => o.id === orderId)
    if (order) { order.notes = notes; order.updated_at = new Date().toISOString() }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('orders') as any).update({ notes }).eq('id', orderId)
  if (error) throw error
}

export async function sendOrderToKitchen(orderId: string): Promise<void> {
  if (USE_MOCK) {
    mockOrderItems
      .filter(i => i.order_id === orderId && i.status === 'pending')
      .forEach(i => { i.status = 'in_kitchen' })
    const order = mockOrders.find(o => o.id === orderId)
    if (order) { order.status = 'in_kitchen'; order.updated_at = new Date().toISOString() }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('order_items') as any).update({ status: 'in_kitchen' }).eq('order_id', orderId).eq('status', 'pending')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('orders') as any).update({ status: 'in_kitchen' }).eq('id', orderId)
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  if (USE_MOCK) {
    const order = mockOrders.find(o => o.id === orderId)
    if (order) { order.status = status; order.updated_at = new Date().toISOString() }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('orders') as any).update({ status }).eq('id', orderId)
  if (error) throw error
}

export async function closeOrder(orderId: string): Promise<void> {
  if (USE_MOCK) {
    const order = mockOrders.find(o => o.id === orderId)
    if (order) {
      order.status = 'paid'
      order.updated_at = new Date().toISOString()
      mockHistoricalOrders.push({ ...order })
      const idx = mockOrders.indexOf(order)
      mockOrders.splice(idx, 1)
    }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('orders') as any).update({ status: 'paid' }).eq('id', orderId)
}

// ── Notifications (computed from data) ────────────────────────────────────────

export function computeNotifications(
  reservations: Reservation[], inventory: InventoryItem[]
): AppNotification[] {
  const now = Date.now()
  const notes: AppNotification[] = []

  // New reservations (last 24h)
  reservations
    .filter(r => r.status === 'pending' && now - new Date(r.created_at).getTime() < 86400000)
    .forEach(r => {
      notes.push({
        id: `res-new-${r.id}`, type: 'reservation_new', read: false,
        title: 'Nueva reserva recibida',
        body: `${r.guest_name} · ${r.party_size} pers. · ${r.date} ${r.time}`,
        link: '/admin/reservas',
        created_at: r.created_at,
      })
    })

  // Old pending (> 12h without confirmation)
  reservations
    .filter(r => r.status === 'pending' && now - new Date(r.created_at).getTime() > 43200000)
    .forEach(r => {
      notes.push({
        id: `res-pending-${r.id}`, type: 'reservation_pending', read: false,
        title: 'Reserva sin confirmar',
        body: `${r.guest_name} lleva más de 12 h esperando confirmación`,
        link: '/admin/reservas',
        created_at: r.created_at,
      })
    })

  const invName = (i: InventoryItem) =>
    i.menu_item?.name ?? i.product_name ?? (i.barcode ? `Cód. ${i.barcode}` : i.id)

  // Stock out
  inventory.filter(i => i.stock_quantity === 0).forEach(i => {
    notes.push({
      id: `stock-out-${i.id}`, type: 'stock_out', read: false,
      title: 'Sin stock',
      body: `${invName(i)} — agotado`,
      link: '/admin/inventario',
      created_at: i.updated_at,
    })
  })

  // Stock low
  inventory.filter(i => i.stock_quantity > 0 && i.stock_quantity < i.min_stock).forEach(i => {
    notes.push({
      id: `stock-low-${i.id}`, type: 'stock_low', read: false,
      title: 'Stock bajo',
      body: `${invName(i)} — ${i.stock_quantity} ${i.unit} (mín. ${i.min_stock})`,
      link: '/admin/inventario',
      created_at: i.updated_at,
    })
  })

  return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function upsertInventoryItem(
  item: Partial<InventoryItem> & { stock_quantity: number }
): Promise<InventoryItem> {
  if (USE_MOCK) {
    // Find by id first, then by menu_item_id
    const existing = item.id
      ? mockInventory.find(i => i.id === item.id)
      : item.menu_item_id
        ? mockInventory.find(i => i.menu_item_id === item.menu_item_id)
        : null
    if (existing) {
      Object.assign(existing, item, { updated_at: new Date().toISOString() })
      return {
        ...existing,
        menu_item: existing.menu_item_id ? mockMenuItems.find(m => m.id === existing.menu_item_id) : undefined,
      }
    }
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      menu_item_id: null,
      product_name: null,
      barcode: null,
      unit: 'unidades',
      min_stock: 5,
      cost_price: 0,
      updated_at: new Date().toISOString(),
      ...item,
    }
    mockInventory.push(newItem)
    return { ...newItem, menu_item: newItem.menu_item_id ? mockMenuItems.find(m => m.id === newItem.menu_item_id) : undefined }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('inventory') as any)
    .upsert({ ...item, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as InventoryItem
}

// ── Waiters / Garzones ───────────────────────────────────────────────────────

export async function getWaiters(): Promise<Waiter[]> {
  if (USE_MOCK) return mockWaiters.filter(w => w.is_active)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('waiters') as any).select('*').eq('is_active', true).order('name')
  if (error) throw error
  return data as Waiter[]
}

export async function getAllWaiters(): Promise<Waiter[]> {
  if (USE_MOCK) return [...mockWaiters]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('waiters') as any).select('*').order('name')
  if (error) throw error
  return data as Waiter[]
}

export async function upsertWaiter(waiter: Partial<Waiter> & { name: string }): Promise<Waiter> {
  if (USE_MOCK) {
    const existing = mockWaiters.find(w => w.id === waiter.id)
    if (existing) { Object.assign(existing, waiter); return existing }
    const nw: Waiter = { id: `w-${Date.now()}`, name: waiter.name, is_active: waiter.is_active ?? true, created_at: new Date().toISOString() }
    mockWaiters.push(nw)
    return nw
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('waiters') as any).upsert(waiter).select().single()
  if (error) throw error
  return data as Waiter
}

export async function deleteWaiter(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockWaiters.findIndex(w => w.id === id)
    if (idx >= 0) mockWaiters.splice(idx, 1)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('waiters') as any).delete().eq('id', id)
  if (error) throw error
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function getChatSessions(): Promise<ChatSession[]> {
  if (USE_MOCK) {
    return [...mockChatSessions]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as ChatSession[]
}

export async function getChatSession(id: string): Promise<ChatSession | null> {
  if (USE_MOCK) {
    const session = mockChatSessions.find(s => s.id === id)
    if (!session) return null
    return {
      ...session,
      messages: mockChatMessages
        .filter(m => m.session_id === id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }
  }
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*, messages:chat_messages(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ChatSession
}

export async function createChatSession(
  guestName: string, guestPhone: string, guestEmail?: string
): Promise<ChatSession> {
  if (USE_MOCK) {
    const session: ChatSession = {
      id: `cs-${Date.now()}`,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: guestEmail ?? null,
      status: 'open',
      unread_admin: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockChatSessions.push(session)
    return session
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('chat_sessions') as any)
    .insert({ guest_name: guestName, guest_phone: guestPhone, guest_email: guestEmail ?? null, status: 'open', unread_admin: 0 })
    .select().single()
  if (error) throw error
  return data as ChatSession
}

export async function sendChatMessage(
  sessionId: string, text: string, sender: ChatMessage['sender']
): Promise<ChatMessage> {
  if (USE_MOCK) {
    const msg: ChatMessage = {
      id: `cm-${Date.now()}`,
      session_id: sessionId,
      sender,
      text,
      created_at: new Date().toISOString(),
    }
    mockChatMessages.push(msg)
    // Update session
    const session = mockChatSessions.find(s => s.id === sessionId)
    if (session) {
      session.updated_at = new Date().toISOString()
      if (sender === 'guest') session.unread_admin += 1
    }
    return msg
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('chat_messages') as any)
    .insert({ session_id: sessionId, text, sender })
    .select().single()
  if (error) throw error
  return data as ChatMessage
}

export async function markChatSessionRead(sessionId: string): Promise<void> {
  if (USE_MOCK) {
    const session = mockChatSessions.find(s => s.id === sessionId)
    if (session) session.unread_admin = 0
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('chat_sessions') as any).update({ unread_admin: 0 }).eq('id', sessionId)
}

export async function resolveChatSession(sessionId: string): Promise<void> {
  if (USE_MOCK) {
    const session = mockChatSessions.find(s => s.id === sessionId)
    if (session) { session.status = 'resolved'; session.unread_admin = 0 }
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('chat_sessions') as any).update({ status: 'resolved', unread_admin: 0 }).eq('id', sessionId)
}

export async function getTotalUnreadChat(): Promise<number> {
  if (USE_MOCK) {
    return mockChatSessions.reduce((s, c) => s + c.unread_admin, 0)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('chat_sessions') as any).select('unread_admin').eq('status', 'open')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).reduce((s: number, c: any) => s + (c.unread_admin ?? 0), 0)
}
