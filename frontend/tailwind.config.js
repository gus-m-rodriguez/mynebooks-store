/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta según Brief de Marca MyneBooks Store
        base: {
          blanco: '#FFFFFF',
          crema: '#F5F5DC',
        },
        oscuro: {
          negro: '#000000',
          azulMarino: '#1a237e',
        },
        acento: {
          rojo: '#DC2626',
          violetaManga: '#8B5CF6',
        },
        // Mantener primary para compatibilidad (usar acento.violetaManga)
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Violeta manga
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Tipografía limpia y moderna
      },
    },
  },
  plugins: [],
}

