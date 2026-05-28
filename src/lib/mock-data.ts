import type { Category, MenuItem, Table, Reservation, InventoryItem, Order, OrderItem, ChatSession, ChatMessage, Waiter, Customer, CustomerVisit } from '../types'

// Helper: date offset from today
function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

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
  { id: '6', number: 6, capacity: 2, location: 'comedor', is_active: true },
  { id: '7', number: 7, capacity: 4, location: 'comedor', is_active: true },
  { id: '8', number: 8, capacity: 4, location: 'comedor', is_active: true },
  { id: '9', number: 9, capacity: 8, location: 'comedor', is_active: true },
  { id: '10', number: 10, capacity: 2, location: 'comedor2', is_active: true },
  { id: '11', number: 11, capacity: 2, location: 'comedor2', is_active: true },
  { id: '12', number: 12, capacity: 2, location: 'comedor2', is_active: false },
]

export const mockReservations: Reservation[] = [
  // Past — completed
  {
    id: '1', table_id: '3', guest_name: 'Carlos Muñoz', guest_email: 'carlos@example.com',
    guest_phone: '+56912345678', party_size: 4, date: daysFromNow(-6), time: '20:00',
    notes: 'Aniversario de bodas', status: 'completed',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: '2', table_id: '1', guest_name: 'Ana Fernández', guest_email: 'ana@example.com',
    guest_phone: '+56987654321', party_size: 2, date: daysFromNow(-6), time: '13:30',
    notes: null, status: 'completed',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: '3', table_id: '9', guest_name: 'Familia González', guest_email: 'gonzalez@example.com',
    guest_phone: '+56911223344', party_size: 7, date: daysFromNow(-5), time: '14:00',
    notes: 'Un niño alérgico al gluten', status: 'completed',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: '4', table_id: '5', guest_name: 'Pedro Rojas', guest_email: 'pedro@example.com',
    guest_phone: '+56922334455', party_size: 6, date: daysFromNow(-5), time: '20:30',
    notes: null, status: 'completed',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: '5', table_id: '7', guest_name: 'Valentina Soto', guest_email: 'vale@example.com',
    guest_phone: '+56933445566', party_size: 3, date: daysFromNow(-4), time: '21:00',
    notes: 'Sin mariscos para uno de los comensales', status: 'completed',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '6', table_id: '2', guest_name: 'Ignacio Herrera', guest_email: 'iherrera@example.com',
    guest_phone: '+56944556677', party_size: 2, date: daysFromNow(-4), time: '13:00',
    notes: null, status: 'cancelled',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '7', table_id: '8', guest_name: 'Daniela Morales', guest_email: 'dani@example.com',
    guest_phone: '+56955667788', party_size: 4, date: daysFromNow(-3), time: '20:00',
    notes: null, status: 'completed',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: '8', table_id: '4', guest_name: 'Roberto Pizarro', guest_email: 'rpizarro@example.com',
    guest_phone: '+56966778899', party_size: 4, date: daysFromNow(-3), time: '14:30',
    notes: 'Mesa con vista al mar si es posible', status: 'completed',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: '9', table_id: '6', guest_name: 'Camila Vega', guest_email: 'cvega@example.com',
    guest_phone: '+56977889900', party_size: 2, date: daysFromNow(-2), time: '19:30',
    notes: null, status: 'confirmed',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: '10', table_id: '9', guest_name: 'Empresa TechCorp', guest_email: 'eventos@techcorp.cl',
    guest_phone: '+56988990011', party_size: 10, date: daysFromNow(-2), time: '13:30',
    notes: 'Almuerzo corporativo, necesita boleta', status: 'confirmed',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: '11', table_id: '3', guest_name: 'Felipe Torres', guest_email: 'ftorres@example.com',
    guest_phone: '+56911001122', party_size: 4, date: daysFromNow(-1), time: '20:30',
    notes: null, status: 'confirmed',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  // Today
  {
    id: '12', table_id: '1', guest_name: 'Sofía Bravo', guest_email: 'sofia@example.com',
    guest_phone: '+56922112233', party_size: 2, date: daysFromNow(0), time: '13:00',
    notes: null, status: 'confirmed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '13', table_id: '5', guest_name: 'Marcelo Núñez', guest_email: 'marcelo@example.com',
    guest_phone: '+56933223344', party_size: 5, date: daysFromNow(0), time: '20:00',
    notes: 'Cumpleaños, sorpresa', status: 'pending',
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  // Upcoming
  {
    id: '14', table_id: '7', guest_name: 'Antonia Leal', guest_email: 'antonia@example.com',
    guest_phone: '+56944334455', party_size: 3, date: daysFromNow(1), time: '21:00',
    notes: null, status: 'pending',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '15', table_id: '3', guest_name: 'Héctor Palma', guest_email: 'hpalma@example.com',
    guest_phone: '+56955445566', party_size: 4, date: daysFromNow(1), time: '13:30',
    notes: null, status: 'confirmed',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '16', table_id: '9', guest_name: 'Grupo Familia Espinoza', guest_email: 'espinoza@example.com',
    guest_phone: '+56966556677', party_size: 8, date: daysFromNow(2), time: '14:00',
    notes: 'Reunión familiar, niños presentes', status: 'pending',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '17', table_id: '2', guest_name: 'Valentín Robles', guest_email: 'vrobles@example.com',
    guest_phone: '+56977667788', party_size: 2, date: daysFromNow(3), time: '20:00',
    notes: null, status: 'pending',
    created_at: new Date().toISOString(),
  },
]

export const mockInventory: InventoryItem[] = [
  { id: 'inv-1',  menu_item_id: '1',  product_name: null, barcode: null,            stock_quantity: 3,  unit: 'docenas',   min_stock: 5,  cost_price: 8500,  updated_at: new Date().toISOString() },
  { id: 'inv-2',  menu_item_id: '2',  product_name: null, barcode: null,            stock_quantity: 8,  unit: 'kg',        min_stock: 4,  cost_price: 6200,  updated_at: new Date().toISOString() },
  { id: 'inv-3',  menu_item_id: '3',  product_name: null, barcode: '7800231003012', stock_quantity: 12, unit: 'kg',        min_stock: 5,  cost_price: 3100,  updated_at: new Date().toISOString() },
  { id: 'inv-4',  menu_item_id: '4',  product_name: null, barcode: null,            stock_quantity: 15, unit: 'unidades',  min_stock: 8,  cost_price: 2800,  updated_at: new Date().toISOString() },
  { id: 'inv-5',  menu_item_id: '5',  product_name: null, barcode: null,            stock_quantity: 6,  unit: 'kg',        min_stock: 4,  cost_price: 5500,  updated_at: new Date().toISOString() },
  { id: 'inv-6',  menu_item_id: '6',  product_name: null, barcode: null,            stock_quantity: 2,  unit: 'kg',        min_stock: 3,  cost_price: 9800,  updated_at: new Date().toISOString() },
  { id: 'inv-7',  menu_item_id: '7',  product_name: null, barcode: null,            stock_quantity: 7,  unit: 'kg',        min_stock: 4,  cost_price: 6000,  updated_at: new Date().toISOString() },
  { id: 'inv-8',  menu_item_id: '8',  product_name: null, barcode: null,            stock_quantity: 9,  unit: 'kg',        min_stock: 4,  cost_price: 8900,  updated_at: new Date().toISOString() },
  { id: 'inv-9',  menu_item_id: '9',  product_name: null, barcode: null,            stock_quantity: 3,  unit: 'unidades',  min_stock: 5,  cost_price: 22000, updated_at: new Date().toISOString() },
  { id: 'inv-10', menu_item_id: '10', product_name: null, barcode: null,            stock_quantity: 9,  unit: 'kg',        min_stock: 4,  cost_price: 7500,  updated_at: new Date().toISOString() },
  { id: 'inv-11', menu_item_id: '11', product_name: null, barcode: null,            stock_quantity: 0,  unit: 'porciones', min_stock: 4,  cost_price: 14000, updated_at: new Date().toISOString() },
  { id: 'inv-12', menu_item_id: '12', product_name: null, barcode: '7801234000012', stock_quantity: 24, unit: 'porciones', min_stock: 10, cost_price: 8500,  updated_at: new Date().toISOString() },
  { id: 'inv-13', menu_item_id: '13', product_name: null, barcode: null,            stock_quantity: 10, unit: 'porciones', min_stock: 6,  cost_price: 7200,  updated_at: new Date().toISOString() },
  { id: 'inv-14', menu_item_id: '14', product_name: null, barcode: null,            stock_quantity: 2,  unit: 'kg',        min_stock: 3,  cost_price: 4800,  updated_at: new Date().toISOString() },
  { id: 'inv-15', menu_item_id: '15', product_name: null, barcode: null,            stock_quantity: 8,  unit: 'porciones', min_stock: 5,  cost_price: 2100,  updated_at: new Date().toISOString() },
  { id: 'inv-16', menu_item_id: '16', product_name: null, barcode: null,            stock_quantity: 5,  unit: 'porciones', min_stock: 4,  cost_price: 2900,  updated_at: new Date().toISOString() },
  { id: 'inv-17', menu_item_id: '17', product_name: null, barcode: '7801234000017', stock_quantity: 30, unit: 'porciones', min_stock: 10, cost_price: 2400,  updated_at: new Date().toISOString() },
  { id: 'inv-18', menu_item_id: '18', product_name: null, barcode: '7801234000018', stock_quantity: 18, unit: 'botellas',  min_stock: 6,  cost_price: 4500,  updated_at: new Date().toISOString() },
]

// ── Waiters / Garzones ───────────────────────────────────────────────────────

export const mockWaiters: Waiter[] = [
  { id: 'w-1', name: 'Oscar Parra',       is_active: true,  created_at: '' },
  { id: 'w-2', name: 'Patricio Vicencio', is_active: true,  created_at: '' },
  { id: 'w-3', name: 'Juan Cárdenas',     is_active: true,  created_at: '' },
  { id: 'w-4', name: 'Jazmín Parra',      is_active: true,  created_at: '' },
  { id: 'w-5', name: 'Michael Morales',   is_active: true,  created_at: '' },
]

// ── Active Orders (current service) ──────────────────────────────────────────

export const mockOrderItems: OrderItem[] = [
  // ord-1 Table 1 — open, 15 min ago
  { id: 'oi-1',  order_id: 'ord-1', menu_item_id: '2',  quantity: 1, unit_price: 12900, notes: null,                   status: 'pending',    created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'oi-2',  order_id: 'ord-1', menu_item_id: '5',  quantity: 2, unit_price: 11900, notes: null,                   status: 'pending',    created_at: new Date(Date.now() - 900000).toISOString() },
  // ord-2 Table 3 — in_kitchen, 30 min ago
  { id: 'oi-3',  order_id: 'ord-2', menu_item_id: '8',  quantity: 1, unit_price: 18900, notes: null,                   status: 'in_kitchen', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'oi-4',  order_id: 'ord-2', menu_item_id: '12', quantity: 2, unit_price: 19900, notes: 'sin mariscos para uno', status: 'in_kitchen', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'oi-5',  order_id: 'ord-2', menu_item_id: '17', quantity: 2, unit_price: 6900,  notes: null,                   status: 'ready',      created_at: new Date(Date.now() - 1800000).toISOString() },
  // ord-3 Table 5 — ready, 45 min ago
  { id: 'oi-6',  order_id: 'ord-3', menu_item_id: '9',  quantity: 1, unit_price: 42900, notes: null,                   status: 'ready',      created_at: new Date(Date.now() - 2700000).toISOString() },
  { id: 'oi-7',  order_id: 'ord-3', menu_item_id: '6',  quantity: 1, unit_price: 13900, notes: null,                   status: 'ready',      created_at: new Date(Date.now() - 2700000).toISOString() },
  { id: 'oi-8',  order_id: 'ord-3', menu_item_id: '18', quantity: 2, unit_price: 8900,  notes: null,                   status: 'ready',      created_at: new Date(Date.now() - 2700000).toISOString() },
  // ord-4 Table 7 — in_kitchen, mixed, 60 min ago
  { id: 'oi-9',  order_id: 'ord-4', menu_item_id: '1',  quantity: 2, unit_price: 14900, notes: null,                   status: 'delivered',  created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'oi-10', order_id: 'ord-4', menu_item_id: '13', quantity: 2, unit_price: 17900, notes: null,                   status: 'in_kitchen', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'oi-11', order_id: 'ord-4', menu_item_id: '10', quantity: 1, unit_price: 16900, notes: null,                   status: 'in_kitchen', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'oi-12', order_id: 'ord-4', menu_item_id: '18', quantity: 2, unit_price: 8900,  notes: null,                   status: 'delivered',  created_at: new Date(Date.now() - 3600000).toISOString() },
  // ord-5 Table 2 — open, 8 min ago
  { id: 'oi-13', order_id: 'ord-5', menu_item_id: '3',  quantity: 2, unit_price: 9900,  notes: null,                   status: 'pending',    created_at: new Date(Date.now() - 480000).toISOString() },
  { id: 'oi-14', order_id: 'ord-5', menu_item_id: '16', quantity: 1, unit_price: 7900,  notes: 'sin maracuyá',          status: 'pending',    created_at: new Date(Date.now() - 480000).toISOString() },
]

export const mockOrders: Order[] = [
  { id: 'ord-1', table_id: '1', status: 'open',       notes: null,       waiter_name: 'Oscar Parra',       total: 36700, created_at: new Date(Date.now() - 900000).toISOString(),  updated_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'ord-2', table_id: '3', status: 'in_kitchen', notes: null,       waiter_name: 'Patricio Vicencio', total: 65600, created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date(Date.now() - 1200000).toISOString() },
  { id: 'ord-3', table_id: '5', status: 'ready',      notes: 'Mesa VIP', waiter_name: 'Jazmín Parra',     total: 74600, created_at: new Date(Date.now() - 2700000).toISOString(), updated_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'ord-4', table_id: '7', status: 'in_kitchen', notes: null,       waiter_name: 'Juan Cárdenas',    total: 84300, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'ord-5', table_id: '2', status: 'open',       notes: null,       waiter_name: 'Michael Morales',  total: 27700, created_at: new Date(Date.now() - 480000).toISOString(),  updated_at: new Date(Date.now() - 480000).toISOString() },
]

// ── Historical paid orders (last 30 days, for reports) ────────────────────────

function buildHistoricalOrders(): Order[] {
  const seed: [number, number, string][] = [
    // [daysAgo, total, tableId]
    [0,  87400, '3'], [0,  42800, '6'],
    [1,  65300, '5'], [1,  31800, '7'], [1, 112400, '9'],
    [2,  54700, '2'], [2,  71200, '4'],
    [3,  38900, '1'], [3,  93200, '8'],
    [4,  62800, '3'], [4,  45600, '5'],
    [5, 108300, '9'], [5,  42100, '6'],
    [6,  88700, '7'], [6,  34600, '2'],
    [7,  76400, '4'], [7,  55600, '3'],
    [9,  91200, '5'], [10, 67800, '1'],
    [12, 83400, '9'], [14, 72300, '7'],
    [16, 55600, '2'], [18, 94100, '5'],
    [21, 61800, '3'], [24, 88200, '9'],
    [27, 71300, '4'], [30, 65800, '6'],
  ]
  return seed.map(([days, total, tableId], i) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(19 + Math.floor(i % 4), (i * 7) % 60, 0, 0)
    return {
      id: `hist-${i}`,
      table_id: tableId,
      status: 'paid',
      notes: null,
      waiter_name: mockWaiters[i % mockWaiters.length]?.name ?? null,
      total,
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    }
  })
}

export const mockHistoricalOrders: Order[] = buildHistoricalOrders()

// ── Chat ──────────────────────────────────────────────────────────────────────

export const mockChatMessages: ChatMessage[] = [
  // Session 1 — Ana pregunta por menú vegetariano
  { id: 'cm-1',  session_id: 'cs-1', sender: 'guest', text: 'Hola, ¿tienen opciones vegetarianas en el menú?', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'cm-2',  session_id: 'cs-1', sender: 'bot',   text: 'Contamos con entradas y postres vegetarianos. Para dietas especiales o alergias, indícalo en las notas al reservar y el chef lo tendrá en cuenta.', created_at: new Date(Date.now() - 7199000).toISOString() },
  { id: 'cm-3',  session_id: 'cs-1', sender: 'guest', text: 'Perfecto. ¿Y para niños tienen algo especial?', created_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 'cm-4',  session_id: 'cs-1', sender: 'guest', text: 'Somos 2 adultos y 2 niños de 6 y 9 años', created_at: new Date(Date.now() - 5390000).toISOString() },
  // Session 2 — Juan pregunta por estacionamiento (resuelta)
  { id: 'cm-5',  session_id: 'cs-2', sender: 'guest', text: '¿Tienen estacionamiento?', created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: 'cm-6',  session_id: 'cs-2', sender: 'bot',   text: 'No contamos con estacionamiento propio, pero hay estacionamiento público en Av. Borgoño a 200 metros del restaurante.', created_at: new Date(Date.now() - 17999000).toISOString() },
  { id: 'cm-7',  session_id: 'cs-2', sender: 'admin', text: 'Hola Juan, también hay espacios libres frente al restaurante en temporada baja. ¡Te esperamos!', created_at: new Date(Date.now() - 14400000).toISOString() },
  // Session 3 — Carlos pregunta por cumpleaños
  { id: 'cm-8',  session_id: 'cs-3', sender: 'guest', text: 'Hola, quiero celebrar el cumpleaños de mi esposa, ¿puedo llevar una torta?', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'cm-9',  session_id: 'cs-3', sender: 'bot',   text: '¡Con gusto! Solo avísanos al reservar para coordinar el servicio de corte y presentación. ¿Quieres que te ayudemos a planificar algo especial?', created_at: new Date(Date.now() - 1799000).toISOString() },
  { id: 'cm-10', session_id: 'cs-3', sender: 'guest', text: 'Sí por favor, también queremos decoración en la mesa si es posible', created_at: new Date(Date.now() - 900000).toISOString() },
]

// ── Customers ────────────────────────────────────────────────────────────────

export const mockCustomers: Customer[] = [
  {
    id: 'cu-1', name: 'Carlos Muñoz', email: 'carlos@example.com', phone: '+56912345678',
    birthday: '1980-05-15',
    notes: 'Prefiere mesa con vista al mar. Celebra aniversario de bodas en junio. No le gustan las alcaparras.',
    tags: ['vip', 'frecuente'],
    favorite_dish_id: '9', total_visits: 14, total_spent: 1_250_000,
    last_visit: daysFromNow(-6),
    created_at: new Date(Date.now() - 365 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'cu-2', name: 'Ana Fernández', email: 'ana@example.com', phone: '+56987654321',
    birthday: '1992-11-03',
    notes: 'Visita habitualmente los fines de semana. Prefiere ceviches y platos ligeros.',
    tags: ['frecuente'],
    favorite_dish_id: '5', total_visits: 8, total_spent: 620_000,
    last_visit: daysFromNow(-6),
    created_at: new Date(Date.now() - 280 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'cu-3', name: 'Pedro Rojas', email: 'pedro@example.com', phone: '+56922334455',
    birthday: '1975-08-22',
    notes: 'Viene con grupos de 5-6 personas. Solicita factura siempre. Buen cliente corporativo.',
    tags: ['vip', 'corporativo', 'frecuente'],
    favorite_dish_id: '12', total_visits: 11, total_spent: 1_620_000,
    last_visit: daysFromNow(-5),
    created_at: new Date(Date.now() - 400 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'cu-4', name: 'Valentina Soto', email: 'vale@example.com', phone: '+56933445566',
    birthday: '1995-02-14',
    notes: 'Un comensal alérgico a los crustáceos. Siempre avisa al reservar.',
    tags: ['frecuente', 'alergia'],
    favorite_dish_id: '6', total_visits: 5, total_spent: 380_000,
    last_visit: daysFromNow(-4),
    created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'cu-5', name: 'Daniela Morales', email: 'dani@example.com', phone: '+56955667788',
    birthday: '1988-07-30',
    notes: 'Muy buena clienta. Le encanta el pulpo. Recomienda el restaurante frecuentemente.',
    tags: ['frecuente'],
    favorite_dish_id: '2', total_visits: 9, total_spent: 720_000,
    last_visit: daysFromNow(-3),
    created_at: new Date(Date.now() - 320 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'cu-6', name: 'Roberto Pizarro', email: 'rpizarro@example.com', phone: '+56966778899',
    birthday: '1983-12-07',
    notes: 'Solicita mesa con vista. Llegó recomendado por Carlos Muñoz.',
    tags: ['nuevo'],
    favorite_dish_id: '8', total_visits: 2, total_spent: 195_000,
    last_visit: daysFromNow(-3),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'cu-7', name: 'Felipe Torres', email: 'ftorres@example.com', phone: '+56911001122',
    birthday: '1978-04-19',
    notes: 'VIP. Viene con clientes de su empresa para cerrar negocios. Solicita el menú degustación cuando hay.',
    tags: ['vip', 'frecuente', 'corporativo'],
    favorite_dish_id: '11', total_visits: 12, total_spent: 1_480_000,
    last_visit: daysFromNow(-1),
    created_at: new Date(Date.now() - 500 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cu-8', name: 'Empresa TechCorp', email: 'eventos@techcorp.cl', phone: '+56988990011',
    birthday: null,
    notes: 'Almuerzo corporativo mensual. Siempre grupo de 8-12 personas. Necesita boleta a nombre de TechCorp SpA.',
    tags: ['corporativo', 'vip'],
    favorite_dish_id: '12', total_visits: 6, total_spent: 2_340_000,
    last_visit: daysFromNow(-2),
    created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cu-9', name: 'Sofía Bravo', email: 'sofia@example.com', phone: '+56922112233',
    birthday: '1999-09-25',
    notes: null,
    tags: ['nuevo'],
    favorite_dish_id: '1', total_visits: 1, total_spent: 89_000,
    last_visit: daysFromNow(0),
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cu-10', name: 'Camila Vega', email: 'cvega@example.com', phone: '+56977889900',
    birthday: '1991-06-11',
    notes: 'Prefiere ceviches. Suele venir con amigas a mediodía.',
    tags: ['frecuente'],
    favorite_dish_id: '7', total_visits: 7, total_spent: 560_000,
    last_visit: daysFromNow(-2),
    created_at: new Date(Date.now() - 250 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cu-11', name: 'Héctor Palma', email: 'hpalma@example.com', phone: '+56955445566',
    birthday: '1970-01-28',
    notes: 'Le gustan los choros y las machas. Suele pedir vino blanco.',
    tags: ['frecuente'],
    favorite_dish_id: '3', total_visits: 5, total_spent: 440_000,
    last_visit: daysFromNow(-1),
    created_at: new Date(Date.now() - 190 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cu-12', name: 'Marcelo Núñez', email: 'marcelo@example.com', phone: '+56933223344',
    birthday: '1986-10-05',
    notes: 'Cumpleaños hoy. Le gusta el arroz meloso. Viene con grupos.',
    tags: ['nuevo', 'cumpleanos'],
    favorite_dish_id: '12', total_visits: 3, total_spent: 270_000,
    last_visit: daysFromNow(0),
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now()).toISOString(),
  },
  {
    id: 'cu-13', name: 'Familia González', email: 'gonzalez@example.com', phone: '+56911223344',
    birthday: null,
    notes: 'Familia con niños. Un niño alérgico al gluten. Prefieren mesa interior amplia.',
    tags: ['frecuente', 'alergia'],
    favorite_dish_id: '8', total_visits: 6, total_spent: 510_000,
    last_visit: daysFromNow(-5),
    created_at: new Date(Date.now() - 300 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
]

export const mockCustomerVisits: CustomerVisit[] = [
  // Carlos Muñoz (cu-1)
  { id: 'cv-1',  customer_id: 'cu-1', visit_date: daysFromNow(-6),  party_size: 4, amount_spent: 142000, dishes: ['9','1','17','18'],   notes: 'Aniversario bodas', created_at: new Date(Date.now() - 6*86400000).toISOString() },
  { id: 'cv-2',  customer_id: 'cu-1', visit_date: daysFromNow(-23), party_size: 2, amount_spent: 98000,  dishes: ['9','5','18'],         notes: null,               created_at: new Date(Date.now() - 23*86400000).toISOString() },
  { id: 'cv-3',  customer_id: 'cu-1', visit_date: daysFromNow(-45), party_size: 2, amount_spent: 87000,  dishes: ['2','12','17'],        notes: null,               created_at: new Date(Date.now() - 45*86400000).toISOString() },
  { id: 'cv-4',  customer_id: 'cu-1', visit_date: daysFromNow(-70), party_size: 6, amount_spent: 210000, dishes: ['9','11','1','17','18'], notes: 'Mesa de negocios', created_at: new Date(Date.now() - 70*86400000).toISOString() },
  { id: 'cv-5',  customer_id: 'cu-1', visit_date: daysFromNow(-95), party_size: 2, amount_spent: 95000,  dishes: ['9','16','18'],        notes: null,               created_at: new Date(Date.now() - 95*86400000).toISOString() },

  // Ana Fernández (cu-2)
  { id: 'cv-6',  customer_id: 'cu-2', visit_date: daysFromNow(-6),  party_size: 2, amount_spent: 72000,  dishes: ['5','15','17'],        notes: null,               created_at: new Date(Date.now() - 6*86400000).toISOString() },
  { id: 'cv-7',  customer_id: 'cu-2', visit_date: daysFromNow(-28), party_size: 2, amount_spent: 81000,  dishes: ['5','6','17'],         notes: null,               created_at: new Date(Date.now() - 28*86400000).toISOString() },
  { id: 'cv-8',  customer_id: 'cu-2', visit_date: daysFromNow(-55), party_size: 4, amount_spent: 124000, dishes: ['5','7','15','18'],    notes: null,               created_at: new Date(Date.now() - 55*86400000).toISOString() },

  // Pedro Rojas (cu-3)
  { id: 'cv-9',  customer_id: 'cu-3', visit_date: daysFromNow(-5),  party_size: 6, amount_spent: 245000, dishes: ['12','9','1','17','18'], notes: 'Solicita factura', created_at: new Date(Date.now() - 5*86400000).toISOString() },
  { id: 'cv-10', customer_id: 'cu-3', visit_date: daysFromNow(-35), party_size: 5, amount_spent: 198000, dishes: ['12','2','5','18'],     notes: null,               created_at: new Date(Date.now() - 35*86400000).toISOString() },
  { id: 'cv-11', customer_id: 'cu-3', visit_date: daysFromNow(-65), party_size: 6, amount_spent: 230000, dishes: ['12','9','11','17'],    notes: 'Solicita factura', created_at: new Date(Date.now() - 65*86400000).toISOString() },

  // Valentina Soto (cu-4)
  { id: 'cv-12', customer_id: 'cu-4', visit_date: daysFromNow(-4),  party_size: 3, amount_spent: 89000,  dishes: ['6','5','15'],         notes: 'Sin crustáceos',   created_at: new Date(Date.now() - 4*86400000).toISOString() },
  { id: 'cv-13', customer_id: 'cu-4', visit_date: daysFromNow(-30), party_size: 2, amount_spent: 74000,  dishes: ['6','13','17'],        notes: null,               created_at: new Date(Date.now() - 30*86400000).toISOString() },

  // Daniela Morales (cu-5)
  { id: 'cv-14', customer_id: 'cu-5', visit_date: daysFromNow(-3),  party_size: 4, amount_spent: 134000, dishes: ['2','5','12','17'],    notes: null,               created_at: new Date(Date.now() - 3*86400000).toISOString() },
  { id: 'cv-15', customer_id: 'cu-5', visit_date: daysFromNow(-20), party_size: 2, amount_spent: 87000,  dishes: ['2','16','18'],        notes: null,               created_at: new Date(Date.now() - 20*86400000).toISOString() },
  { id: 'cv-16', customer_id: 'cu-5', visit_date: daysFromNow(-48), party_size: 3, amount_spent: 110000, dishes: ['2','6','15'],         notes: null,               created_at: new Date(Date.now() - 48*86400000).toISOString() },

  // Roberto Pizarro (cu-6)
  { id: 'cv-17', customer_id: 'cu-6', visit_date: daysFromNow(-3),  party_size: 4, amount_spent: 128000, dishes: ['8','12','17','18'],   notes: 'Mesa con vista',   created_at: new Date(Date.now() - 3*86400000).toISOString() },
  { id: 'cv-18', customer_id: 'cu-6', visit_date: daysFromNow(-25), party_size: 4, amount_spent: 67000,  dishes: ['8','15'],             notes: null,               created_at: new Date(Date.now() - 25*86400000).toISOString() },

  // Felipe Torres (cu-7)
  { id: 'cv-19', customer_id: 'cu-7', visit_date: daysFromNow(-1),  party_size: 4, amount_spent: 175000, dishes: ['11','9','1','18'],    notes: null,               created_at: new Date(Date.now() - 1*86400000).toISOString() },
  { id: 'cv-20', customer_id: 'cu-7', visit_date: daysFromNow(-18), party_size: 6, amount_spent: 240000, dishes: ['11','12','1','17','18'], notes: 'Cierre negocio', created_at: new Date(Date.now() - 18*86400000).toISOString() },
  { id: 'cv-21', customer_id: 'cu-7', visit_date: daysFromNow(-42), party_size: 4, amount_spent: 162000, dishes: ['11','9','16','17'],   notes: null,               created_at: new Date(Date.now() - 42*86400000).toISOString() },

  // Empresa TechCorp (cu-8)
  { id: 'cv-22', customer_id: 'cu-8', visit_date: daysFromNow(-2),  party_size: 10, amount_spent: 580000, dishes: ['12','9','2','5','17','18'], notes: 'Almuerzo corp.', created_at: new Date(Date.now() - 2*86400000).toISOString() },
  { id: 'cv-23', customer_id: 'cu-8', visit_date: daysFromNow(-32), party_size: 12, amount_spent: 690000, dishes: ['12','11','1','18'],  notes: 'Almuerzo corp.',    created_at: new Date(Date.now() - 32*86400000).toISOString() },

  // Sofía Bravo (cu-9)
  { id: 'cv-24', customer_id: 'cu-9', visit_date: daysFromNow(0),   party_size: 2, amount_spent: 89000,  dishes: ['1','17','18'],        notes: null,               created_at: new Date().toISOString() },

  // Camila Vega (cu-10)
  { id: 'cv-25', customer_id: 'cu-10', visit_date: daysFromNow(-2), party_size: 2, amount_spent: 87000,  dishes: ['7','5','17'],         notes: null,               created_at: new Date(Date.now() - 2*86400000).toISOString() },
  { id: 'cv-26', customer_id: 'cu-10', visit_date: daysFromNow(-22),party_size: 4, amount_spent: 124000, dishes: ['7','6','12','18'],    notes: null,               created_at: new Date(Date.now() - 22*86400000).toISOString() },

  // Héctor Palma (cu-11)
  { id: 'cv-27', customer_id: 'cu-11', visit_date: daysFromNow(-1), party_size: 2, amount_spent: 92000,  dishes: ['3','14','18'],        notes: null,               created_at: new Date(Date.now() - 1*86400000).toISOString() },
  { id: 'cv-28', customer_id: 'cu-11', visit_date: daysFromNow(-28),party_size: 2, amount_spent: 85000,  dishes: ['3','13','17'],        notes: null,               created_at: new Date(Date.now() - 28*86400000).toISOString() },

  // Marcelo Núñez (cu-12)
  { id: 'cv-29', customer_id: 'cu-12', visit_date: daysFromNow(0),  party_size: 5, amount_spent: 145000, dishes: ['12','5','17','18'],   notes: 'Cumpleaños',       created_at: new Date().toISOString() },
  { id: 'cv-30', customer_id: 'cu-12', visit_date: daysFromNow(-30),party_size: 4, amount_spent: 82000,  dishes: ['12','15'],            notes: null,               created_at: new Date(Date.now() - 30*86400000).toISOString() },

  // Familia González (cu-13)
  { id: 'cv-31', customer_id: 'cu-13', visit_date: daysFromNow(-5), party_size: 7, amount_spent: 198000, dishes: ['8','12','3','15','17'], notes: 'Niño alérgico gluten', created_at: new Date(Date.now() - 5*86400000).toISOString() },
  { id: 'cv-32', customer_id: 'cu-13', visit_date: daysFromNow(-40),party_size: 6, amount_spent: 167000, dishes: ['8','5','16','18'],    notes: null,               created_at: new Date(Date.now() - 40*86400000).toISOString() },
]

export const mockChatSessions: ChatSession[] = [
  {
    id: 'cs-1', guest_name: 'Ana Torres', guest_phone: '+56 9 8812 3456', guest_email: 'ana@mail.com',
    status: 'open', unread_admin: 2,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 5390000).toISOString(),
  },
  {
    id: 'cs-2', guest_name: 'Juan Pérez', guest_phone: '+56 9 7723 4567', guest_email: null,
    status: 'resolved', unread_admin: 0,
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'cs-3', guest_name: 'Carlos Silva', guest_phone: '+56 9 6634 5678', guest_email: null,
    status: 'open', unread_admin: 1,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 900000).toISOString(),
  },
]
