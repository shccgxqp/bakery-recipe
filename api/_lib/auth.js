/* 寫入權限判斷(見 docs/roadmap.md 第 2 項 phase 4):
   身份完全來自使用者登入 token(Authorization: Bearer)——沒有站長密碼後門,
   role:"owner" 純粹是 users 表上的欄位(見 scripts/promote-owner.mjs)。 */

import { verifyToken } from './authToken.js'

export function resolveCaller(req) {
  const authz = req.headers['authorization'] || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) return null
  const payload = verifyToken(token, process.env.AUTH_SECRET)
  if (!payload) return null
  return payload.role === 'owner' ? { kind: 'owner', id: payload.email } : { kind: 'user', id: payload.email }
}

/* 寫入路徑用的加強版:token 驗過之後再查一次 users 表——
   1. 停用帳號(suspended)即刻擋下,不用等 30 天 token 過期
   2. role 以資料庫為準(升權/降權即時生效,不看 token 裡的舊值)
   讀取端點(GET /api/data)維持無狀態 resolveCaller,省一次查詢。 */
export async function resolveCallerChecked(req, db) {
  const authz = req.headers['authorization'] || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) return null
  const payload = verifyToken(token, process.env.AUTH_SECRET)
  if (!payload?.email) return null
  const user = await db.collection('users').findOne({ email: payload.email })
  if (!user || user.suspended) return null
  const role = user.role || 'user'
  return role === 'owner' ? { kind: 'owner', id: user.email } : { kind: 'user', id: user.email }
}

/* 食譜:只有本人可寫(不論身份是站長還是一般使用者)——站長編輯自己的
   20 道現有食譜(ownerId 就是 OWNER_ID)照常可以,但不能碰別人的食譜。 */
export function canWriteRecipe(caller, doc) {
  return !!caller && doc.ownerId === caller.id
}

/* 材料/模具:本人或 owner 皆可(公開資料庫,站長能修正錯誤) */
export function canWriteShared(caller, doc) {
  if (!caller) return false
  if (caller.kind === 'owner') return true
  return doc.createdBy === caller.id
}
