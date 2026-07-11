/* GET /api/data — 公開讀取全部資料
   回傳 { ok, ingredients, recipes, molds, settings },已過濾軟刪除。
   帶合法登入 token(Authorization: Bearer)時,recipes 額外回自己的私人食譜;
   沒帶或 token 無效,recipes 只回 public !== false 的(欄位不存在 = 當公開)。
   注意:不是站長就看得到全部私人食譜——任何身份都只看得到自己的
   (見 docs/roadmap.md 第 2 項 phase 4,私人食譜可見範圍收斂)。 */

import { getDb, cors } from './_lib/mongo.js'
import { resolveCaller } from './_lib/auth.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    const db = await getDb()
    const caller = resolveCaller(req)
    const recipeFilter = caller
      ? { deletedAt: null, $or: [{ public: { $ne: false } }, { ownerId: caller.id }] }
      : { deletedAt: null, public: { $ne: false } }
    const [ingredients, recipes, molds, settings] = await Promise.all([
      db.collection('ingredients').find({ deletedAt: null }).sort({ name: 1 }).toArray(),
      db.collection('recipes').find(recipeFilter).sort({ sortOrder: 1 }).toArray(),
      db.collection('molds').find({ deletedAt: null }).sort({ name: 1 }).toArray(),
      db.collection('settings').findOne({ _id: 'main' }),
    ])
    res.status(200).json({ ok: true, ingredients, recipes, molds, settings })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
