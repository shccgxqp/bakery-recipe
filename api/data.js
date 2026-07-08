/* GET /api/data — 公開讀取全部資料
   回傳 { ok, ingredients, recipes, settings },已過濾軟刪除。 */

import { getDb, cors } from './_lib/mongo.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' })
  try {
    const db = await getDb()
    const [ingredients, recipes, settings] = await Promise.all([
      db.collection('ingredients').find({ deletedAt: null }).sort({ name: 1 }).toArray(),
      db.collection('recipes').find({ deletedAt: null }).sort({ sortOrder: 1 }).toArray(),
      db.collection('settings').findOne({ _id: 'main' }),
    ])
    res.status(200).json({ ok: true, ingredients, recipes, settings })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
