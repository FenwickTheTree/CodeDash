/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic backgrounds + borders (CSS-var driven)
        bg: {
          primary:   'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary:  'var(--bg-tertiary)'
        },
        border: {
          DEFAULT: 'var(--border)'
        },
        accent: {
          green:  'var(--accent-green)',
          blue:   'var(--accent-blue)',
          red:    'var(--accent-red)',
          yellow: 'var(--accent-yellow)',
          purple: 'var(--accent-purple)'
        },
        // Remap the entire gray scale to CSS vars so text-gray-* flips with the theme.
        gray: {
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        }
      }
    }
  },
  plugins: []
}
