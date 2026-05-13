-- ============================================================
-- Calipso Concón — Schema inicial
-- ============================================================

-- Categories
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  icon        text,
  sort_order  int  not null default 99,
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);

-- Menu items
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete cascade,
  name         text not null,
  description  text,
  price        int  not null check (price >= 0),    -- CLP cents-free: stored as integer pesos
  image_url    text,
  is_available bool not null default true,
  is_featured  bool not null default false,
  allergens    text[] not null default '{}',
  sort_order   int  not null default 99,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- Tables
create table if not exists public.tables (
  id       uuid primary key default gen_random_uuid(),
  number   int  not null unique,
  capacity int  not null check (capacity > 0),
  location text not null check (location in ('interior', 'terraza', 'barra')),
  is_active bool not null default true
);

-- Reservations
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid references public.tables(id) on delete set null,
  guest_name  text not null,
  guest_email text not null,
  guest_phone text not null,
  party_size  int  not null check (party_size > 0),
  date        date not null,
  time        time not null,
  notes       text,
  status      text not null default 'pending'
              check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_menu_items_available on public.menu_items(is_available);
create index if not exists idx_reservations_date on public.reservations(date);
create index if not exists idx_reservations_status on public.reservations(status);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.categories   enable row level security;
alter table public.menu_items   enable row level security;
alter table public.tables       enable row level security;
alter table public.reservations enable row level security;

-- Public read access
create policy "Public can read active categories"
  on public.categories for select using (is_active = true);

create policy "Public can read available menu items"
  on public.menu_items for select using (is_available = true);

create policy "Public can read active tables"
  on public.tables for select using (is_active = true);

-- Authenticated (admin) full access
create policy "Admins can manage categories"
  on public.categories for all using (auth.role() = 'authenticated');

create policy "Admins can manage menu items"
  on public.menu_items for all using (auth.role() = 'authenticated');

create policy "Admins can manage tables"
  on public.tables for all using (auth.role() = 'authenticated');

create policy "Admins can manage reservations"
  on public.reservations for all using (auth.role() = 'authenticated');

-- Public can create reservations (anon)
create policy "Public can create reservations"
  on public.reservations for insert with check (true);

-- Public can read their own reservations by email (optional)
create policy "Public can read reservations"
  on public.reservations for select using (true);
