import { useState, useEffect, useCallback } from 'react'

interface Slide {
  src: string
  alt: string
}

interface CarouselProps {
  slides: Slide[]
  /** Milliseconds between auto-advance. Default: 5000 */
  interval?: number
  /** Crossfade duration in ms. Default: 800 */
  fadeDuration?: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const OVERLAY = 'linear-gradient(to bottom, rgba(28,43,45,0.50) 0%, rgba(28,43,45,0.72) 100%)'

export default function Carousel({
  slides,
  interval = 5000,
  fadeDuration = 800,
  children,
  className = '',
  style,
}: CarouselProps) {
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState<boolean[]>(slides.map(() => false))
  const [errored, setErrored] = useState<boolean[]>(slides.map(() => false))

  const advance = useCallback(() => {
    setCurrent(c => (c + 1) % slides.length)
  }, [slides.length])

  useEffect(() => {
    const timer = setInterval(advance, interval)
    return () => clearInterval(timer)
  }, [advance, interval])

  const handleLoad = (i: number) => setLoaded(l => { const n = [...l]; n[i] = true; return n })
  const handleError = (i: number) => setErrored(e => { const n = [...e]; n[i] = true; return n })

  const hasAnyPhoto = slides.some(s => s.src && s.src.trim() !== '')

  return (
    <div
      className={`relative overflow-hidden bg-[#1C2B2D] ${className}`}
      style={style}
      aria-roledescription="carousel"
    >
      {/* Slides */}
      {slides.map((slide, i) => {
        const active = i === current
        const showImg = slide.src && !errored[i]

        return (
          <div
            key={i}
            aria-hidden={!active}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: active ? 1 : 0,
              transition: `opacity ${fadeDuration}ms ease-in-out`,
              zIndex: active ? 1 : 0,
            }}
          >
            {/* Photo */}
            {showImg && (
              <img
                src={slide.src}
                alt={slide.alt}
                onLoad={() => handleLoad(i)}
                onError={() => handleError(i)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  opacity: loaded[i] ? 1 : 0,
                  transition: 'opacity 400ms ease',
                }}
              />
            )}
            {/* Overlay — always present */}
            <div style={{ position: 'absolute', inset: 0, background: OVERLAY }} />
          </div>
        )
      })}

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>

      {/* Dot indicators — hidden on mobile when no photos */}
      {hasAnyPhoto && slides.length > 1 && (
        <div
          className="hidden md:flex absolute bottom-5 left-1/2 -translate-x-1/2 gap-2"
          style={{ zIndex: 3 }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Ir a slide ${i + 1}`}
              style={{
                width: i === current ? '24px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === current ? '#29B5D0' : 'rgba(255,255,255,0.35)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 400ms ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
