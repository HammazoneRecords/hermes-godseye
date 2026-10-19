/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cosmic-architecture-metaphor palette per skill §3.2
        space: '#0a0e1a',
        panel: '#11172a',
        'panel-2': '#161e36',
        'panel-3': '#1d2747',
        border: '#243352',
        text: '#e9edf4',
        'text-dim': '#8a93ad',
        'text-faint': '#4a5475',

        verified:    '#72c69a',
        hypothesis: '#f3c969',
        correction: '#ff3333',
        tool:        '#00b4ff',
        approval:    '#e2b45d',
        warning:     '#ff6f3d',
        infra:       '#00ffd5',
        memory:      '#a78bfa',
        idle:        '#e9edf4',
        traffic:     '#ff69b4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
