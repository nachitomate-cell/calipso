export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      menu_items: {
        Row: {
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
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }
      tables: {
        Row: {
          id: string
          number: number
          capacity: number
          location: 'interior' | 'terraza' | 'barra'
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['tables']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['tables']['Insert']>
      }
      reservations: {
        Row: {
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
        }
        Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>
      }
    }
  }
}
