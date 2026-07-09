/* POST /api/save — 帶密碼的寫入:逐筆 upsert + 軟刪除
   (欄位不寫死,資料結構加新欄位不用改這支)
   body: {
     password,
     upserts: { ingredients: [完整文件], recipes: [完整文件] },
     deletes: { ingredients: [_id], recipes: [_id] }
   } */

import { getDb, cors, checkPassword, readBody } from './_lib/mongo.js'

async function upsertDocs(col, docs, now) {
  let n = 0
  for (const d of docs) {
    if (!d || typeof d._id !== 'string' || !d._id) continue
    if (typeof d.name !== 'string' || !d.name.trim()) continue
    /* 時間戳與刪除標記由伺服器管,不信任 client 帶來的值 */
    const { _id, createdAt, updatedAt, deletedAt, ...rest } = d
    await col.updateOne(
      { _id },
      { $set: { ...rest, updatedAt: now }, $setOnInsert: { createdAt: now, deletedAt: null } },
      { upsert: true }
    )
    n++
  }
  return n
}

async function softDelete(col, ids, now) {
  const valid = (ids || []).filter(i => typeof i === 'string' && i)
  if (!valid.length) return 0
  const r = await col.updateMany({ _id: { $in: valid } }, { $set: { deletedAt: now, updatedAt: now } })
  return r.modifiedCount
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  const body = readBody(req)
  if (!checkPassword(body.password)) return res.status(401).json({ ok: false, error: '密碼錯誤' })
  try {
    const db = await getDb()
    const now = new Date()
    res.status(200).json({
      ok: true,
      ingredients: await upsertDocs(db.collection('ingredients'), body.upserts?.ingredients || [], now),
      recipes: await upsertDocs(db.collection('recipes'), body.upserts?.recipes || [], now),
      molds: await upsertDocs(db.collection('molds'), body.upserts?.molds || [], now),
      deletedIngredients: await softDelete(db.collection('ingredients'), body.deletes?.ingredients, now),
      deletedRecipes: await softDelete(db.collection('recipes'), body.deletes?.recipes, now),
      deletedMolds: await softDelete(db.collection('molds'), body.deletes?.molds, now),
    })
  } catch (e) {
    /* E11000 = 名稱撞到存活文件的唯一索引 */
    const msg = e.code === 11000 ? '名稱重複:已有同名的材料或食譜' : e.message
    res.status(e.code === 11000 ? 409 : 500).json({ ok: false, error: msg })
  }
}
