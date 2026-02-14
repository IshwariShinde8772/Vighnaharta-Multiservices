/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4ade80', // green-400
          DEFAULT: '#22c55e', // green-500
          dark: '#16a34a', // green-600
        },
        secondary: {
          light: '#60a5fa', // blue-400
          DEFAULT: '#3b82f6', // blue-500
          dark: '#2563eb', // blue-600
        }
      }
    },
  },
  plugins: [],
}
