/* POST /api/save — 帶使用者 token 的寫入:逐筆 upsert + 軟刪除 + 復原
   (欄位不寫死,資料結構加新欄位不用改這支)
   header: Authorization: Bearer <token>
   body: {
     upserts: { ingredients: [完整文件], recipes: [完整文件], molds: [完整文件] },
     deletes: { ingredients: [_id], recipes: [_id], molds: [_id] },
     restores: { ingredients: [_id], recipes: [_id], molds: [_id] }
   }
   權限(見 docs/roadmap.md 第 2 項 phase 4):
   - 食譜:只有 ownerId 相符的本人能寫/刪/復原,站長(owner 身份)不例外。
   - 材料/模具:createdBy 相符的本人,或站長皆可(公開資料庫,站長能修正錯誤,
     站長編輯時蓋 lastEditedBy/lastEditedAt)。
   - 新文件一律放行,擁有權由伺服器蓋章,不信任 client payload。
   - 整個 payload 逐筆授權檢查為 pre-pass,任何一筆沒過就整批 403、不寫入任何東西。 */

import { getDb, cors, readBody } from './_lib/mongo.js'
import { resolveCallerChecked, canWriteRecipe, canWriteShared } from './_lib/auth.js'

const STRIP_FIELDS = ['_id', 'createdAt', 'updatedAt', 'deletedAt', 'ownerId', 'createdBy', 'lastEditedBy', 'lastEditedAt']

function stripDoc(d) {
  const rest = { ...d }
  for (const f of STRIP_FIELDS) delete rest[f]
  return rest
}

/* 逐筆授權檢查,回傳沒過的第一個錯誤訊息(null = 全部通過) */
async function authorizeBatch(col, ids, caller, authorize) {
  const valid = (ids || []).filter(i => typeof i === 'string' && i)
  if (!valid.length) return null
  const existing = await col.find({ _id: { $in: valid } }, { projection: { ownerId: 1, createdBy: 1 } }).toArray()
  for (const doc of existing) {
    if (!authorize(caller, doc)) return '沒有權限操作這筆資料'
  }
  return null
}

async function upsertDocs(col, docs, now, caller, { authorize, stampNew, stampOwnerEdit }) {
  let n = 0
  for (const d of docs) {
    if (!d || typeof d._id !== 'string' || !d._id) continue
    if (typeof d.name !== 'string' || !d.name.trim()) continue
    const existing = await col.findOne({ _id: d._id }, { projection: { ownerId: 1, createdBy: 1 } })
    const rest = stripDoc(d)
    const set = { ...rest, updatedAt: now }
    const setOnInsert = { createdAt: now, deletedAt: null }
    if (!existing) stampNew(setOnInsert, caller)
    else if (stampOwnerEdit && caller.kind === 'owner') Object.assign(set, stampOwnerEdit(caller, now))
    await col.updateOne({ _id: d._id }, { $set: set, $setOnInsert: setOnInsert }, { upsert: true })
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

async function restoreDocs(col, ids, now) {
  const valid = (ids || []).filter(i => typeof i === 'string' && i)
  if (!valid.length) return 0
  const r = await col.updateMany({ _id: { $in: valid } }, { $set: { deletedAt: null, updatedAt: now } })
  return r.modifiedCount
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  const body = readBody(req)
  try {
    const db = await getDb()
    const caller = await resolveCallerChecked(req, db)
    if (!caller) return res.status(401).json({ ok: false, error: '尚未登入' })
    const now = new Date()
    const cols = {
      ingredients: db.collection('ingredients'),
      recipes: db.collection('recipes'),
      molds: db.collection('molds'),
    }
    const authorizeOf = kind => (kind === 'recipes' ? canWriteRecipe : canWriteShared)

    /* pre-pass:整批逐筆授權檢查,任何一筆沒過就整批擋,不寫入任何東西 */
    for (const kind of ['ingredients', 'recipes', 'molds']) {
      const authorize = authorizeOf(kind)
      const upsertIds = (body.upserts?.[kind] || []).map(d => d?._id).filter(i => typeof i === 'string' && i)
      const err =
        (await authorizeBatch(cols[kind], upsertIds, caller, authorize)) ||
        (await authorizeBatch(cols[kind], body.deletes?.[kind], caller, authorize)) ||
        (await authorizeBatch(cols[kind], body.restores?.[kind], caller, authorize))
      if (err) return res.status(403).json({ ok: false, error: err })
    }

    const stampNewRecipe = (setOnInsert, c) => { setOnInsert.ownerId = c.id }
    const stampNewShared = (setOnInsert, c) => { setOnInsert.createdBy = c.id }
    const stampOwnerEdit = (c, now) => ({ lastEditedBy: c.id, lastEditedAt: now })

    res.status(200).json({
      ok: true,
      ingredients: await upsertDocs(cols.ingredients, body.upserts?.ingredients || [], now, caller, {
        authorize: canWriteShared, stampNew: stampNewShared, stampOwnerEdit,
      }),
      recipes: await upsertDocs(cols.recipes, body.upserts?.recipes || [], now, caller, {
        authorize: canWriteRecipe, stampNew: stampNewRecipe,
      }),
      molds: await upsertDocs(cols.molds, body.upserts?.molds || [], now, caller, {
        authorize: canWriteShared, stampNew: stampNewShared, stampOwnerEdit,
      }),
      deletedIngredients: await softDelete(cols.ingredients, body.deletes?.ingredients, now),
      deletedRecipes: await softDelete(cols.recipes, body.deletes?.recipes, now),
      deletedMolds: await softDelete(cols.molds, body.deletes?.molds, now),
      restoredIngredients: await restoreDocs(cols.ingredients, body.restores?.ingredients, now),
      restoredRecipes: await restoreDocs(cols.recipes, body.restores?.recipes, now),
      restoredMolds: await restoreDocs(cols.molds, body.restores?.molds, now),
    })
  } catch (e) {
    /* E11000 = 名稱撞到存活文件的唯一索引 */
    const msg = e.code === 11000 ? '名稱重複:已有同名的材料或食譜' : e.message
    res.status(e.code === 11000 ? 409 : 500).json({ ok: false, error: msg })
  }
}
