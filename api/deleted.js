/* POST /api/deleted — 帶登入 token 讀取已軟刪除的文件(回收桶用)
   已刪除資料只給登入者看,跟編輯同一信任等級,不公開曝光。範圍比照
   canWriteRecipe/canWriteShared 的可見規則:食譜只看得到自己的,
   材料/模具站長看全部、一般使用者只看自己建立的。
   → { ok, ingredients, recipes, molds }(皆為 deletedAt 不是 null 的文件) */

import { getDb, cors } from './_lib/mongo.js'
import { resolveCallerChecked } from './_lib/auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    const db = await getDb()
    const caller = await resolveCallerChecked(req, db)
    if (!caller) return res.status(401).json({ ok: false, error: '尚未登入' })
    const sharedFilter = { deletedAt: { $ne: null }, ...(caller.kind === 'owner' ? {} : { createdBy: caller.id }) }
    const recipeFilter = { deletedAt: { $ne: null }, ownerId: caller.id }
    const [ingredients, recipes, molds] = await Promise.all([
      db.collection('ingredients').find(sharedFilter).sort({ deletedAt: -1 }).toArray(),
      db.collection('recipes').find(recipeFilter).sort({ deletedAt: -1 }).toArray(),
      db.collection('molds').find(sharedFilter).sort({ deletedAt: -1 }).toArray(),
    ])
    res.status(200).json({ ok: true, ingredients, recipes, molds })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
