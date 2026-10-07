/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad NumIO. El tono 500 es el color institucional exacto (#C1D631).
        // Sobre blanco tiene solo 1.6:1 de contraste, así que nunca se usa como
        // color de texto: se usa como fondo con tinta oscura encima (10.5:1) o
        // como acento sobre los tonos profundos. Para texto se usan 700/800.
        brand: {
          50: '#FBFCF0',
          100: '#F4F8D8',
          200: '#E8EFB3',
          300: '#D8E481',
          400: '#CBDC56',
          500: '#C1D631',
          600: '#A1B41D',
          700: '#7D8D11',
          800: '#636F0B',
          900: '#4B5507',
          950: '#2E3503',
        },
        // Neutros con un leve sesgo hacia el oliva para convivir con el lima.
        // Reemplaza la escala slate de Tailwind, de modo que todas las pantallas
        // adoptan la nueva paleta sin cambiar una sola clase.
        slate: {
          50: '#FBFBF9',
          100: '#F6F7F3',
          200: '#E8EAE1',
          300: '#D2D5C8',
          400: '#A8AC9A',
          500: '#80856F',
          600: '#636855',
          700: '#4B4F40',
          800: '#33362B',
          900: '#21231A',
        },
        // Tinta de la marca: casi negro con sesgo verde. Es el color de texto
        // que se pone encima del lima.
        ink: '#1A1D14',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'monospace'],
      },
      transitionProperty: {
        width: 'width',
      },
    },
  },
  plugins: [],
};
