/* 帳號系統(見 docs/roadmap.md 第 2 項):Google 登入 + 信箱密碼登入,
   兩條路簽出來的 token 格式一致(見 api/_lib/authToken.js)。
   跨網域(前端 GitHub Pages、API Vercel)不能用 cookie session,
   token 存 localStorage,之後打 API 要帶身份就用 Authorization: Bearer <token>。
   這階段只驗證登入這條路通不通,不牽動任何權限/資料歸屬。
   檔名沿用 googleAuth.js(先求快,不折騰檔名),但現在管兩種登入方式。 */

import { API_BASE } from '../config.js'

const KEY = 'bakery-google-auth'

async function postAuth(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || '請求失敗')
  localStorage.setItem(KEY, json.token)
  return json
}

/* 信箱+密碼:同一個 email 之前只用過 Google 登入的話,這裡會幫它補設密碼 */
export const registerWithPassword = (email, password, displayName = '') =>
  postAuth('/api/auth/register', { email, password, displayName })

export const loginWithPassword = (email, password) =>
  postAuth('/api/auth/login', { email, password })

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

/* 目前登入使用者的 token,寫入 API 要帶 Authorization: Bearer 時用這個 */
export function getAuthToken() {
  return localStorage.getItem(KEY)
}
