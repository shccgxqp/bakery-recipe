/* 帳號系統第一階段(Google 登入測試,見 docs/roadmap.md 第 2 項):
   跨網域(前端 GitHub Pages、API Vercel)不能用 cookie session,
   token 用網址 query string 帶回來(不是 #,# 是 HashRouter 的路由),
   前端存 localStorage,之後打 API 要帶身份就用 Authorization: Bearer <token>。
   這階段只驗證登入這條路通不通,不牽動任何權限/資料歸屬。 */

import { API_BASE } from '../config.js'

const KEY = 'bakery-google-auth'

export function startGoogleLogin() {
  const returnTo = window.location.origin + window.location.pathname
  window.location.href = `${API_BASE}/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`
}

/* 開站時呼叫一次:網址帶 ?token=... 就存起來、把 token 從網址清掉(留住 hash 路由) */
export function consumeTokenFromQuery() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (!token) return
  localStorage.setItem(KEY, token)
  params.delete('token')
  const qs = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash)
}

/* 只解碼看內容,不驗簽章(簽章驗證在後端做);過期就當沒登入 */
export function getGoogleUser() {
  const token = localStorage.getItem(KEY)
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer_atob(token.split('.')[1]))
    if (payload.exp && payload.exp < Date.now() / 1000) { localStorage.removeItem(KEY); return null }
    return payload
  } catch {
    return null
  }
}

function Buffer_atob(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
}

export function googleLogout() {
  localStorage.removeItem(KEY)
}
