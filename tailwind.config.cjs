/* eslint-disable @typescript-eslint/no-require-imports */
/** Tailwind CSS config tuned for Konsta UI + safe-area utilities */
const plugin = require('tailwindcss/plugin')

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './node_modules/konsta/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        deep: '#0d1b2a',
        accent: '#eab308',
        sand: '#f3e5c7',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      const safeAreaUtilities = {
        '.safe-area-inset-t': { paddingTop: 'env(safe-area-inset-top)' },
        '.safe-area-inset-b': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.safe-area-inset-l': { paddingLeft: 'env(safe-area-inset-left)' },
        '.safe-area-inset-r': { paddingRight: 'env(safe-area-inset-right)' },
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pl-safe': { paddingLeft: 'env(safe-area-inset-left)' },
        '.pr-safe': { paddingRight: 'env(safe-area-inset-right)' },
        '.px-safe': {
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        },
        '.py-safe': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }
      }

      addUtilities(safeAreaUtilities)
      addUtilities({
        '.ios-backdrop': {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)'
        },
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '6px',
        },
        '.scrollbar-track-slate-900::-webkit-scrollbar-track': {
          backgroundColor: '#0f172a',
        },
        '.scrollbar-thumb-slate-700::-webkit-scrollbar-thumb': {
          backgroundColor: '#334155',
          borderRadius: '3px',
        },
        '.scrollbar-thumb-slate-700::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#475569',
        }
      })
    })
  ],
}