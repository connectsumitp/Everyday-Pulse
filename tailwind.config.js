/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    'home-action-card-purple',
    'home-action-card-green',
    'home-action-card-gold',
    'home-action-icon-purple',
    'home-action-icon-green',
    'home-action-icon-gold',
    'home-action-chevron-purple',
    'home-action-chevron-green',
    'home-action-chevron-gold',
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: '#F4F8FF',
          primary: '#4F6CFF',
          purpleSoft: '#EDEEFF',
          green: '#1FA883',
          greenSoft: '#E7F8F4',
          gold: '#E59F23',
          yellowSoft: '#FFF4D7',
          blue: '#2478FF',
          blueSoft: '#E8F2FF',
          ink: '#1E2738',
          muted: '#657084',
          border: '#DCE7F6',
        },
      },
      boxShadow: {
        soft: '0 18px 48px rgba(54, 89, 150, 0.14)',
        card: '0 12px 28px rgba(54, 89, 150, 0.10)',
      },
      fontFamily: {
        sans: ['Quicksand', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
