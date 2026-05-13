/**
 * Calipso Restaurant — configuración de imágenes
 *
 * Reemplaza cada string vacío con la URL real de la foto.
 * Opciones de almacenamiento:
 *   - Supabase Storage: https://{proyecto}.supabase.co/storage/v1/object/public/dish-images/{nombre}.webp
 *   - Cualquier URL HTTPS pública
 *
 * Formato recomendado: WebP, máx 1400px de ancho, calidad 85%
 */

export const PHOTOS = {
  // ── Carrusel de inicio (3 slides, automático cada 5s) ──────────────────
  carousel: [
    {
      src: '',          // 1. Fachada de noche con letrero iluminado — impacto inmediato
      alt: 'Fachada de Calipso Restaurant de noche con letrero iluminado',
    },
    {
      src: '',          // 2. Exterior verde turquesa sobre el mar — contexto y ubicación
      alt: 'Exterior de Calipso Restaurant sobre el mar en Concón',
    },
    {
      src: '',          // 3. Interior con comensales y vista al mar — calidez y autenticidad
      alt: 'Interior de Calipso Restaurant con vista panorámica al mar',
    },
  ],

  // ── Header de la carta digital ─────────────────────────────────────────
  menuHero: '',         // Interior con ventanales panorámicos y vista al mar (día)

  // ── Página de reservas (split layout desktop) ──────────────────────────
  reservations: '',     // Interior con mesa preparada y vista panorámica al fondo

  // ── Sección "Sobre el restaurante" (Home) ─────────────────────────────
  aboutLarge: '',       // Interior con comensales — 70% del grid
  aboutSmall: '',       // Detalle artístico — 30% del grid (ej: gaviota sobre el mar)
}

/**
 * Supabase Storage URL helper
 * Úsala para construir URLs de platos: dishPhotoUrl('abc123')
 */
export function dishPhotoUrl(id: string, ext: 'webp' | 'jpg' = 'webp'): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return ''
  return `${base}/storage/v1/object/public/dish-images/${id}.${ext}`
}
