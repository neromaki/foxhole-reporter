/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coalition: '#16a34a',
        warden: '#1d4ed8',
        neutral: '#fefefe'
      }
    },
  },
  plugins: [],
};
