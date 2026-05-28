/**
 * Calipso Restaurant — configuración de imágenes
 *
 * Reemplaza cada string vacío con la URL real de la foto.
 * Las imágenes de platos se almacenan en Firebase Storage bajo dish-images/{id}.webp
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
 * Firebase Storage URL helper
 * Construye la URL pública de descarga de una foto de plato.
 * Úsala como: dishPhotoUrl('menu-item-id')
 */
export function dishPhotoUrl(id: string, ext: 'webp' | 'jpg' = 'webp'): string {
  const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
  if (!bucket) return ''
  const encoded = encodeURIComponent(`dish-images/${id}.${ext}`)
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`
}
