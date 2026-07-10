/* 寫入權限判斷(見 docs/roadmap.md 第 2 項 phase 4):
   身份可以來自站長密碼,或使用者登入 token(Authorization: Bearer)。
   密碼收斂成跟 role:"owner" token 同一種身份,不是獨立的無限後門——
   套用同一條「站長不能碰別人食譜內容」規則。 */

import { checkPassword } from './mongo.js'
import { verifyToken } from './authToken.js'

/* 站長帳號的識別值,跟 scripts/backfill-recipe-owner.mjs 標記你 20 道現有食譜
   用的 OWNER_ID 是同一個值——站長密碼登入時沒有 users 表身份可查(目前資料庫
   還沒有 role:"owner" 的使用者文件),用這個常數當站長的 ownerId/createdBy 值。 */
const OWNER_ID = 'shccgxqp@gmail.com'

export function resolveCaller(req, body) {
  if (checkPassword(body?.password)) return { kind: 'owner', id: OWNER_ID }
  const authz = req.headers['authorization'] || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) return null
  const payload = verifyToken(token, process.env.AUTH_SECRET)
  if (!payload) return null
  return payload.role === 'owner' ? { kind: 'owner', id: payload.email } : { kind: 'user', id: payload.email }
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
