import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // すべてのネットワークインターフェースにバインド
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': 'http://localhost:5000',
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
