/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1E3A5F', light: '#2C5282', dark: '#152A4A' },
      }
    }
  },
  plugins: []
}
