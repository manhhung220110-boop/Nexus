import type { Config } from 'tailwindcss'

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          blue: '#2563EB',
          purple: '#7C3AED',
          coral: '#EF4444',
          cyan: '#06B6D4',
          green: '#22C55E',
          indigo: '#4F46E5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        control: '10px',
      },
    },
  },
  plugins: [],
} satisfies Config
