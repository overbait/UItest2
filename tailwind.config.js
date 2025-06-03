/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AoE2 theme colors
        'aoe-gold': '#D4AF37',
        'aoe-brown': '#8B4513',
        'aoe-tan': '#D2B48C',
        'aoe-dark': '#2C2C2C',
        'aoe-light': '#F5F5DC',
        
        // Functional colors
        'pick': '#4CAF50',     // Green for picks
        'pick-light': '#81C784',
        'pick-dark': '#2E7D32',
        'ban': '#F44336',      // Red for bans
        'ban-light': '#E57373',
        'ban-dark': '#C62828',
        'snipe': '#FF9800',    // Orange for snipes
        'snipe-light': '#FFB74D',
        'snipe-dark': '#EF6C00',
        'reveal': '#2196F3',   // Blue for reveals
        'reveal-light': '#64B5F6',
        'reveal-dark': '#1565C0',
        
        // UI colors
        'ui-primary': '#795548',
        'ui-secondary': '#5D4037',
        'ui-accent': '#D4AF37',
        'ui-background': 'rgba(30, 30, 30, 0.85)',
        'ui-text': '#F5F5DC',
      },
      fontFamily: {
        'medieval': ['Cinzel', 'serif'],
        'game': ['Alegreya', 'serif'],
        'broadcast': ['Roboto', 'sans-serif'],
        'technical': ['Inter', 'sans-serif'],
        'display': ['MedievalSharp', 'cursive'],
      },
      screens: {
        // Standard breakpoints
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        
        // Broadcast-specific breakpoints
        'stream-720p': '1280px',
        'stream-1080p': '1920px',
        'stream-1440p': '2560px',
        'stream-4k': '3840px',
        
        // Overlay sizes
        'overlay-sm': {'raw': '(min-height: 300px)'},
        'overlay-md': {'raw': '(min-height: 500px)'},
        'overlay-lg': {'raw': '(min-height: 720px)'},
      },
      backgroundOpacity: {
        '10': '0.1',
        '20': '0.2',
        '95': '0.95',
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.8)' }
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
