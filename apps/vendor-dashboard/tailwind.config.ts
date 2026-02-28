import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF3ED',
          100: '#FFE4D4',
          200: '#FFC6A8',
          300: '#FFA071',
          400: '#FF7D47',
          500: '#FF6B35',
          600: '#F04E15',
          700: '#C73A0D',
          800: '#9E3013',
          900: '#7F2B13',
          950: '#451207',
        },
        secondary: {
          50: '#E6F0FA',
          100: '#CCE1F5',
          200: '#99C3EB',
          300: '#66A5E0',
          400: '#3387D6',
          500: '#004E89',
          600: '#004579',
          700: '#003A66',
          800: '#002F52',
          900: '#00243F',
          950: '#001829',
        },
        accent: {
          50: '#FFFCE6',
          100: '#FFF9CC',
          200: '#FFF399',
          300: '#FFED66',
          400: '#FFE733',
          500: '#FFD700',
          600: '#CCAC00',
          700: '#998100',
          800: '#665600',
          900: '#332B00',
          950: '#1A1600',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
