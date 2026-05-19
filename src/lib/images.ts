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
      src: '/entrance.jpg',
      alt: 'Fachada de Calipso Restaurant de noche con letrero iluminado',
    },
    {
      src: '/6844937940_2bb4794abe_b.jpg',
      alt: 'Exterior de Calipso Restaurant sobre el mar en Concón',
    },
    {
      src: '/interior.jpg',
      alt: 'Interior de Calipso Restaurant con vista panorámica al mar',
    },
  ],

  // ── Header de la carta digital ─────────────────────────────────────────
  menuHero: '/calypso.jpg',

  // ── Página de reservas (split layout desktop) ──────────────────────────
  reservations: '/20180425-153019-largejpg.jpg',

  // ── Sección "Sobre el restaurante" (Home) ─────────────────────────────
  aboutLarge: '/calipso-dest-1.jpg',
  aboutSmall: '/caption.jpg',
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
