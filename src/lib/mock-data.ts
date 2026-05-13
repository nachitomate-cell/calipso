import type { Category, MenuItem, Table, Reservation } from '../types'

export const mockCategories: Category[] = [
  { id: '1', name: 'Entradas', slug: 'entradas', description: 'Para comenzar el viaje', icon: '🦪', sort_order: 1, is_active: true, created_at: '' },
  { id: '2', name: 'Ceviches & Tiraditos', slug: 'ceviches', description: 'Frescura del mar en su estado puro', icon: '🐟', sort_order: 2, is_active: true, created_at: '' },
  { id: '3', name: 'Fondos de Mar', slug: 'fondos', description: 'Platos principales del océano', icon: '🦞', sort_order: 3, is_active: true, created_at: '' },
  { id: '4', name: 'Arroces & Pastas', slug: 'arroces', description: 'El mar en formato reconfortante', icon: '🍚', sort_order: 4, is_active: true, created_at: '' },
  { id: '5', name: 'Postres', slug: 'postres', description: 'El dulce final', icon: '🍮', sort_order: 5, is_active: true, created_at: '' },
  { id: '6', name: 'Vinos & Bebidas', slug: 'bebidas', description: 'Para acompañar', icon: '🍷', sort_order: 6, is_active: true, created_at: '' },
]

export const mockMenuItems: MenuItem[] = [
  // Entradas
  {
    id: '1', category_id: '1', name: 'Ostras Finas al Natural',
    description: 'Media docena de ostras del sur de Chile servidas sobre hielo con limón de Pica y mignonette de chalota.',
    price: 14900, image_url: null, is_available: true, is_featured: true,
    allergens: ['moluscos'], sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: '2', category_id: '1', name: 'Pulpo a la Brasa',
    description: 'Pulpo braseado sobre hummus de garbanzos, aceite de pimentón ahumado y chips de ajo.',
    price: 12900, image_url: null, is_available: true, is_featured: true,
    allergens: ['moluscos'], sort_order: 2, created_at: '', updated_at: '',
  },
  {
    id: '3', category_id: '1', name: 'Choros al Vapor',
    description: 'Mejillones de Chiloé al vapor con bisque de azafrán, pan artesanal tostado.',
    price: 9900, image_url: null, is_available: true, is_featured: false,
    allergens: ['moluscos', 'gluten'], sort_order: 3, created_at: '', updated_at: '',
  },
  {
    id: '4', category_id: '1', name: 'Empanada de Marisco',
    description: 'Empanada al horno rellena con camarones, machas y queso de campo. Masa hojaldrada.',
    price: 6900, image_url: null, is_available: true, is_featured: false,
    allergens: ['gluten', 'lacteos'], sort_order: 4, created_at: '', updated_at: '',
  },
  // Ceviches
  {
    id: '5', category_id: '2', name: 'Ceviche Clásico',
    description: 'Corvina del día marinada en limón de Pica, cebolla morada, cilantro y ají limo. Con choclo y camote.',
    price: 11900, image_url: null, is_available: true, is_featured: true,
    allergens: ['pescado'], sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: '6', category_id: '2', name: 'Tiradito Nikkei',
    description: 'Láminas finas de atún rojo, leche de tigre de maracuyá, aceite de sésamo y crispy de quinoa.',
    price: 13900, image_url: null, is_available: true, is_featured: true,
    allergens: ['pescado', 'soja'], sort_order: 2, created_at: '', updated_at: '',
  },
  {
    id: '7', category_id: '2', name: 'Ceviche Mixto',
    description: 'Camarones, calamares y pulpo en leche de tigre verde con rocoto, palta y maíz crocante.',
    price: 14900, image_url: null, is_available: true, is_featured: false,
    allergens: ['pescado', 'moluscos', 'crustaceos'], sort_order: 3, created_at: '', updated_at: '',
  },
  // Fondos
  {
    id: '8', category_id: '3', name: 'Congrio Dorado al Horno',
    description: 'Filete de congrio dorado horneado con costra de almendras, puré de coliflor ahumado y mantequilla de hierbas.',
    price: 18900, image_url: null, is_available: true, is_featured: true,
    allergens: ['pescado', 'nueces'], sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: '9', category_id: '3', name: 'Langosta Entera a la Plancha',
    description: 'Langosta entera a la plancha con mantequilla de ajo y limón, papas doradas y ensalada de rúcula.',
    price: 42900, image_url: null, is_available: true, is_featured: true,
    allergens: ['crustaceos', 'lacteos'], sort_order: 2, created_at: '', updated_at: '',
  },
  {
    id: '10', category_id: '3', name: 'Plateada de Mar',
    description: 'Reineta a la mantequilla negra, alcaparras, perejil, limón Meyer y papas salteadas.',
    price: 16900, image_url: null, is_available: true, is_featured: false,
    allergens: ['pescado', 'lacteos'], sort_order: 3, created_at: '', updated_at: '',
  },
  {
    id: '11', category_id: '3', name: 'Parrillada de Mariscos',
    description: 'Langostinos, calamares, ostiones y pulpo a la parrilla con chimichurri marino y pan artesanal.',
    price: 28900, image_url: null, is_available: false, is_featured: false,
    allergens: ['moluscos', 'crustaceos', 'gluten'], sort_order: 4, created_at: '', updated_at: '',
  },
  // Arroces
  {
    id: '12', category_id: '4', name: 'Arroz Meloso de Mariscos',
    description: 'Arroz al dente con caldo de bisque, langostinos, almejas, azafrán y alioli de ajo negro.',
    price: 19900, image_url: null, is_available: true, is_featured: true,
    allergens: ['moluscos', 'crustaceos', 'lacteos'], sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: '13', category_id: '4', name: 'Risotto de Tinta de Calamar',
    description: 'Risotto negro con calamar salteado, queso parmesano y espuma de alioli.',
    price: 17900, image_url: null, is_available: true, is_featured: false,
    allergens: ['moluscos', 'lacteos'], sort_order: 2, created_at: '', updated_at: '',
  },
  {
    id: '14', category_id: '4', name: 'Pasta con Machas',
    description: 'Tagliolini con machas de Pichilemu, ajo, vino blanco, mantequilla y ralladura de limón.',
    price: 15900, image_url: null, is_available: true, is_featured: false,
    allergens: ['moluscos', 'gluten', 'lacteos'], sort_order: 3, created_at: '', updated_at: '',
  },
  // Postres
  {
    id: '15', category_id: '5', name: 'Crème Brûlée de Algarrobo',
    description: 'Clásica crème brûlée con infusión de algarrobo patagónico y frutos del bosque.',
    price: 6900, image_url: null, is_available: true, is_featured: false,
    allergens: ['lacteos', 'huevos'], sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: '16', category_id: '5', name: 'Cheesecake de Lúcuma',
    description: 'Base de galleta, cremoso de lúcuma, mermelada de maracuyá y crocante de nueces.',
    price: 7900, image_url: null, is_available: true, is_featured: true,
    allergens: ['lacteos', 'gluten', 'nueces'], sort_order: 2, created_at: '', updated_at: '',
  },
  // Bebidas
  {
    id: '17', category_id: '6', name: 'Pisco Sour Clásico',
    description: 'Pisco 35°, limón de Pica, jarabe, clara de huevo y amargo de angostura.',
    price: 6900, image_url: null, is_available: true, is_featured: false,
    allergens: ['huevos'], sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: '18', category_id: '6', name: 'Vino Blanco Sauvignon Blanc',
    description: 'Casa Marin, Lo Abarca. Aromas cítricos, mineralidad costera perfecta para mariscos.',
    price: 8900, image_url: null, is_available: true, is_featured: false,
    allergens: [], sort_order: 2, created_at: '', updated_at: '',
  },
]

