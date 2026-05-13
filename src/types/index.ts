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
  location: 'interior' | 'terraza' | 'barra'
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
