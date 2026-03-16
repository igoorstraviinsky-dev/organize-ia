/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#8E44AD',
          navy: '#17112E',
          gray: '#F8F9FA',
          green: '#2ECC71'
        },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Manrope', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
