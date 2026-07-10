/* GET /api/data — 公開讀取全部資料
   回傳 { ok, ingredients, recipes, settings },已過濾軟刪除。
   帶對站長密碼(header X-Edit-Password)時,recipes 額外回私人的;
   沒帶或密碼錯,recipes 只回 public !== false 的(欄位不存在 = 當公開)。 */

import { getDb, cors, checkPassword } from './_lib/mongo.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    const db = await getDb()
    const isEditor = checkPassword(req.headers['x-edit-password'])
    const recipeFilter = isEditor
      ? { deletedAt: null }
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
