import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true
      }
    }
  },
  optimizeDeps: {
    exclude: ['react-error-overlay']
  }
})
