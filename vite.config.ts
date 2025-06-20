import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Ensure correct asset loading for Electron
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      // Proxy API requests to aoe2cm.net
      '/api': {
        target: 'https://aoe2cm.net',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist', // Ensure output is in the 'dist' folder
    rollupOptions: {
      // Externalize Electron-specific modules if any are imported in renderer code
      external: ['electron'],
    },
  },
  // Exclude the electron directory from being processed by Vite
})