export const mockTables: Table[] = [
  { id: '1', number: 1, capacity: 2, location: 'terraza', is_active: true },
  { id: '2', number: 2, capacity: 2, location: 'terraza', is_active: true },
  { id: '3', number: 3, capacity: 4, location: 'terraza', is_active: true },
  { id: '4', number: 4, capacity: 4, location: 'terraza', is_active: true },
  { id: '5', number: 5, capacity: 6, location: 'terraza', is_active: true },
  { id: '6', number: 6, capacity: 2, location: 'interior', is_active: true },
  { id: '7', number: 7, capacity: 4, location: 'interior', is_active: true },
  { id: '8', number: 8, capacity: 4, location: 'interior', is_active: true },
  { id: '9', number: 9, capacity: 8, location: 'interior', is_active: true },
  { id: '10', number: 10, capacity: 2, location: 'barra', is_active: true },
  { id: '11', number: 11, capacity: 2, location: 'barra', is_active: true },
  { id: '12', number: 12, capacity: 2, location: 'barra', is_active: false },
]

export const mockReservations: Reservation[] = [
  {
    id: '1', table_id: '3', guest_name: 'Carlos Muñoz', guest_email: 'carlos@example.com',
    guest_phone: '+56912345678', party_size: 4, date: '2025-05-15', time: '20:00',
    notes: 'Aniversario de bodas, por favor decorar la mesa', status: 'confirmed',
    created_at: '2025-05-10T14:00:00Z',
  },
  {
    id: '2', table_id: '1', guest_name: 'Ana Fernández', guest_email: 'ana@example.com',
    guest_phone: '+56987654321', party_size: 2, date: '2025-05-15', time: '13:30',
    notes: null, status: 'pending',
    created_at: '2025-05-11T09:00:00Z',
  },
  {
    id: '3', table_id: '9', guest_name: 'Familia González', guest_email: 'gonzalez@example.com',
    guest_phone: '+56911223344', party_size: 7, date: '2025-05-16', time: '14:00',
    notes: 'Un niño alérgico al gluten', status: 'confirmed',
    created_at: '2025-05-09T18:00:00Z',
  },
]
