/**
 * Tokens portados 1:1 desde el :root de mockup-plataforma-almuerzo.html
 * (ver plan-sprints.md, Sprint 10) — mismo lenguaje visual ya validado,
 * ahora como utilidades de Tailwind en vez de una hoja de estilos aparte.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#161D26',
        'ink-2': '#232D3B',
        'ink-3': '#3A4757',
        paper: '#F7F6F2',
        card: '#FFFFFF',
        rule: '#DCD8CE',
        'rule-2': '#EAE7E0',
        muted: '#6B6A63',
        verde: '#2D6A4F',
        'verde-bg': '#E6EFEA',
        ambar: '#B06C05',
        'ambar-bg': '#FBF0DC',
        granate: '#9B2C2C',
        'granate-bg': '#F8E9E9',
        azul: '#1F4E79',
        'azul-bg': '#E7EEF5',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        // Sprint 21 — solo para las pantallas públicas. Ver index.html.
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
