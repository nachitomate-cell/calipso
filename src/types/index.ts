export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  allergens: string[]
  sort_order: number
  created_at: string
  updated_at: string
  category?: Category
}

export interface Table {
  id: string
  number: number
  capacity: number
  location: 'comedor' | 'terraza' | 'comedor2'
  is_active: boolean
}

export interface Reservation {
  id: string
  table_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string
  party_size: number
  date: string
  time: string
  notes: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  table?: Table
}

export type ReservationStatus = Reservation['status']
export type TableLocation = Table['location']

export interface InventoryItem {
  id: string
  menu_item_id: string | null      // null for standalone barcode items
  product_name: string | null      // name for items not linked to menu
  barcode: string | null           // EAN-13 / Code-128 / QR
  stock_quantity: number
  unit: 'kg' | 'unidades' | 'litros' | 'porciones' | 'botellas' | 'docenas'
  min_stock: number
  cost_price: number
  updated_at: string
  menu_item?: MenuItem
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  notes: string | null
  status: 'pending' | 'in_kitchen' | 'ready' | 'delivered'
  created_at: string
  menu_item?: MenuItem
}

export interface Order {
  id: string
  table_id: string
  status: 'open' | 'in_kitchen' | 'ready' | 'paid' | 'cancelled'
  notes: string | null
  total: number
  waiter_name: string | null
  created_at: string
  updated_at: string
  table?: Table
  items?: OrderItem[]
}

export interface ChatMessage {
  id: string
  session_id: string
  sender: 'guest' | 'admin' | 'bot'
  text: string
  created_at: string
}

export interface ChatSession {
  id: string
  guest_name: string | null
  guest_phone: string | null
  guest_email: string | null
  status: 'open' | 'resolved'
  unread_admin: number   // messages not yet read by admin
  created_at: string
  updated_at: string
  messages?: ChatMessage[]
}

export interface Waiter {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface AppNotification {
  id: string
  type: 'reservation_new' | 'reservation_pending' | 'stock_low' | 'stock_out' | 'order_ready'
  title: string
  body: string
  read: boolean
  link?: string
  created_at: string
}

export type CustomerTag = 'vip' | 'frecuente' | 'corporativo' | 'nuevo' | 'alergia' | 'cumpleanos'

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthday: string | null
  notes: string | null
  tags: CustomerTag[]
  favorite_dish_id: string | null
  total_visits: number
  total_spent: number
  last_visit: string | null
  created_at: string
  updated_at: string
  favorite_dish?: MenuItem
}

export interface CustomerVisit {
  id: string
  customer_id: string
  visit_date: string
  party_size: number
  amount_spent: number
  dishes: string[]
  notes: string | null
  created_at: string
}
