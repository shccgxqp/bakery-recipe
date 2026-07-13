/* 後端 API 存取:讀取公開,寫入帶使用者登入 token(Authorization: Bearer) */

import { API_BASE } from '../config.js'

function authHeaders(token) {
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : {}
}

async function post(path, token, body) {
  const res = await fetch(API_BASE + path, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
  return res.json()
}

/* 全部資料:{ ingredients, recipes, molds, settings },已過濾軟刪除。
   token 有值時帶 Authorization header,伺服器才會連自己的私人食譜一起回。 */
export async function loadData(token) {
  const res = await fetch(API_BASE + '/api/data', { headers: authHeaders(token) })
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j
}

/* 逐筆 upsert + 軟刪除 + 復原
   upserts:  { ingredients: [doc], recipes: [doc], molds: [doc] }
   deletes:  { ingredients: [_id], recipes: [_id], molds: [_id] }
   restores: { ingredients: [_id], recipes: [_id], molds: [_id] }
   prices:   [{ ingredientId, packPrice, packGrams }](私人採購價,見 db-schema.md) */
export async function pushData(token, upserts, deletes, restores, prices) {
  const j = await post('/api/save', token, { upserts, deletes, restores, prices })
  if (!j.ok) throw new Error(j.error || '寫入失敗')
  return j
}

/* 回收桶:已軟刪除的文件,{ ingredients, recipes, molds } */
export async function fetchDeleted(token) {
  const j = await post('/api/deleted', token, {})
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j
}

/* 對外營養標示卡:單筆、公開、不含成本/配方欄位(後端算好才回) */
export async function fetchLabel(id) {
  const res = await fetch(API_BASE + '/api/label?id=' + encodeURIComponent(id))
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j.label
}

/* 站長專用:使用者管理 */
export async function fetchAdminUsers(token) {
  const res = await fetch(API_BASE + '/api/admin/users', { headers: authHeaders(token) })
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j.users
}

export async function updateAdminUser(token, patch) {
  const j = await post('/api/admin/users', token, patch)
  if (!j.ok) throw new Error(j.error || '更新失敗')
  return j
}
