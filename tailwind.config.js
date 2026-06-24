/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f3f1ea',
        surface: '#faf9f5',
        ink: '#2b2925',
        muted: '#8a857c',
        line: '#e4e0d6',
        rust: '#c0552d',
        'rust-dark': '#a8481f',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
        soft: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up-soft': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'message-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'message-in-right': {
          '0%': { opacity: '0', transform: 'translateX(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-premium both',
        'fade-up': 'fade-up 220ms ease-premium both',
        'slide-in-right': 'slide-in-right 260ms ease-premium both',
        'slide-up-soft': 'slide-up-soft 220ms ease-premium both',
        'message-in-left': 'message-in-left 180ms ease-premium both',
        'message-in-right': 'message-in-right 180ms ease-premium both',
        shimmer: 'shimmer 1.6s linear infinite',
        'typing-dot': 'typing-dot 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
