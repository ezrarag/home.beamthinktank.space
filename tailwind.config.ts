import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Apple HIG + Material 3 inspired design tokens
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      
      // Apple HIG spacing scale (8pt grid system)
      spacing: {
        'xs': '4px',    // 0.25rem
        'sm': '8px',    // 0.5rem
        'md': '16px',   // 1rem
        'lg': '24px',   // 1.5rem
        'xl': '32px',   // 2rem
        '2xl': '48px',  // 3rem
        '3xl': '64px',  // 4rem
        '4xl': '96px',  // 6rem
        '5xl': '128px', // 8rem
      },
      
      // Apple HIG typography scale
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'sm': ['14px', { lineHeight: '20px', letterSpacing: '0.01em' }],
        'base': ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
        'lg': ['18px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        '5xl': ['48px', { lineHeight: '48px', letterSpacing: '-0.02em' }],
        '6xl': ['60px', { lineHeight: '60px', letterSpacing: '-0.02em' }],
      },
      
      // Material 3 inspired shadows
      boxShadow: {
        'elevation-1': '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'elevation-2': '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'elevation-4': '0px 2px 3px 0px rgba(0, 0, 0, 0.30), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
        'elevation-5': '0px 4px 4px 0px rgba(0, 0, 0, 0.30), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
        
        // Apple-style shadows for dark mode
        'apple-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'apple-2': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        'apple-3': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
        'apple-4': '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
        'apple-5': '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
      },
      
      // Material 3 border radius
      borderRadius: {
        'none': '0px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
      },
      
      // Apple HIG + Material 3 color system
      colors: {
        // System colors for dark mode
        system: {
          background: 'hsl(0 0% 8%)',
          'background-secondary': 'hsl(0 0% 12%)',
          'background-tertiary': 'hsl(0 0% 16%)',
          surface: 'hsl(0 0% 14%)',
          'surface-secondary': 'hsl(0 0% 18%)',
          'surface-tertiary': 'hsl(0 0% 22%)',
          border: 'hsl(0 0% 24%)',
          'border-secondary': 'hsl(0 0% 28%)',
          text: 'hsl(0 0% 95%)',
          'text-secondary': 'hsl(0 0% 70%)',
          'text-tertiary': 'hsl(0 0% 50%)',
        },
        
        // Material 3 semantic colors
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
        
        // Apple-style blue for dark mode
        apple: {
          blue: '#007AFF',
          'blue-dark': '#0056CC',
          gray: '#8E8E93',
          'gray-light': '#AEAEB2',
          'gray-dark': '#48484A',
        },
      },
      
      // Material 3 transition timing
      transitionTimingFunction: {
        'material-standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'material-decelerated': 'cubic-bezier(0, 0, 0.2, 1)',
        'material-accelerated': 'cubic-bezier(0.4, 0, 1, 1)',
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      
      // Apple HIG animation durations
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
    },
  },
  plugins: [],
};

export default config;
