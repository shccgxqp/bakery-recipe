/* 後端 API 存取:讀取公開,寫入帶密碼(伺服器以 SHA-256 雜湊比對) */

import { API_BASE } from '../config.js'

async function post(path, body) {
  const res = await fetch(API_BASE + path, { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

/* 全部資料:{ ingredients, recipes, settings },已過濾軟刪除。
   password 有值(已登入編輯)時帶 X-Edit-Password header,伺服器才會連私人食譜一起回。 */
export async function loadData(password) {
  const res = await fetch(API_BASE + '/api/data', {
    headers: password ? { 'X-Edit-Password': password } : {},
  })
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j
}

/* 逐筆 upsert + 軟刪除 + 復原
   upserts:  { ingredients: [doc], recipes: [doc] }
   deletes:  { ingredients: [_id], recipes: [_id] }
   restores: { ingredients: [_id], recipes: [_id] }
   auth: { password } 站長密碼,或 { token } 使用者登入 token(帶 Authorization: Bearer) */
export async function pushData(auth, upserts, deletes, restores) {
  const res = await fetch(API_BASE + '/api/save', {
    method: 'POST',
    headers: auth?.token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }
      : {},
    body: JSON.stringify({ password: auth?.password, upserts, deletes, restores }),
  })
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '寫入失敗')
  return j
}

export async function verifyPassword(password) {
  const j = await post('/api/verify', { password })
  return !!j.ok
}

/* 回收桶:已軟刪除的文件,{ ingredients, recipes, molds } */
export async function fetchDeleted(password) {
  const j = await post('/api/deleted', { password })
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j
}
