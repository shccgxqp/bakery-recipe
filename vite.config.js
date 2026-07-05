import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' → 部署到 GitHub Pages 子路徑(/bakery-recipe/)也能正常載入資源
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
