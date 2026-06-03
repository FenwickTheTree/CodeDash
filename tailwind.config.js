/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          tertiary: '#21262d'
        },
        border: {
          DEFAULT: '#30363d'
        },
        accent: {
          green: '#2ea043',
          blue: '#1f6feb',
          red: '#da3633',
          yellow: '#d29922',
          purple: '#8957e5'
        },
        cf: {
          ac: '#1a7f37',
          wa: '#cf222e',
          tle: '#9a6700',
          mle: '#8250df',
          ce: '#6e7781',
          pending: '#1f6feb'
        }
      }
    }
  },
  plugins: []
}
