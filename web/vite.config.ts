import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@knowledgeos/types': path.resolve(__dirname, 'src/shared/types'),
      '@knowledgeos/engine': path.resolve(__dirname, 'src/shared/engine'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
