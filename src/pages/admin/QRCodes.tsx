import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, ExternalLink, UtensilsCrossed, CalendarDays } from 'lucide-react'

const BASE_URL = 'https://calipsoconcon.synaptechspa.cl'

interface QRCard {
  title: string
  subtitle: string
  url: string
  icon: React.ReactNode
  accent: string
  accentBg: string
}

const cards: QRCard[] = [
  {
    title: 'Carta Digital',
    subtitle: 'Escanea para ver el menú',
    url: `${BASE_URL}/carta`,
    icon: <UtensilsCrossed size={20} />,
    accent: '#29B5D0',
    accentBg: '#EBF8FB',
  },
  {
    title: 'Reservas Online',
    subtitle: 'Escanea para reservar una mesa',
    url: `${BASE_URL}/reservas`,
    icon: <CalendarDays size={20} />,
    accent: '#E8593C',
    accentBg: '#FAECE7',
  },
]

function printQR(title: string, url: string, svgElement: SVGElement | null) {
  if (!svgElement) return

  // Serialize the SVG
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgElement)
  const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))

  const win = window.open('', '_blank', 'width=480,height=620,menubar=no,toolbar=no,location=no,scrollbars=no')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} — Calipso Concón</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 32px 24px;
      color: #1a1a2e;
    }
    .restaurant-name {
      font-size: 28px;
      font-style: italic;
      font-weight: bold;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
      color: #1a1a2e;
    }
    .restaurant-sub {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 28px;
    }
    .qr-frame {
      border: 3px solid #1a1a2e;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      background: #fff;
    }
    .qr-frame img {
      display: block;
      width: 220px;
      height: 220px;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
      letter-spacing: 0.02em;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
    }
    .url {
      font-size: 10px;
      color: #aaa;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.05em;
    }
    .divider {
      width: 40px;
      height: 2px;
      background: #1a1a2e;
      margin: 14px auto;
      border-radius: 2px;
    }
    @media print {
      body { padding: 16px; }
      @page { margin: 0.5cm; }
    }
  </style>
</head>
<body>
  <div class="restaurant-name">Calipso</div>
  <div class="restaurant-sub">Concón · Restaurante</div>
  <div class="qr-frame">
    <img src="${svgDataUrl}" alt="QR Code" />
  </div>
  <div class="title">${title}</div>
  <div class="subtitle">${title === 'Carta Digital' ? 'Escanea para ver el menú completo' : 'Escanea para reservar tu mesa'}</div>
  <div class="divider"></div>
  <div class="url">${url}</div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`)
  win.document.close()
}

export default function QRCodes() {
  const svgRefs = useRef<(SVGSVGElement | null)[]>([null, null])

  return (
    <div className="space-y-6 animate-fade-in font-body max-w-2xl mx-auto">

      <p className="text-sm text-ink-secondary">
        Imprime estos QR para ponerlos en las mesas o en la entrada del restaurante.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map((card, i) => (
          <div
            key={card.url}
            className="bg-white rounded-card shadow-brand border border-calipso-100 overflow-hidden flex flex-col"
          >
            {/* Card header */}
            <div
              className="flex items-center gap-2.5 px-5 py-3.5 border-b"
              style={{ backgroundColor: card.accentBg, borderColor: card.accent + '33' }}
            >
              <span style={{ color: card.accent }}>{card.icon}</span>
              <div>
                <p className="font-semibold text-ink text-sm">{card.title}</p>
                <p className="text-xs text-ink-secondary">{card.subtitle}</p>
              </div>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center py-8 px-5 flex-1">
              <div
                className="p-4 rounded-xl border-2 bg-white mb-4"
                style={{ borderColor: card.accent + '55' }}
              >
                <QRCodeSVG
                  value={card.url}
                  size={180}
                  level="M"
                  includeMargin={false}
                  fgColor="#1a1a2e"
                  ref={(el: SVGSVGElement | null) => { svgRefs.current[i] = el }}
                />
              </div>

              {/* URL */}
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-mono text-ink-secondary hover:text-calipso transition-colors mb-1"
              >
                {card.url.replace('https://', '')}
                <ExternalLink size={10} />
              </a>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => printQR(card.title, card.url, svgRefs.current[i])}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-card text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: card.accent }}
              >
                <Printer size={15} />
                Imprimir QR
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Combined print — both QRs on one sheet */}
      <div className="bg-white rounded-card shadow-brand border border-calipso-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink text-sm">Imprimir los dos juntos</p>
            <p className="text-xs text-ink-secondary mt-0.5">Una hoja con Carta y Reservas lado a lado</p>
          </div>
          <button
            onClick={() => {
              const svgs = svgRefs.current.map((el) => {
                if (!el) return ''
                const s = new XMLSerializer()
                const str = s.serializeToString(el)
                return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str)))
              })
              const win = window.open('', '_blank', 'width=720,height=540,menubar=no,toolbar=no,location=no')
              if (!win) return
              win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QR Codes — Calipso Concón</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      color: #1a1a2e;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .restaurant-name { font-size: 32px; font-style: italic; font-weight: bold; }
    .restaurant-sub { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin-top: 2px; }
    .grid { display: flex; gap: 40px; justify-content: center; }
    .card { display: flex; flex-direction: column; align-items: center; }
    .qr-frame { border: 2px solid #1a1a2e; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
    .qr-frame img { display: block; width: 180px; height: 180px; }
    .card-title { font-size: 17px; font-weight: bold; margin-bottom: 4px; }
    .card-sub { font-size: 11px; color: #666; margin-bottom: 6px; }
    .url { font-size: 9px; color: #aaa; font-family: 'Courier New', monospace; }
    .divider { width: 1px; background: #e5e5e5; align-self: stretch; margin: 0 8px; }
    @media print { @page { margin: 0.5cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="restaurant-name">Calipso</div>
    <div class="restaurant-sub">Concón · Restaurante</div>
  </div>
  <div class="grid">
    ${cards.map((card, i) => `
    <div class="card">
      <div class="qr-frame"><img src="${svgs[i]}" alt="QR" /></div>
      <div class="card-title">${card.title}</div>
      <div class="card-sub">${i === 0 ? 'Ver el menú completo' : 'Reservar tu mesa'}</div>
      <div class="url">${card.url.replace('https://', '')}</div>
    </div>
    ${i === 0 ? '<div class="divider"></div>' : ''}
    `).join('')}
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
              win.document.close()
            }}
            className="flex items-center gap-2 bg-calipso hover:bg-calipso-700 text-white text-sm font-semibold px-4 py-2.5 rounded-card transition-all duration-200 active:scale-95"
          >
            <Printer size={15} />
            Imprimir juntos
          </button>
        </div>
      </div>
    </div>
  )
}
