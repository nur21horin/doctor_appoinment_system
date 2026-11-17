/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        bg: v('bg'), card: v('card'), ink: v('ink'), muted: v('muted'), line: v('line'), soft: v('soft'),
        sidebar: v('sidebar'),
        brand: {
          50: '#effaf8', 100: '#d7f2ee', 200: '#b0e4dd', 300: '#7fcfc5', 400: '#4bb3a8',
          500: '#2a968c', 600: '#1f7a72', 700: '#1c625c', 800: '#1a4f4b', 900: '#17423f',
        },
      },
      boxShadow: { card: '0 1px 2px rgb(16 24 40 / 0.04), 0 4px 16px rgb(16 24 40 / 0.06)' },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
