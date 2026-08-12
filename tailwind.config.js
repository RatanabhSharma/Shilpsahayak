/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fcf9f2',
          100: '#f7f0e1',
          200: '#efdfc0',
          300: '#e5c796',
          400: '#dbab65',
          500: '#c98a1e', // Deep amber
          600: '#b87318',
          700: '#995816',
          800: '#7e4718',
          900: '#653a16',
          950: '#3a1e0a',
        },
        surface: {
          DEFAULT: '#faf6ee', // Warm off-white background
          card: '#ffffff',
          dark: '#f0e9dc',
        },
        charcoal: {
          DEFAULT: '#2b2724',
          light: '#4a4541',
          lighter: '#736d68',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(43, 39, 36, 0.05)',
        'glow': '0 0 20px rgba(201, 138, 30, 0.15)',
      }
    },
  },
  plugins: [],
}