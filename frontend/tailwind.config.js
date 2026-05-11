/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF8750',
          'orange-deep': '#FF6B50',
          teal: '#607879',
          cyan: '#07C2EF',
        },
        neutral: {
          900: '#333333',
          700: '#666666',
          500: '#999999',
          300: '#CCCCCC',
          100: '#F2F2F2',
        },
        bg: {
          primary: '#0E0E12',
          surface: '#1A1A22',
          'surface-alt': '#24242E',
        },
        status: {
          success: '#22C55E',
          warning: '#F5B842',
          error: '#EF4444',
          info: '#07C2EF',
          draft: '#999999',
        },
        admin: {
          bg: '#0B0E14',
          surface: '#0F111A',
          'surface-alt': '#161923',
          'text-primary': '#FFFFFF',
          'text-secondary': '#949BAA',
          border: '#1E222B',
          accent: '#FF8750',
          active: '#07C2EF',
        },
        border: {
          subtle: '#333333',
        },
      },
      fontFamily: {
        sans: ['Raleway', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // §7.4 — practical tokens for engineering
        'display-xl': ['48px', { lineHeight: '56px', fontWeight: '700' }],
        'display-l': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'display-m': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'display-s': ['18px', { lineHeight: '26px', fontWeight: '700' }],
        'display-xs': ['16px', { lineHeight: '24px', fontWeight: '700' }],
        heading: ['20px', { lineHeight: '28px', fontWeight: '700' }],
        subheading: ['16px', { lineHeight: '24px', fontWeight: '300' }],
        body: ['12px', { lineHeight: '18px', fontWeight: '300' }],
        'body-reading': ['16px', { lineHeight: '26px', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
        full: '9999px',
      },
      backgroundImage: {
        'brand-cyan-peach': 'linear-gradient(135deg, #07C2EF 0%, #FF8750 100%)',
        'brand-peach-cyan': 'linear-gradient(135deg, #FF8750 0%, #07C2EF 100%)',
        'brand-tri': 'linear-gradient(135deg, #07C2EF 0%, #FFFFFF 50%, #FF8750 100%)',
        'cover-overlay': 'linear-gradient(to top, rgba(14,14,18,0.85), transparent)',
      },
      boxShadow: {
        // §7.7
        'card-dark': '0 4px 12px rgba(0, 0, 0, 0.35)',
        'modal-dark': '0 12px 32px rgba(0, 0, 0, 0.5)',
        'card-light': '0 1px 3px rgba(51, 51, 51, 0.08), 0 1px 2px rgba(51, 51, 51, 0.04)',
        'modal-light': '0 12px 24px rgba(51, 51, 51, 0.16)',
      },
      maxWidth: {
        container: '1280px',
        'container-app': '1440px',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.65' },
        },
        bobY: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(5px)' },
        },
        slideProgress: {
          from: { width: '0%' },
          to: { width: '100%' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.55s ease-out both',
        'float': 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3.5s ease-in-out infinite',
        'bob-y': 'bobY 1.8s ease-in-out infinite',
        'slide-progress': 'slideProgress 5s linear forwards',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
