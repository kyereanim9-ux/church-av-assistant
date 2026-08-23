import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ECEEEF',
        panel: '#FFFFFF',
        ink: {
          DEFAULT: '#1B1D1F',
          soft: '#565C61',
        },
        stage: {
          DEFAULT: '#14171A',
          panel: '#1E2227',
          line: '#2B3036',
        },
        cream: '#F3F1EA',
        amber: {
          DEFAULT: '#E8A33D',
          dim: '#C98A1F',
        },
        signal: '#3B82C4',
        ok: '#3F9767',
        danger: '#D14343',
      },
      fontFamily: {
        display: ['var(--font-oswald)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        card: '0.625rem',
      },
      boxShadow: {
        rack: '0 1px 0 0 rgba(0,0,0,0.04), 0 8px 20px -12px rgba(20,23,26,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
