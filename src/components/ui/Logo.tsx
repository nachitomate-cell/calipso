interface LogoProps {
  /**
   * Controls rendered width. Height is always proportional (square aspect).
   * sm=80px | md=110px | lg=150px | xl=200px
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const widths = { sm: 80, md: 110, lg: 150, xl: 200 }

/**
 * Calipso Restaurant SVG logo.
 *
 * Reproduced from the original brand asset:
 * - Fish body: thin horizontal ellipse with C-shaped mouth opening (left side)
 * - Eye dot inside the C (fish head faces left)
 * - "calipso" in Great Vibes script inside the fish body
 * - Fork · Plate · Knife silhouettes to the right
 * - Thin horizontal separator line
 * - "RESTAURANT" in widely-spaced Inter caps below
 * - Background: #29B5D0 | All elements: white
 */
export default function Logo({ size = 'md', className }: LogoProps) {
  const w = widths[size]
  // Logo is a square (1:1 aspect ratio matching the brand asset)
  const h = w

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Calipso Restaurant logo"
      className={className}
    >
      {/* ── Background ─────────────────────────────────────── */}
      <rect width="500" height="500" fill="#29B5D0" />

      {/* ── Fish body ─────────────────────────────────────────
          Strategy: one large arc for the main body (upper+right+lower),
          one small C-curve for the mouth gap on the left.
          The ellipse is centered at ~(195, 215), rx≈155, ry≈58.
          Mouth top:    (42, 190)
          Mouth bottom: (42, 242)
      ─────────────────────────────────────────────────────── */}
      {/* Main body arc — clockwise from mouth-top, around right, back to mouth-bottom */}
      <path
        d="M 42,190 A 155,58 0 1 1 42,242"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Mouth C-curve — small gap, curves left then back */}
      <path
        d="M 42,190 C 18,190 12,216 42,242"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Eye ───────────────────────────────────────────── */}
      <circle cx="62" cy="213" r="6" fill="white" />

      {/* ── "calipso" script ──────────────────────────────────
          Great Vibes is a free Google Font that closely matches
          the original logo's flowing script style.
          Falls back to cursive if not loaded.
      ─────────────────────────────────────────────────────── */}
      <text
        x="212"
        y="247"
        textAnchor="middle"
        fontFamily="'Great Vibes', 'Pinyon Script', cursive"
        fontSize="96"
        fontWeight="400"
        fill="white"
      >
        calipso
      </text>

      {/* ── Cutlery ────────────────────────────────────────────
          Positioned to the right of the fish body.
          Order (left→right): Fork | Plate | Knife
          All centered vertically within the fish height (~170–260)
      ─────────────────────────────────────────────────────── */}

      {/* Fork — 4 tines + curved connector + straight handle */}
      <g transform="translate(368, 172)" stroke="white" strokeLinecap="round" fill="none">
        {/* Tines */}
        <line x1="-9" y1="0" x2="-9" y2="26" strokeWidth="2.5" />
        <line x1="-3" y1="0" x2="-3" y2="26" strokeWidth="2.5" />
        <line x1="3"  y1="0" x2="3"  y2="26" strokeWidth="2.5" />
        <line x1="9"  y1="0" x2="9"  y2="26" strokeWidth="2.5" />
        {/* Tine base / neck curve */}
        <path d="M -9,26 Q -9,34 0,36 Q 9,34 9,26" strokeWidth="2.5" />
        {/* Handle */}
        <line x1="0" y1="36" x2="0" y2="90" strokeWidth="2.8" />
      </g>

      {/* Plate — outer circle + inner circle ring */}
      <circle cx="400" cy="216" r="26" stroke="white" strokeWidth="2.5" />
      <circle cx="400" cy="216" r="17" stroke="white" strokeWidth="1.8" />

      {/* Knife — pointed blade on top + straight handle */}
      <g transform="translate(432, 172)" stroke="white" strokeLinecap="round" fill="none">
        {/* Blade */}
        <path d="M 0,0 C 7,4 9,16 7,30 L 0,34" strokeWidth="2.5" />
        {/* Handle */}
        <line x1="0" y1="34" x2="0" y2="90" strokeWidth="2.8" />
      </g>

      {/* ── Separator line ────────────────────────────────────── */}
      <line x1="36" y1="325" x2="464" y2="325" stroke="white" strokeWidth="2" />

      {/* ── RESTAURANT label ──────────────────────────────────── */}
      <text
        x="250"
        y="403"
        textAnchor="middle"
        fontFamily="'Inter', 'Arial', sans-serif"
        fontSize="30"
        fontWeight="300"
        letterSpacing="18"
        fill="white"
      >
        RESTAURANT
      </text>
    </svg>
  )
}
