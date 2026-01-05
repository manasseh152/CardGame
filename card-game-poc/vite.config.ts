import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ 
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(), 
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: process.env.VITE_ALLOWED_HOSTS 
      ? process.env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim())
      : ['vite.bitbreeze.nl', 'multiplayer.bitbreeze.nl', 'localhost', '127.0.0.1'],
    host: process.env.VITE_HOST || '0.0.0.0',
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173,
  },
})
