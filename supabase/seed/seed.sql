-- ============================================================
-- Calipso Concón — Seed data
-- ============================================================

-- Categories
insert into public.categories (name, slug, description, icon, sort_order) values
  ('Entradas',             'entradas',   'Para comenzar el viaje',              '🦪', 1),
  ('Ceviches & Tiraditos', 'ceviches',   'Frescura del mar en su estado puro',   '🐟', 2),
  ('Fondos de Mar',        'fondos',     'Platos principales del océano',        '🦞', 3),
  ('Arroces & Pastas',     'arroces',    'El mar en formato reconfortante',      '🍚', 4),
  ('Postres',              'postres',    'El dulce final',                       '🍮', 5),
  ('Vinos & Bebidas',      'bebidas',    'Para acompañar',                       '🍷', 6)
on conflict (slug) do nothing;

-- Menu Items
with cats as (
  select id, slug from public.categories
)
insert into public.menu_items (category_id, name, description, price, is_available, is_featured, allergens, sort_order)
select c.id, m.name, m.description, m.price, m.is_available, m.is_featured, m.allergens, m.sort_order
from cats c
join (values
  -- Entradas
  ('entradas', 'Ostras Finas al Natural',      'Media docena de ostras del sur de Chile servidas sobre hielo con limón de Pica y mignonette de chalota.',    14900, true,  true,  array['moluscos'],                          1),
  ('entradas', 'Pulpo a la Brasa',             'Pulpo braseado sobre hummus de garbanzos, aceite de pimentón ahumado y chips de ajo.',                        12900, true,  true,  array['moluscos'],                          2),
  ('entradas', 'Choros al Vapor',              'Mejillones de Chiloé al vapor con bisque de azafrán, pan artesanal tostado.',                                  9900, true,  false, array['moluscos','gluten'],                  3),
  ('entradas', 'Empanada de Marisco',          'Empanada al horno rellena con camarones, machas y queso de campo. Masa hojaldrada.',                           6900, true,  false, array['gluten','lacteos'],                   4),
  -- Ceviches
  ('ceviches', 'Ceviche Clásico',              'Corvina del día marinada en limón de Pica, cebolla morada, cilantro y ají limo. Con choclo y camote.',         11900, true,  true,  array['pescado'],                            1),
  ('ceviches', 'Tiradito Nikkei',              'Láminas finas de atún rojo, leche de tigre de maracuyá, aceite de sésamo y crispy de quinoa.',                 13900, true,  true,  array['pescado','soja'],                    2),
  ('ceviches', 'Ceviche Mixto',                'Camarones, calamares y pulpo en leche de tigre verde con rocoto, palta y maíz crocante.',                      14900, true,  false, array['pescado','moluscos','crustaceos'],   3),
  -- Fondos
  ('fondos',   'Congrio Dorado al Horno',      'Filete de congrio dorado horneado con costra de almendras, puré de coliflor ahumado y mantequilla de hierbas.',18900, true,  true,  array['pescado','nueces'],                   1),
  ('fondos',   'Langosta Entera a la Plancha', 'Langosta entera a la plancha con mantequilla de ajo y limón, papas doradas y ensalada de rúcula.',             42900, true,  true,  array['crustaceos','lacteos'],               2),
  ('fondos',   'Plateada de Mar',              'Reineta a la mantequilla negra, alcaparras, perejil, limón Meyer y papas salteadas.',                          16900, true,  false, array['pescado','lacteos'],                  3),
  ('fondos',   'Parrillada de Mariscos',       'Langostinos, calamares, ostiones y pulpo a la parrilla con chimichurri marino y pan artesanal.',               28900, false, false, array['moluscos','crustaceos','gluten'],    4),
  -- Arroces
  ('arroces',  'Arroz Meloso de Mariscos',     'Arroz al dente con caldo de bisque, langostinos, almejas, azafrán y alioli de ajo negro.',                     19900, true,  true,  array['moluscos','crustaceos','lacteos'],   1),
  ('arroces',  'Risotto de Tinta de Calamar',  'Risotto negro con calamar salteado, queso parmesano y espuma de alioli.',                                      17900, true,  false, array['moluscos','lacteos'],                 2),
  ('arroces',  'Pasta con Machas',             'Tagliolini con machas de Pichilemu, ajo, vino blanco, mantequilla y ralladura de limón.',                      15900, true,  false, array['moluscos','gluten','lacteos'],        3),
  -- Postres
  ('postres',  'Crème Brûlée de Algarrobo',   'Clásica crème brûlée con infusión de algarrobo patagónico y frutos del bosque.',                                6900, true,  false, array['lacteos','huevos'],                   1),
  ('postres',  'Cheesecake de Lúcuma',         'Base de galleta, cremoso de lúcuma, mermelada de maracuyá y crocante de nueces.',                               7900, true,  true,  array['lacteos','gluten','nueces'],          2),
  -- Bebidas
  ('bebidas',  'Pisco Sour Clásico',           'Pisco 35°, limón de Pica, jarabe, clara de huevo y amargo de angostura.',                                       6900, true,  false, array['huevos'],                             1),
  ('bebidas',  'Sauvignon Blanc Casa Marin',   'Lo Abarca. Aromas cítricos, mineralidad costera perfecta para mariscos.',                                        8900, true,  false, array[]::text[],                             2)
) as m(slug, name, description, price, is_available, is_featured, allergens, sort_order)
on (c.slug = m.slug);

-- Tables
insert into public.tables (number, capacity, location, is_active) values
  (1, 2, 'terraza',  true),
  (2, 2, 'terraza',  true),
  (3, 4, 'terraza',  true),
  (4, 4, 'terraza',  true),
  (5, 6, 'terraza',  true),
  (6, 2, 'interior', true),
  (7, 4, 'interior', true),
  (8, 4, 'interior', true),
  (9, 8, 'interior', true),
  (10, 2, 'barra',   true),
  (11, 2, 'barra',   true),
  (12, 2, 'barra',   false)
on conflict (number) do nothing;

-- Sample reservations
with t as (select id, number from public.tables)
insert into public.reservations (table_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, status)
select
  (select id from t where number = 3),
  'Carlos Muñoz', 'carlos@example.com', '+56912345678', 4,
  current_date + interval '3 days', '20:00',
  'Aniversario de bodas, por favor decorar la mesa', 'confirmed'
union all
select
  (select id from t where number = 1),
  'Ana Fernández', 'ana@example.com', '+56987654321', 2,
  current_date + interval '3 days', '13:30',
  null, 'pending'
union all
select
  (select id from t where number = 9),
  'Familia González', 'gonzalez@example.com', '+56911223344', 7,
  current_date + interval '4 days', '14:00',
  'Un niño alérgico al gluten', 'confirmed';
