import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7003,
    strictPort: false, // 포트가 사용 중이면 다음 포트 시도
    proxy: {
      '/api': {
        target: 'http://localhost:7001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:7001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})