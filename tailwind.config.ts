import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: '#08090C',
        titanium: '#12151C',
        'hyper-teal': '#00F0D0',
        'solar-gold': '#FFB800',
        'neon-red': '#FF334B',
        'ice-white': '#FFFFFF',
        silver: '#E2E8F0',
      },
      boxShadow: {
        'specular-hairline': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'glow-teal': '0 0 30px -8px rgba(0, 240, 208, 0.25)',
        'glow-gold': '0 0 30px -8px rgba(255, 184, 0, 0.25)',
        'glow-red': '0 0 30px -8px rgba(255, 51, 75, 0.30)',
      },
    },
  },
} satisfies Config;
