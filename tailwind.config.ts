import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy aliases — kept so admin/auth/parceiro pages keep working
        // while the public site is migrated to the new design system.
        purple: { DEFAULT: '#5B2D8E', dark: '#3D1A6E', light: '#7B3DBE' },
        orange: { DEFAULT: '#E8892F', dark: '#D47520' },
        cyan: { DEFAULT: '#3CC8C8', dark: '#2BA8A8', light: '#2AA8B8' },
        blue: { DEFAULT: '#1A73B5', dark: '#155E94' },
        beige: '#FDF0E8',
        dark: '#2D2D2D',
        // New design system
        azul: {
          DEFAULT: '#2b2e8d',
          900: '#1a1d66',
          50: '#eef0ff',
        },
        verde: {
          DEFAULT: '#a6ce3a',
          600: '#8fb42c',
        },
        ciano: {
          DEFAULT: '#56c6d0',
          600: '#3aa8b2',
        },
        laranja: {
          DEFAULT: '#f8821e',
          600: '#d96a0a',
        },
        ink: {
          DEFAULT: '#2b2e8d',
          70: '#4a4c70',
          50: '#7a7c99',
        },
        paper: {
          DEFAULT: '#fafaf7',
          2: '#f1f2ec',
        },
        line: '#e6e7df',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        // Legacy alias — admin/auth pages still use font-montserrat utility
        montserrat: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        site: '1280px',
      },
      borderRadius: {
        'pen': '4px',
        'pen-lg': '18px',
      },
      keyframes: {
        marquee: {
          to: { transform: 'translateX(-50%)' },
        },
        videoPulse: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '80%': { transform: 'scale(2.1)', opacity: '0' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        videoIconPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        videoBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        pageEnter: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'video-pulse': 'videoPulse 1.8s ease-out infinite',
        'video-pulse-delay': 'videoPulse 1.8s ease-out 0.9s infinite',
        'video-icon': 'videoIconPulse 1.6s ease-in-out infinite',
        'video-bob': 'videoBob 2.4s ease-in-out infinite',
        'page-enter': 'pageEnter 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fadeIn 0.2s ease',
      },
    },
  },
  plugins: [],
}

export default config
