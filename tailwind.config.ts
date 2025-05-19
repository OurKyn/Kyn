import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5D5FEF',
          dark: '#232347',
          accent: '#F7B801',
          bg: '#F5F7FA',
          'bg-dark': '#181A20',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        display: ['Geist', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [animate],
}
export default config
