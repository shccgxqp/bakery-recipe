/* 後端 API 存取:讀取公開,寫入帶密碼(伺服器以 SHA-256 雜湊比對) */

import { API_BASE } from '../config.js'

async function post(path, body) {
  const res = await fetch(API_BASE + path, { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

/* 全部資料:{ ingredients, recipes, settings },已過濾軟刪除 */
export async function loadData() {
  const res = await fetch(API_BASE + '/api/data')
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '讀取失敗')
  return j
}

/* 逐筆 upsert + 軟刪除
   upserts: { ingredients: [doc], recipes: [doc] }
   deletes: { ingredients: [_id], recipes: [_id] } */
export async function pushData(password, upserts, deletes) {
  const j = await post('/api/save', { password, upserts, deletes })
  if (!j.ok) throw new Error(j.error || '寫入失敗')
  return j
}

export async function verifyPassword(password) {
  const j = await post('/api/verify', { password })
  return !!j.ok
}
