import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, serverTimestamp,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  mockCategories, mockMenuItems, mockTables, mockReservations,
  mockInventory, mockOrders, mockOrderItems, mockHistoricalOrders,
  mockChatSessions, mockChatMessages, mockWaiters,
  mockCustomers, mockCustomerVisits,
} from './mock-data'
import type {
  Category, MenuItem, Table, Reservation, InventoryItem,
  Order, OrderItem, AppNotification, ChatSession, ChatMessage,
  Waiter, Customer, CustomerVisit,
} from '../types'

export const USE_MOCK = !import.meta.env.VITE_FIREBASE_PROJECT_ID

// ── Firestore helpers ─────────────────────────────────────────────────────────

function fromDoc<T>(snap: DocumentSnapshot): T {
  return { id: snap.id, ...snap.data() } as T
}

async function colDocs<T>(colName: string): Promise<T[]> {
  const snap = await getDocs(collection(db, colName))
  return snap.docs.map(d => fromDoc<T>(d))
}

/** Upsert: if payload has an id, setDoc (merge); otherwise addDoc and return new id */
async function upsert<T extends { id?: string }>(colName: string, payload: T): Promise<string> {
  const { id, ...data } = payload
  if (id) {
    await setDoc(doc(db, colName, id), data, { merge: true })
    return id
  }
  const ref = await addDoc(collection(db, colName), data)
  return ref.id
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  if (USE_MOCK) return mockCategories.filter(c => c.is_active)
  const all = await colDocs<Category>('categories')
  return all.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order)
}

export async function getAllCategories(): Promise<Category[]> {
  if (USE_MOCK) return mockCategories
  const all = await colDocs<Category>('categories')
  return all.sort((a, b) => a.sort_order - b.sort_order)
}

export async function upsertCategory(cat: Partial<Category> & { name: string; slug: string }): Promise<Category> {
  if (USE_MOCK) throw new Error('Conecta Firebase para guardar datos')
  const id = await upsert('categories', cat)
  return { ...cat, id } as Category
}

export async function deleteCategory(id: string): Promise<void> {
  if (USE_MOCK) throw new Error('Conecta Firebase para guardar datos')
  await deleteDoc(doc(db, 'categories', id))
}

// ── Menu Items ────────────────────────────────────────────────────────────────

export async function getMenuItems(): Promise<MenuItem[]> {
  if (USE_MOCK) return mockMenuItems.filter(i => i.is_available)
  const [items, cats] = await Promise.all([
    colDocs<MenuItem>('menu_items'),
    colDocs<Category>('categories'),
  ])
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]))
  return items
    .filter(i => i.is_available)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(i => ({ ...i, category: catMap[i.category_id] }))
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  if (USE_MOCK) return mockMenuItems
  const [items, cats] = await Promise.all([
    colDocs<MenuItem>('menu_items'),
    colDocs<Category>('categories'),
  ])
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]))
  return items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(i => ({ ...i, category: catMap[i.category_id] }))
}

export async function upsertMenuItem(
  item: Partial<MenuItem> & { name: string; category_id: string; price: number }
): Promise<MenuItem> {
  if (USE_MOCK) throw new Error('Conecta Firebase para guardar datos')
  const id = await upsert('menu_items', { ...item, updated_at: new Date().toISOString() })
  return { ...item, id } as MenuItem
}

export async function deleteMenuItem(id: string): Promise<void> {
  if (USE_MOCK) throw new Error('Conecta Firebase para guardar datos')
  await deleteDoc(doc(db, 'menu_items', id))
}

// ── Tables ────────────────────────────────────────────────────────────────────

export async function getTables(): Promise<Table[]> {
  if (USE_MOCK) return mockTables
  const all = await colDocs<Table>('tables')
  return all.sort((a, b) => a.number - b.number)
}

export async function upsertTable(table: Partial<Table> & { number: number; capacity: number }): Promise<Table> {
  if (USE_MOCK) throw new Error('Conecta Firebase para guardar datos')
  const id = await upsert('tables', table)
  return { ...table, id } as Table
}

