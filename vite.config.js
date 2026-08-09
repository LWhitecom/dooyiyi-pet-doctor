import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 宠物医生个人网站 · Vite 配置
// 移动端优先，构建纯静态产物到 dist/
export default defineConfig({
  base: '/dooyiyi-pet-doctor/',
  plugins: [react()],
  server: {
    host: true,     // 允许手机扫码访问预览
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
