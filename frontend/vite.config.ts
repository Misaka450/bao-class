import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Optimize JSX runtime for production
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      'react': path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
    },
  },
  server: {
    port: 3000,
    host: true, // Allow external connections
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Pro template optimized build configuration
  build: {
    target: 'es2015', // Support modern browsers
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    minify: 'esbuild', // Use esbuild for faster minification
    chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
    cssCodeSplit: true, // Enable CSS code splitting

    commonjsOptions: {
      transformMixedEsModules: true,
    },

    rollupOptions: {
      output: {
        // 手动分割大型依赖
        manualChunks: {
          // React 核心
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design 核心
          'vendor-antd': ['antd', '@ant-design/icons'],
          // Ant Design Pro 组件
          'vendor-pro': [
            '@ant-design/pro-components',
            '@ant-design/pro-layout',
            '@ant-design/pro-table',
            '@ant-design/pro-form',
          ],
          // 图表库
          'vendor-charts': ['recharts'],
          // 工具库
          'vendor-utils': ['dayjs', 'lodash', 'xlsx', 'zustand'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          return 'assets/[ext]/[name]-[hash].[ext]';
        },
      },
    },

  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
    ],
    force: true,
  },

  esbuild: {
    // 生产环境移除 console.log 和 debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
