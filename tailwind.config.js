/** @type {import('tailwindcss').Config} */
export default {
  content: ['./dashboard/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        memex: {
          purple: '#7c3aed',
          blue: '#2563eb',
          green: '#16a34a',
          orange: '#ea580c',
        },
      },
    },
  },
  plugins: [],
};
