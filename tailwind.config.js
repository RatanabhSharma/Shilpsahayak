/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#141414',
        paper: '#F0F4F8',
        shell: '#F0EFEA',
        line: '#EAE7E1',
        muted: '#6B675E',
        accent: {
          DEFAULT: '#FF4D00',
          light: '#FF6B2B',
          soft: '#FFF2EC',
          dark: '#CC3D00',
        },
        'accent-blue': {
          DEFAULT: '#0D5BFF',
          light: '#3B7CFF',
          soft: '#EFF4FF',
          dark: '#0043C7',
        },
        'accent-green': {
          DEFAULT: '#10B981',
          light: '#34D399',
          soft: '#ECFDF5',
          dark: '#059669',
        },
        'accent-amber': {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          soft: '#FFFBEB',
          dark: '#D97706',
        },
        brand: {
          50: '#fff2ec',
          100: '#ffe4d3',
          200: '#ffc4a0',
          300: '#ff9d6b',
          400: '#ff6b2b',
          500: '#ff4d00',
          600: '#cc3d00',
          700: '#992e00',
          800: '#661f00',
          900: '#331000',
          950: '#1a0800',
        },
        dark: {
          DEFAULT: '#121212',
          card: '#1A1A1A',
          elevated: '#222222',
          border: '#282828',
          muted: '#888888',
        },
        surface: {
          DEFAULT: '#F0F4F8',
          card: '#FFFFFF',
          stone: '#F0EFEA',
          muted: '#EAE7E1',
          border: '#EAE7E1',
        },
        charcoal: {
          DEFAULT: '#18181b',
          light: '#52525b',
          lighter: '#71717a',
          subtle: '#a1a1aa',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(15,14,11,0.06)',
        card: '0 4px 24px rgba(15,14,11,0.08)',
        float: '0 8px 32px rgba(15,14,11,0.14)',
        glow: '0 0 24px rgba(255,77,0,0.28)',
        'glow-lg': '0 0 48px rgba(255,77,0,0.38)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      maxWidth: {
        shell: '1280px',
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        'marquee-slow': 'marquee 48s linear infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) forwards',
        shimmer: 'shimmer 1.8s infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}