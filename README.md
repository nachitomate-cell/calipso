# 🐚 Calipso Concón — Sistema de Restaurante

Aplicación web completa para restaurante de mariscos en Concón, Chile.

**Stack:** React + TypeScript + Vite + Tailwind CSS + Supabase

---

## Módulos

| Módulo | URL | Descripción |
|--------|-----|-------------|
| Carta Digital | `/carta` | Menú público con categorías y filtros |
| Reservas | `/reservas` | Formulario de reserva para clientes |
| Admin Dashboard | `/admin` | Panel de control |
| Admin Carta | `/admin/carta` | Gestión de platos y categorías |
| Admin Mesas | `/admin/mesas` | Gestión de mesas y ubicaciones |
| Admin Reservas | `/admin/reservas` | Gestión y confirmación de reservas |

---

## Setup Local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Modo demo (sin Supabase)

```bash
npm run dev
```

La app funciona con datos mock. El panel admin es accesible directamente sin login.

### 3. Conectar Supabase (producción)

**a) Crear proyecto en [supabase.com](https://supabase.com)**

**b) Ejecutar schema:**

```sql
-- Copiar y pegar el contenido de:
supabase/migrations/001_initial_schema.sql
```

**c) Ejecutar seed data:**

```sql
-- Copiar y pegar el contenido de:
supabase/seed/seed.sql
```

**d) Crear usuario admin:**

En Supabase Dashboard → Authentication → Users → Add user  
O via SQL:
```sql
-- Usar el panel de Supabase Auth para crear el usuario admin
-- Email: admin@calipso.cl
-- Password: (elegir una contraseña segura)
```

**e) Configurar variables de entorno:**

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Deploy en Vercel

### 1. Push a GitHub

```bash
git init
git add .
git commit -m "init: calipso concon app"
git remote add origin https://github.com/tu-usuario/calipso-concon.git
git push -u origin main
```

### 2. Importar en Vercel

1. Ve a [vercel.com](https://vercel.com) → New Project
2. Importa el repositorio de GitHub
3. Framework Preset: **Vite**
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### 3. Dominio personalizado (opcional)

En Vercel → Settings → Domains → agregar `calipsoconcon.cl`

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── layout/          # Nav, Footer, AdminLayout, ProtectedRoute
│   └── ui/              # Badge, Modal, Input, LoadingSpinner
├── hooks/
│   └── useAuth.ts       # Hook de autenticación Supabase
├── lib/
│   ├── api.ts           # Funciones de acceso a datos
│   ├── supabase.ts      # Cliente Supabase
│   ├── mock-data.ts     # Datos de ejemplo para modo demo
│   └── database.types.ts # Tipos TypeScript de la BD
├── pages/
│   ├── Home.tsx
│   ├── Menu.tsx
│   ├── Reservations.tsx
│   └── admin/
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── MenuAdmin.tsx
│       ├── TablesAdmin.tsx
│       └── ReservationsAdmin.tsx
└── types/
    └── index.ts         # Tipos compartidos
supabase/
├── migrations/
│   └── 001_initial_schema.sql
└── seed/
    └── seed.sql
```

---

## Row Level Security (RLS)

| Tabla | Lectura pública | Escritura |
|-------|----------------|-----------|
| `categories` | Solo activas | Solo admin autenticado |
| `menu_items` | Solo disponibles | Solo admin autenticado |
| `tables` | Solo activas | Solo admin autenticado |
| `reservations` | Todas | Anon puede crear, admin gestiona |

---

## Personalización

- **Colores:** Edita `tailwind.config.js` → colores `ocean` y `sand`
- **Horarios:** Edita `src/pages/Reservations.tsx` → array `timeSlots`
- **Datos contacto:** Edita `src/components/layout/Footer.tsx`
- **Textos hero:** Edita `src/pages/Home.tsx`
