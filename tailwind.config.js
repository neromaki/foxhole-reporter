/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coalition: '#1d4ed8',
        warden: '#16a34a',
        neutral: '#6b7280'
      }
    },
  },
  plugins: [],
};
