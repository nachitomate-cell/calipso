import { supabase } from './supabase'
import { mockCategories, mockMenuItems, mockTables, mockReservations } from './mock-data'
import type { Category, MenuItem, Table, Reservation } from '../types'

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
