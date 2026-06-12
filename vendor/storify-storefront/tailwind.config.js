/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './constants.ts',
    './types.ts',
    './components/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './theme/**/*.{js,ts,jsx,tsx}',
    './theme-adapter/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../themes/default-storefront/src/**/*.{js,ts,jsx,tsx}',
    '../../themes/storedesign/src/**/*.{js,ts,jsx,tsx}',
    '../../themes/theking/src/**/*.{js,ts,jsx,tsx}',
    '../../themes/sarab/src/**/*.{js,ts,jsx,tsx}',
    '../../themes/srab/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'ui-serif', 'Georgia', 'serif'],
        cairo: ['Cairo', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
