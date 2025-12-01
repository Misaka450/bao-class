import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    // Optimize: code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design UI library
          'vendor-antd': ['antd', '@ant-design/icons'],
          // Charts library
          'vendor-charts': ['recharts'],
          // Other vendors
          'vendor-misc': ['zustand', 'xlsx', 'dayjs'],
        },
      },
    },
  },
})
