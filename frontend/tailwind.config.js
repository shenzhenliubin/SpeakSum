/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg-primary': '#f4ede4',
        'bg-soft': '#fbf7f1',
        'bg-panel': 'rgba(255, 251, 246, 0.84)',

        // Text colors
        'text-primary': '#31291f',
        'text-secondary': '#74614f',
        'text-tertiary': '#9e8b79',

        // Brand colors
        terracotta: {
          DEFAULT: '#c8734f',
          deep: '#9e5434',
          light: '#d68860',
        },

        // Accent colors
        moss: {
          DEFAULT: '#6f8465',
          soft: '#96a98e',
        },
        sand: '#eadcc9',
        sea: '#d9e3db',

        // Functional colors
        status: {
          success: '#6f8465',
          warning: '#d7b082',
          error: '#c8734f',
          info: '#8fa17a',
        },

        // Border colors
        line: {
          DEFAULT: '#dfd1c0',
          strong: '#c8b39d',
        },
      },
      borderRadius: {
        'xl': '28px',
        'lg': '22px',
        'md': '18px',
        'sm': '14px',
      },
      boxShadow: {
        'card': '0 16px 40px rgba(80, 46, 24, 0.05)',
        'float': '0 24px 60px rgba(90, 57, 35, 0.08)',
        'button': '0 10px 24px rgba(193, 107, 71, 0.24)',
      },
      fontFamily: {
        ui: ['"Avenir Next"', '"PingFang SC"', '"Hiragino Sans GB"', '"Noto Sans SC"', '"Source Han Sans SC"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', '"Songti SC"', '"STSong"', 'serif'],
      },
    },
  },
  plugins: [],
}
