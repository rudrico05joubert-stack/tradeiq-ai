/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Black / near-black surfaces
        ink: {
          950: '#000000',
          960: '#020203',
          900: '#050607',
          880: '#0a0b0c',
          850: '#0d0e0f',
          800: '#111214',
          750: '#16181a',
          700: '#1c1f22',
          650: '#232629',
          600: '#2b2f33',
          500: '#3a3f44',
          400: '#565b61',
          300: '#7d838a',
          200: '#a8aeb5',
          100: '#d4d8dd',
          50: '#eef0f2',
        },
        white: {
          DEFAULT: '#ffffff',
          soft: '#f5f6f7',
        },
        // Neon green accent
        neon: {
          50: '#e7fff0',
          100: '#c2ffdc',
          200: '#7dffb6',
          300: '#3eff89',
          400: '#10e96b',
          500: '#00d957',
          600: '#00b349',
          700: '#008c3a',
          800: '#006e2f',
          900: '#00521f',
        },
        bull: { 400: '#10e96b', 500: '#00d957', 600: '#00b349' },
        bear: { 400: '#ff4d61', 500: '#ff2742', 600: '#e11d36' },
        warn: { 400: '#ffc44d', 500: '#ffab0a', 600: '#d98600' },
        // secondary accent (cool blue, used sparingly for terminal ambience)
        accent: { 500: '#3b82f6', 400: '#60a5fa' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(16,233,107,0.18), 0 10px 40px -12px rgba(16,233,107,0.45)',
        'glow-lg': '0 0 60px -10px rgba(16,233,107,0.55)',
        glass: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 60px -28px rgba(0,0,0,0.85)',
        'glass-sm': '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 10px 30px -16px rgba(0,0,0,0.7)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(800px 420px at 50% -8%, rgba(16,233,107,0.14), transparent 60%)',
        'neon-line': 'linear-gradient(90deg, transparent, rgba(16,233,107,0.6), transparent)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseDot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.35', transform: 'scale(0.75)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(900%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.35s ease-out both',
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        scan: 'scan 2.2s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
