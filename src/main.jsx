import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

/* Hash 路由:GitHub Pages 是純靜態站,沒有伺服器端 rewrite——# 後面的路徑
   不會送到伺服器,不用 404 轉址 hack 也不用換部署平台。之後真的搬到 Vercel
   要換乾淨網址,只要把 HashRouter 換成 BrowserRouter(+ basename)。 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

/* PWA:只在正式 build 註冊(開發時會干擾 HMR);網址相對於部署路徑 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', window.location.href)).catch(() => {})
  })
}
