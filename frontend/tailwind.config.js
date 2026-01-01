 
/* eslint-env node */
/* global module */

/**
 * Tailwind configuration for Thunder Road
 *
 * Purpose:
 * - Define design tokens (colors, fonts, spacing) mapped to CSS variables so
 *   runtime theming (ThemeContext) can change appearance without rebuilding.
 *
 * Notes:
 * - Colors are defined using CSS variables (var(--primary-color)) so the
 *   ThemeProvider can switch themes by updating :root variables or
 *   `data-theme` on <html>.
 * - darkMode is set to 'class' so we can lock the enforced dark theme regardless
 *   of OS/browser preference.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables so Tailwind utilities follow the runtime color variables
        primary: {
          DEFAULT: 'var(--primary-color, #dc2626)',
          dark: 'var(--primary-dark, #b91c1c)'
        },
        secondary: { DEFAULT: 'var(--secondary-color, #92400e)' },
        accent: { DEFAULT: 'var(--accent-color, #f59e0b)' },
        success: 'var(--success-color, #059669)',
        warning: 'var(--warning-color, #f59e0b)',
        error: {
          DEFAULT: 'var(--error-color, #ef4444)',
          muted: 'var(--error-muted, #ef5b5b)'
        },

        // Background / Surface
        background: {
          DEFAULT: 'var(--background-color, #fef7ed)',
          light: 'var(--background-light, #fffbfa)'
        },
        surface: {
          DEFAULT: 'var(--surface-color, #ffffff)',
          warm: 'var(--surface-warm, #fff7f2)',
          dark: 'var(--surface-dark, #111827)'
        },

        // Text Colors
        text: {
          primary: 'var(--text-primary, #1c1917)',
          secondary: 'var(--text-secondary, #78716c)',
          muted: 'var(--text-muted, #94a3b8)',
          inverse: 'var(--text-inverse, #ffffff)'
        },

        // Border & Divider
        border: { DEFAULT: 'var(--border-color, #e2e8f0)' },
        divider: { DEFAULT: 'var(--divider-color, #f1f5f9)' },

        // Admin Specific (kept for convenience)
        admin: {
          grad1: 'var(--primary-color, #dc2626)',
          grad2: 'var(--secondary-color, #92400e)',
          cardBg: 'var(--surface-warm, #fff7f2)',
          pageBg: 'var(--background-light, #fffbfa)'
        }
      },
      
      fontFamily: {
        sans: ['Roboto', 'Open Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Impact', 'Anton', 'Arial Black', 'Helvetica Neue', 'sans-serif'],
        accent: ['Pacifico', 'Brush Script MT', 'cursive'],
        mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '3rem',
      },
      
      borderRadius: {
        'sm': '4px',
        DEFAULT: '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        'xxl': '0 18px 40px rgba(2,6,23,0.12)',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      transitionDuration: {
        'fast': '150ms',
        DEFAULT: '300ms',
        'slow': '500ms',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      
      animation: {
        fadeIn: 'fadeIn 0.6s ease',
        slideInUp: 'slideInUp 0.6s ease',
        slideInDown: 'slideInDown 0.6s ease',
        pulse: 'pulse 2s infinite',
        spin: 'spin 0.9s linear infinite',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Lock to the enforced runtime theme via a root class
}
