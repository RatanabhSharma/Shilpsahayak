/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6b1a', // Primary vibrant orange accent
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        dark: {
          DEFAULT: '#0f172a',
          bg: '#0f172a', // Slate 900 primary dark background
          card: '#1e293b', // Slate 800 elevated cards
          elevated: '#334155',
          border: '#334155',
          muted: '#94a3b8',
        },
        surface: {
          DEFAULT: '#f4f2ef', // Soft whitish-grey primary background
          card: '#ffffff',
          stone: '#ede9e3',
          muted: '#eae6df',
          border: '#e2ddd5',
          dark: '#0f172a',
          darkCard: '#1e293b',
          lavender: '#f6f4f2',
        },
        charcoal: {
          DEFAULT: '#18181b',
          light: '#52525b',
          lighter: '#71717a',
          subtle: '#a1a1aa',
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        display: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(24, 24, 27, 0.05)',
        'card': '0 10px 30px -5px rgba(20, 20, 25, 0.05)',
        'glow': '0 0 25px rgba(255, 107, 26, 0.25)',
        'glow-lg': '0 0 45px rgba(255, 107, 26, 0.35)',
      }
    },
  },
  plugins: [],
}