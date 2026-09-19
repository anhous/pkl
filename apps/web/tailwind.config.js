/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { brand: { 600: '#4f46e5', 700: '#4338ca' } },
    },
  },
  plugins: [],
};
