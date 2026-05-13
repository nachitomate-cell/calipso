/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calipso brand palette
        calipso: {
          50:  '#F0FAFB',
          100: '#DCF0F5',
          200: '#B5D4F4', // input borders
          300: '#7ABBC8',
          400: '#5A7A80', // secondary text
          DEFAULT: '#29B5D0', // THE brand color
          600: '#29B5D0',
          700: '#1A7A8E', // dark / hover / sidebar
          800: '#1A7A8E',
          900: '#155F6E',
          950: '#1C2B2D', // ink / near-black
        },
        // CTA coral
        coral: {
          DEFAULT: '#E8593C',
          hover: '#C04828',
          light: '#FAECE7',
          dark: '#993C1D',
        },
        // Arena warm background
        arena: {
          DEFAULT: '#F5EDD6',
          light: '#FDFAF5',
          warm: '#FAEEDA',
        },
        // Ink text
        ink: {
          DEFAULT: '#1C2B2D',
          secondary: '#5A7A80',
        },
        // Status colors for table/reservation states
        status: {
          free:     '#E1F5EE',  // green tint
          occupied: '#FAECE7',  // coral tint
          reserved: '#FAEEDA',  // amber tint
          cleaning: '#F1EFE8',  // gray tint
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        // Editorial carta
        editorial: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        jost: ['Jost', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
      boxShadow: {
        brand: '0 2px 12px rgba(41,181,208,0.10)',
        'brand-md': '0 4px 20px rgba(41,181,208,0.18)',
        'brand-lg': '0 8px 32px rgba(41,181,208,0.22)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