export async function deleteTable(id: string): Promise<void> {
  if (USE_MOCK) throw new Error('Conecta Firebase para guardar datos')
  await deleteDoc(doc(db, 'tables', id))
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function getReservations(): Promise<Reservation[]> {
  if (USE_MOCK) return mockReservations
  const [resos, tables] = await Promise.all([
    colDocs<Reservation>('reservations'),
    colDocs<Table>('tables'),
  ])
  const tableMap = Object.fromEntries(tables.map(t => [t.id, t]))
  return resos
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map(r => ({ ...r, table: r.table_id ? tableMap[r.table_id] : undefined }))
}

export async function createReservation(
  res: Omit<Reservation, 'id' | 'created_at' | 'status'>
): Promise<Reservation> {
  if (USE_MOCK) {
    const mock: Reservation = { ...res, id: Date.now().toString(), status: 'pending', created_at: new Date().toISOString() }
    mockReservations.push(mock)
    return mock
  }
  const payload = { ...res, status: 'pending' as const, created_at: new Date().toISOString() }
  const ref = await addDoc(collection(db, 'reservations'), payload)
  return { ...payload, id: ref.id }
}

export async function updateReservationStatus(id: string, status: Reservation['status']): Promise<void> {
  if (USE_MOCK) {
    const r = mockReservations.find(r => r.id === id)
    if (r) r.status = status
    return
  }
  await updateDoc(doc(db, 'reservations', id), { status })
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventory(): Promise<InventoryItem[]> {
  if (USE_MOCK) {
    return mockInventory.map(inv => ({
      ...inv,
      menu_item: inv.menu_item_id ? mockMenuItems.find(m => m.id === inv.menu_item_id) : undefined,
    }))
  }
  const [inv, items] = await Promise.all([
    colDocs<InventoryItem>('inventory'),
    colDocs<MenuItem>('menu_items'),
  ])
  const itemMap = Object.fromEntries(items.map(i => [i.id, i]))
  return inv
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(i => ({ ...i, menu_item: i.menu_item_id ? itemMap[i.menu_item_id] : undefined }))
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
  const snap = await getDocs(query(collection(db, 'inventory'), where('barcode', '==', barcode)))
  if (snap.empty) return null
  const inv = fromDoc<InventoryItem>(snap.docs[0])
  if (!inv.menu_item_id) return inv
  const itemSnap = await getDoc(doc(db, 'menu_items', inv.menu_item_id))
  return { ...inv, menu_item: itemSnap.exists() ? fromDoc<MenuItem>(itemSnap) : undefined }
}

export async function upsertInventoryItem(
  item: Partial<InventoryItem> & { stock_quantity: number }
): Promise<InventoryItem> {
  if (USE_MOCK) {
    const existing = item.id
      ? mockInventory.find(i => i.id === item.id)
      : item.menu_item_id
        ? mockInventory.find(i => i.menu_item_id === item.menu_item_id)
        : null
    if (existing) {
      Object.assign(existing, item, { updated_at: new Date().toISOString() })
      return { ...existing, menu_item: existing.menu_item_id ? mockMenuItems.find(m => m.id === existing.menu_item_id) : undefined }
    }
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`, menu_item_id: null, product_name: null, barcode: null,
      unit: 'unidades', min_stock: 5, cost_price: 0, updated_at: new Date().toISOString(),
      ...item,
    }
    mockInventory.push(newItem)
    return { ...newItem, menu_item: newItem.menu_item_id ? mockMenuItems.find(m => m.id === newItem.menu_item_id) : undefined }
  }
  const payload = { ...item, updated_at: new Date().toISOString() }
  const id = await upsert('inventory', payload)
  return { ...payload, id } as InventoryItem
}

// ── Orders ────────────────────────────────────────────────────────────────────

function hydrateOrdersMock(orders: Order[]): Order[] {
  const catMap = Object.fromEntries(mockCategories.map(c => [c.id, c]))
  return orders.map(ord => ({
    ...ord,
    table: mockTables.find(t => t.id === ord.table_id),
    items: mockOrderItems
      .filter(i => i.order_id === ord.id)
      .map(i => {
        const menuItem = mockMenuItems.find(m => m.id === i.menu_item_id)
        return {
          ...i,
          menu_item: menuItem
            ? { ...menuItem, category: catMap[menuItem.category_id] }
            : undefined,
        }
      }),
  }))
}

async function hydrateOrders(orders: Order[]): Promise<Order[]> {
  const [tables, items, menuItems, categories] = await Promise.all([
    colDocs<Table>('tables'),
    colDocs<OrderItem>('order_items'),
    colDocs<MenuItem>('menu_items'),
    colDocs<Category>('categories'),
  ])
  const tableMap = Object.fromEntries(tables.map(t => [t.id, t]))
  const catMap   = Object.fromEntries(categories.map(c => [c.id, c]))
  const itemMap  = Object.fromEntries(
    menuItems.map(m => [m.id, { ...m, category: catMap[m.category_id] }])
  )
  return orders.map(ord => ({
    ...ord,
    table: ord.table_id ? tableMap[ord.table_id] : undefined,
    items: items
      .filter(i => i.order_id === ord.id)
      .map(i => ({ ...i, menu_item: itemMap[i.menu_item_id] })),
  }))
}

export async function getActiveOrders(): Promise<Order[]> {
  if (USE_MOCK) {
    return hydrateOrdersMock(mockOrders.filter(o => o.status !== 'paid' && o.status !== 'cancelled'))
  }
  // Evita not-in + orderBy (requiere índice compuesto) — filtramos en JS
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('created_at')))
  const orders = snap.docs.map(d => fromDoc<Order>(d))
    .filter(o => o.status !== 'paid' && o.status !== 'cancelled')
  return hydrateOrders(orders)
}

export async function getAllOrders(): Promise<Order[]> {
  if (USE_MOCK) return [...hydrateOrdersMock(mockOrders), ...mockHistoricalOrders]
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc')))
  const orders = snap.docs.map(d => fromDoc<Order>(d))
  return hydrateOrders(orders)
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
  const payload = {
    table_id: tableId, status: 'open' as const, notes: notes ?? null,
    waiter_name: waiterName ?? null, total: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }
  const ref = await addDoc(collection(db, 'orders'), payload)
  return { ...payload, id: ref.id }
}

export async function addOrderItem(
  orderId: string, menuItemId: string, quantity: number, notes?: string
): Promise<OrderItem> {
  const menuItem = mockMenuItems.find(m => m.id === menuItemId)
  const unitPrice = menuItem?.price ?? 0

  if (USE_MOCK) {
    const existIdx = mockOrderItems.findIndex(
      i => i.order_id === orderId && i.menu_item_id === menuItemId && i.status === 'pending'
    )
    if (existIdx >= 0) {
      mockOrderItems[existIdx].quantity += quantity
      const item = mockOrderItems[existIdx]
      _updateOrderTotalMock(orderId)
      return { ...item, menu_item: menuItem }
    }
    const item: OrderItem = {
      id: `oi-${Date.now()}`, order_id: orderId, menu_item_id: menuItemId,
      quantity, unit_price: unitPrice, notes: notes ?? null,
      status: 'pending', created_at: new Date().toISOString(),
    }
    mockOrderItems.push(item)
    _updateOrderTotalMock(orderId)
    return { ...item, menu_item: menuItem }
  }

  // Query solo por order_id; filtrado adicional en JS para evitar índice compuesto
  const existing = await getDocs(
    query(collection(db, 'order_items'), where('order_id', '==', orderId))
  )
  const existDoc = existing.docs.find(d => {
    const i = d.data() as OrderItem
    return i.menu_item_id === menuItemId && i.status === 'pending'
  })
  if (existDoc) {
    const existItem = fromDoc<OrderItem>(existDoc)
    const newQty = existItem.quantity + quantity
    await updateDoc(doc(db, 'order_items', existItem.id), { quantity: newQty })
    await _updateOrderTotalFirebase(orderId)
    return { ...existItem, quantity: newQty }
  }

  const payload = {
    order_id: orderId, menu_item_id: menuItemId, quantity,
    unit_price: unitPrice, notes: notes ?? null,
    status: 'pending' as const, created_at: new Date().toISOString(),
  }
  const ref = await addDoc(collection(db, 'order_items'), payload)
  await _updateOrderTotalFirebase(orderId)
  return { ...payload, id: ref.id }
}

function _updateOrderTotalMock(orderId: string) {
  const order = mockOrders.find(o => o.id === orderId)
  if (!order) return
  const items = mockOrderItems.filter(i => i.order_id === orderId)
  order.total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  order.updated_at = new Date().toISOString()
}

async function _updateOrderTotalFirebase(orderId: string) {
  const snap = await getDocs(query(collection(db, 'order_items'), where('order_id', '==', orderId)))
  const total = snap.docs.reduce((s, d) => {
    const i = d.data() as OrderItem
    return s + i.unit_price * i.quantity
  }, 0)
  await updateDoc(doc(db, 'orders', orderId), { total, updated_at: new Date().toISOString() })
}

export async function removeOrderItem(itemId: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockOrderItems.findIndex(i => i.id === itemId)
    if (idx >= 0) {
      const orderId = mockOrderItems[idx].order_id
      mockOrderItems.splice(idx, 1)
      _updateOrderTotalMock(orderId)
    }
    return
  }
  const snap = await getDoc(doc(db, 'order_items', itemId))
  if (!snap.exists()) return
  const orderId = (snap.data() as OrderItem).order_id
  await deleteDoc(doc(db, 'order_items', itemId))
  await _updateOrderTotalFirebase(orderId)
}

export async function updateOrderItemStatus(itemId: string, status: OrderItem['status']): Promise<void> {
  if (USE_MOCK) {
    const item = mockOrderItems.find(i => i.id === itemId)
    if (item) item.status = status
    return
  }
  await updateDoc(doc(db, 'order_items', itemId), { status })
}

export async function updateOrderItemQty(itemId: string, quantity: number): Promise<void> {
  if (USE_MOCK) {
    const item = mockOrderItems.find(i => i.id === itemId)
    if (item) { item.quantity = quantity; _updateOrderTotalMock(item.order_id) }
    return
  }
  const snap = await getDoc(doc(db, 'order_items', itemId))
  if (!snap.exists()) return
  const orderId = (snap.data() as OrderItem).order_id
  await updateDoc(doc(db, 'order_items', itemId), { quantity })
  await _updateOrderTotalFirebase(orderId)
}

export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
  if (USE_MOCK) {
    const order = mockOrders.find(o => o.id === orderId)
    if (order) { order.notes = notes; order.updated_at = new Date().toISOString() }
    return
  }
  await updateDoc(doc(db, 'orders', orderId), { notes, updated_at: new Date().toISOString() })
}

export async function sendOrderToKitchen(orderId: string): Promise<void> {
  if (USE_MOCK) {
    mockOrderItems.filter(i => i.order_id === orderId && i.status === 'pending').forEach(i => { i.status = 'in_kitchen' })
    const order = mockOrders.find(o => o.id === orderId)
    if (order) { order.status = 'in_kitchen'; order.updated_at = new Date().toISOString() }
    return
  }
  // Query simple por order_id; filtramos pending en JS
  const snap = await getDocs(
    query(collection(db, 'order_items'), where('order_id', '==', orderId))
  )
  const pendingDocs = snap.docs.filter(d => (d.data() as OrderItem).status === 'pending')
  await Promise.all(pendingDocs.map(d => updateDoc(d.ref, { status: 'in_kitchen' })))
  await updateDoc(doc(db, 'orders', orderId), { status: 'in_kitchen', updated_at: new Date().toISOString() })
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  if (USE_MOCK) {
    const order = mockOrders.find(o => o.id === orderId)
    if (order) { order.status = status; order.updated_at = new Date().toISOString() }
    return
  }
  await updateDoc(doc(db, 'orders', orderId), { status, updated_at: new Date().toISOString() })
}

export async function closeOrder(orderId: string): Promise<void> {
  if (USE_MOCK) {
    const order = mockOrders.find(o => o.id === orderId)
    if (order) {
      order.status = 'paid'; order.updated_at = new Date().toISOString()
      mockHistoricalOrders.push({ ...order })
      mockOrders.splice(mockOrders.indexOf(order), 1)
    }
    return
  }
  await updateDoc(doc(db, 'orders', orderId), { status: 'paid', updated_at: new Date().toISOString() })
}

// ── Notifications (computed from data) ────────────────────────────────────────

export function computeNotifications(
  reservations: Reservation[], inventory: InventoryItem[]
): AppNotification[] {
  const now = Date.now()
  const notes: AppNotification[] = []

  reservations
    .filter(r => r.status === 'pending' && now - new Date(r.created_at).getTime() < 86400000)
    .forEach(r => {
      notes.push({
        id: `res-new-${r.id}`, type: 'reservation_new', read: false,
        title: 'Nueva reserva recibida',
        body: `${r.guest_name} · ${r.party_size} pers. · ${r.date} ${r.time}`,
        link: '/admin/reservas', created_at: r.created_at,
      })
    })

  reservations
    .filter(r => r.status === 'pending' && now - new Date(r.created_at).getTime() > 43200000)
    .forEach(r => {
      notes.push({
        id: `res-pending-${r.id}`, type: 'reservation_pending', read: false,
        title: 'Reserva sin confirmar',
        body: `${r.guest_name} lleva más de 12 h esperando confirmación`,
        link: '/admin/reservas', created_at: r.created_at,
      })
    })

  const invName = (i: InventoryItem) =>
    i.menu_item?.name ?? i.product_name ?? (i.barcode ? `Cód. ${i.barcode}` : i.id)

  inventory.filter(i => i.stock_quantity === 0).forEach(i => {
    notes.push({
      id: `stock-out-${i.id}`, type: 'stock_out', read: false,
      title: 'Sin stock', body: `${invName(i)} — agotado`,
      link: '/admin/inventario', created_at: i.updated_at,
    })
  })

  inventory.filter(i => i.stock_quantity > 0 && i.stock_quantity < i.min_stock).forEach(i => {
    notes.push({
      id: `stock-low-${i.id}`, type: 'stock_low', read: false,
      title: 'Stock bajo', body: `${invName(i)} — ${i.stock_quantity} ${i.unit} (mín. ${i.min_stock})`,
      link: '/admin/inventario', created_at: i.updated_at,
    })
  })

  return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ── Waiters / Garzones ────────────────────────────────────────────────────────

export async function getWaiters(): Promise<Waiter[]> {
  if (USE_MOCK) return mockWaiters.filter(w => w.is_active)
  const all = await colDocs<Waiter>('waiters')
  return all.filter(w => w.is_active).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAllWaiters(): Promise<Waiter[]> {
  if (USE_MOCK) return [...mockWaiters]
  const all = await colDocs<Waiter>('waiters')
  return all.sort((a, b) => a.name.localeCompare(b.name))
}

export async function upsertWaiter(waiter: Partial<Waiter> & { name: string }): Promise<Waiter> {
  if (USE_MOCK) {
    const existing = mockWaiters.find(w => w.id === waiter.id)
    if (existing) { Object.assign(existing, waiter); return existing }
    const nw: Waiter = { id: `w-${Date.now()}`, name: waiter.name, is_active: waiter.is_active ?? true, created_at: new Date().toISOString() }
    mockWaiters.push(nw)
    return nw
  }
  const id = await upsert('waiters', waiter)
  return { ...waiter, id } as Waiter
}

export async function deleteWaiter(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockWaiters.findIndex(w => w.id === id)
    if (idx >= 0) mockWaiters.splice(idx, 1)
    return
  }
  await deleteDoc(doc(db, 'waiters', id))
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function getChatSessions(): Promise<ChatSession[]> {
  if (USE_MOCK) {
    return [...mockChatSessions].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }
  const snap = await getDocs(query(collection(db, 'chat_sessions'), orderBy('updated_at', 'desc')))
  return snap.docs.map(d => fromDoc<ChatSession>(d))
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
  const [sessionSnap, msgsSnap] = await Promise.all([
    getDoc(doc(db, 'chat_sessions', id)),
    getDocs(query(collection(db, 'chat_messages'), where('session_id', '==', id))),
  ])
  if (!sessionSnap.exists()) return null
  return {
    ...fromDoc<ChatSession>(sessionSnap),
    messages: msgsSnap.docs
      .map(d => fromDoc<ChatMessage>(d))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }
}

export async function createChatSession(
  guestName: string, guestPhone: string, guestEmail?: string
): Promise<ChatSession> {
  if (USE_MOCK) {
    const session: ChatSession = {
      id: `cs-${Date.now()}`, guest_name: guestName, guest_phone: guestPhone,
      guest_email: guestEmail ?? null, status: 'open', unread_admin: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    mockChatSessions.push(session)
    return session
  }
  const payload = {
    guest_name: guestName, guest_phone: guestPhone, guest_email: guestEmail ?? null,
    status: 'open' as const, unread_admin: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }
  const ref = await addDoc(collection(db, 'chat_sessions'), payload)
  return { ...payload, id: ref.id }
}

export async function sendChatMessage(
  sessionId: string, text: string, sender: ChatMessage['sender']
): Promise<ChatMessage> {
  if (USE_MOCK) {
    const msg: ChatMessage = { id: `cm-${Date.now()}`, session_id: sessionId, sender, text, created_at: new Date().toISOString() }
    mockChatMessages.push(msg)
    const session = mockChatSessions.find(s => s.id === sessionId)
    if (session) {
      session.updated_at = new Date().toISOString()
      if (sender === 'guest') session.unread_admin += 1
    }
    return msg
  }
  const payload = { session_id: sessionId, text, sender, created_at: new Date().toISOString() }
  const ref = await addDoc(collection(db, 'chat_messages'), payload)
  await updateDoc(doc(db, 'chat_sessions', sessionId), {
    updated_at: new Date().toISOString(),
    ...(sender === 'guest' ? { unread_admin: serverTimestamp() } : {}),
  })
  // Increment unread for guest messages via a dedicated update
  if (sender === 'guest') {
    const sessionSnap = await getDoc(doc(db, 'chat_sessions', sessionId))
    if (sessionSnap.exists()) {
      const current = (sessionSnap.data() as ChatSession).unread_admin ?? 0
      await updateDoc(doc(db, 'chat_sessions', sessionId), { unread_admin: current + 1 })
    }
  }
  return { ...payload, id: ref.id }
}

export async function markChatSessionRead(sessionId: string): Promise<void> {
  if (USE_MOCK) {
    const session = mockChatSessions.find(s => s.id === sessionId)
    if (session) session.unread_admin = 0
    return
  }
  await updateDoc(doc(db, 'chat_sessions', sessionId), { unread_admin: 0 })
}

export async function resolveChatSession(sessionId: string): Promise<void> {
  if (USE_MOCK) {
    const session = mockChatSessions.find(s => s.id === sessionId)
    if (session) { session.status = 'resolved'; session.unread_admin = 0 }
    return
  }
  await updateDoc(doc(db, 'chat_sessions', sessionId), { status: 'resolved', unread_admin: 0 })
}

export async function getTotalUnreadChat(): Promise<number> {
  if (USE_MOCK) return mockChatSessions.reduce((s, c) => s + c.unread_admin, 0)
  const snap = await getDocs(query(collection(db, 'chat_sessions'), where('status', '==', 'open')))
  return snap.docs.reduce((s, d) => s + ((d.data() as ChatSession).unread_admin ?? 0), 0)
}

// ── Customers ─────────────────────────────────────────────────────────────────

function hydrateCustomer(c: Customer): Customer {
  return {
    ...c,
    favorite_dish: c.favorite_dish_id ? mockMenuItems.find(m => m.id === c.favorite_dish_id) : undefined,
  }
}

export async function getCustomers(): Promise<Customer[]> {
  if (USE_MOCK) {
    return mockCustomers.map(hydrateCustomer).sort((a, b) => b.total_visits - a.total_visits)
  }
  const [customers, menuItems] = await Promise.all([
    colDocs<Customer>('customers'),
    colDocs<MenuItem>('menu_items'),
  ])
  const itemMap = Object.fromEntries(menuItems.map(m => [m.id, m]))
  return customers
    .sort((a, b) => b.total_visits - a.total_visits)
    .map(c => ({ ...c, favorite_dish: c.favorite_dish_id ? itemMap[c.favorite_dish_id] : undefined }))
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (USE_MOCK) {
    const c = mockCustomers.find(c => c.id === id)
    return c ? hydrateCustomer(c) : null
  }
  const snap = await getDoc(doc(db, 'customers', id))
  if (!snap.exists()) return null
  const c = fromDoc<Customer>(snap)
  if (!c.favorite_dish_id) return c
  const dishSnap = await getDoc(doc(db, 'menu_items', c.favorite_dish_id))
  return { ...c, favorite_dish: dishSnap.exists() ? fromDoc<MenuItem>(dishSnap) : undefined }
}

export async function getCustomerVisits(customerId: string): Promise<CustomerVisit[]> {
  if (USE_MOCK) {
    return mockCustomerVisits
      .filter(v => v.customer_id === customerId)
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
  }
  const snap = await getDocs(
    query(collection(db, 'customer_visits'), where('customer_id', '==', customerId))
  )
  return snap.docs
    .map(d => fromDoc<CustomerVisit>(d))
    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
}

export async function upsertCustomer(
  customer: Partial<Customer> & { name: string }
): Promise<Customer> {
  if (USE_MOCK) {
    const existing = mockCustomers.find(c => c.id === customer.id)
    if (existing) {
      Object.assign(existing, customer, { updated_at: new Date().toISOString() })
      return hydrateCustomer(existing)
    }
    const nc: Customer = {
      id: `cu-${Date.now()}`,
      email: null, phone: null, birthday: null, notes: null,
      tags: [], favorite_dish_id: null, total_visits: 0, total_spent: 0, last_visit: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      ...customer,
    }
    mockCustomers.push(nc)
    return hydrateCustomer(nc)
  }
  const payload = { ...customer, updated_at: new Date().toISOString() }
  const id = await upsert('customers', payload)
  return { ...payload, id } as Customer
}

export async function deleteCustomer(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockCustomers.findIndex(c => c.id === id)
    if (idx >= 0) mockCustomers.splice(idx, 1)
    return
  }
  await deleteDoc(doc(db, 'customers', id))
}

export async function addCustomerVisit(
  visit: Omit<CustomerVisit, 'id' | 'created_at'>
): Promise<CustomerVisit> {
  if (USE_MOCK) {
    const cv: CustomerVisit = { id: `cv-${Date.now()}`, ...visit, created_at: new Date().toISOString() }
    mockCustomerVisits.push(cv)
    const customer = mockCustomers.find(c => c.id === visit.customer_id)
    if (customer) {
      customer.total_visits += 1
      customer.total_spent  += visit.amount_spent
      customer.last_visit    = visit.visit_date
      customer.updated_at    = new Date().toISOString()
    }
    return cv
  }
  const payload = { ...visit, created_at: new Date().toISOString() }
  const ref = await addDoc(collection(db, 'customer_visits'), payload)
  // Update denormalized stats on customer document
  const custSnap = await getDoc(doc(db, 'customers', visit.customer_id))
  if (custSnap.exists()) {
    const c = custSnap.data() as Customer
    await updateDoc(doc(db, 'customers', visit.customer_id), {
      total_visits: (c.total_visits ?? 0) + 1,
      total_spent:  (c.total_spent  ?? 0) + visit.amount_spent,
      last_visit:   visit.visit_date,
      updated_at:   new Date().toISOString(),
    })
  }
  return { ...payload, id: ref.id }
}
