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

/* 逐筆 upsert + 軟刪除 + 復原
   upserts:  { ingredients: [doc], recipes: [doc] }
   deletes:  { ingredients: [_id], recipes: [_id] }
   restores: { ingredients: [_id], recipes: [_id] } */
export async function pushData(password, upserts, deletes, restores) {
  const j = await post('/api/save', { password, upserts, deletes, restores })
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
