/* POST /api/deleted — 帶密碼讀取已軟刪除的文件(回收桶用)
   已刪除資料只給登入者看,跟編輯同一信任等級,不公開曝光。
   body: { password } → { ok, ingredients, recipes, molds }(皆為 deletedAt 不是 null 的文件) */

import { getDb, cors, checkPassword, readBody } from './_lib/mongo.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  const body = readBody(req)
  if (!checkPassword(body.password)) return res.status(401).json({ ok: false, error: '密碼錯誤' })
  try {
    const db = await getDb()
    const filter = { deletedAt: { $ne: null } }
    const [ingredients, recipes, molds] = await Promise.all([
      db.collection('ingredients').find(filter).sort({ deletedAt: -1 }).toArray(),
      db.collection('recipes').find(filter).sort({ deletedAt: -1 }).toArray(),
      db.collection('molds').find(filter).sort({ deletedAt: -1 }).toArray(),
    ])
    res.status(200).json({ ok: true, ingredients, recipes, molds })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
