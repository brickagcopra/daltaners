import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../apps/*/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF3ED',
          100: '#FFE4D4',
          200: '#FFC5A8',
          300: '#FFA071',
          400: '#FF8453',
          500: '#FF6B35',
          600: '#E85A25',
          700: '#C4481B',
          800: '#9C3A1A',
          900: '#7E3218',
          950: '#44170A',
        },
        secondary: {
          DEFAULT: '#004E89',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#004E89',
          600: '#003D6B',
          700: '#002D50',
          800: '#001F38',
          900: '#001425',
          950: '#000A14',
        },
        accent: {
          DEFAULT: '#FFD700',
          50: '#FFFEF0',
          100: '#FFFBD6',
          200: '#FFF6AD',
          300: '#FFEE7A',
          400: '#FFE347',
          500: '#FFD700',
          600: '#E6C200',
          700: '#BF9F00',
          800: '#997D00',
          900: '#7A6400',
          950: '#453800',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
