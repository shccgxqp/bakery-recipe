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
export const registerWithPassword = (email, password, displayName = '', tosAccepted = false) =>
  postAuth('/api/auth/register', { email, password, displayName, tosAccepted })

export const loginWithPassword = (email, password) =>
  postAuth('/api/auth/login', { email, password })

export function startGoogleLogin() {
  const returnTo = window.location.origin + window.location.pathname
  window.location.href = `${API_BASE}/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`
}

/* 開站時呼叫一次:網址帶 ?token=... 就存起來、把 token 從網址清掉(留住 hash 路由)。
   回傳是否剛消化了新 token(= Google 登入剛導回來),App 用它判斷首次登入引導。 */
export function consumeTokenFromQuery() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (!token) return false
  localStorage.setItem(KEY, token)
  params.delete('token')
  const qs = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash)
  return true
}

/* 讀取自己的完整個人資料(工作室名/網頁不在 token 裡,要跟伺服器拿) */
export async function fetchProfile() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${localStorage.getItem(KEY)}` },
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || '讀取失敗')
  return json.profile
}

/* 記錄同意條款(存伺服器當「善盡提醒義務」鐵證;kind: 'label' = 標示卡免責) */
export async function acceptTerms(kind) {
  const res = await fetch(`${API_BASE}/api/auth/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(KEY)}` },
    body: JSON.stringify({ kind }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || '記錄失敗')
  return json
}

/* 更新自己的公開個人資料;成功後伺服器回一顆帶新暱稱的 token,直接換掉 */
export async function updateProfile(data) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(KEY)}` },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || '儲存失敗')
  localStorage.setItem(KEY, json.token)
  return json
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
