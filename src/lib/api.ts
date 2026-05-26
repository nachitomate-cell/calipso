import { supabase } from './supabase'
import { mockCategories, mockMenuItems, mockTables, mockReservations, mockInventory } from './mock-data'
import type { Category, MenuItem, Table, Reservation, InventoryItem } from '../types'

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
      menu_item: mockMenuItems.find(m => m.id === inv.menu_item_id),
    }))
  }
  const { data, error } = await supabase
    .from('inventory')
    .select('*, menu_item:menu_items(*)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as unknown as InventoryItem[]
}

export async function upsertInventoryItem(
  item: Partial<InventoryItem> & { menu_item_id: string; stock_quantity: number }
): Promise<InventoryItem> {
  if (USE_MOCK) {
    const existing = mockInventory.find(i => i.menu_item_id === item.menu_item_id)
    if (existing) {
      existing.stock_quantity = item.stock_quantity
      existing.updated_at = new Date().toISOString()
      return { ...existing, menu_item: mockMenuItems.find(m => m.id === existing.menu_item_id) }
    }
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      unit: 'unidades',
      min_stock: 5,
      cost_price: 0,
      updated_at: new Date().toISOString(),
      ...item,
    }
    mockInventory.push(newItem)
    return newItem
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('inventory') as any)
    .upsert({ ...item, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as InventoryItem
}
