/* POST /api/save — 帶使用者 token 的寫入:逐筆 upsert + 軟刪除 + 復原
   (欄位不寫死,資料結構加新欄位不用改這支)
   header: Authorization: Bearer <token>
   body: {
     upserts: { ingredients: [完整文件], recipes: [完整文件], molds: [完整文件] },
     deletes: { ingredients: [_id], recipes: [_id], molds: [_id] },
     restores: { ingredients: [_id], recipes: [_id], molds: [_id] },
     prices: [{ ingredientId, packPrice, packGrams }]
   }
   權限(見 docs/roadmap.md 第 2 項 phase 4):
   - 食譜:只有 ownerId 相符的本人能寫/刪/復原,站長(owner 身份)不例外。
   - 材料/模具:createdBy 相符的本人,或站長皆可(公開資料庫,站長能修正錯誤,
     站長編輯時蓋 lastEditedBy/lastEditedAt)。
   - 新文件一律放行,擁有權由伺服器蓋章,不信任 client payload。
   - prices(材料採購價,私人資料,見 db-schema.md):一律寫呼叫者自己的
     ingredientPrices 文件,_id/ownerId 伺服器組,不接受 client 指定要寫誰的,
     不需要額外授權檢查(你只可能寫到自己的那筆)。
   - 整個 payload 逐筆授權檢查為 pre-pass,任何一筆沒過就整批 403、不寫入任何東西。 */

import { randomUUID } from 'node:crypto'
import { getDb, cors, readBody } from './_lib/mongo.js'
import { resolveCallerChecked, canWriteRecipe, canWriteShared } from './_lib/auth.js'

const STRIP_FIELDS = ['_id', 'createdAt', 'updatedAt', 'deletedAt', 'ownerId', 'createdBy', 'lastEditedBy', 'lastEditedAt']
const INGREDIENT_VERSION_FIELDS = [
  'name', 'category', 'brand', 'spec', 'per100g', 'allergens', 'mayContain',
  'subIngredients', 'labelDate', 'note', 'evidence', 'verification',
]

function stripDoc(d) {
  const rest = { ...d }
  for (const f of STRIP_FIELDS) delete rest[f]
  return rest
}

function sameValue(left, right) {
  const stable = value => {
    if (Array.isArray(value)) return value.map(stable)
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
    return value ?? null
  }
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right))
}

function ingredientVersionChanged(previous, next) {
  return INGREDIENT_VERSION_FIELDS.some(field => !sameValue(previous[field], next[field]))
}

function ingredientSnapshot(doc, archivedAt) {
  return {
    id: randomUUID(),
    archivedAt,
    reason: '材料資料更新',
    ...Object.fromEntries(INGREDIENT_VERSION_FIELDS.map(field => [field, doc[field] ?? null])),
  }
}

function sanitizeIngredientEvidence(entries) {
  const allowedTypes = new Set(['package_label', 'manufacturer', 'official_db', 'user_input', 'unknown'])
  const allowedScopes = new Set(['identity', 'nutrition', 'ingredients', 'allergens'])
  return (Array.isArray(entries) ? entries : []).slice(0, 10).map(entry => {
    const url = String(entry?.url || '').trim()
    return {
      id: typeof entry?.id === 'string' && entry.id ? entry.id.slice(0, 100) : randomUUID(),
      type: allowedTypes.has(entry?.type) ? entry.type : 'unknown',
      scopes: (Array.isArray(entry?.scopes) ? entry.scopes : []).filter(scope => allowedScopes.has(scope)),
      title: String(entry?.title || '').trim().slice(0, 200),
      url: /^https?:\/\//i.test(url) ? url.slice(0, 1000) : '',
      reference: String(entry?.reference || '').trim().slice(0, 200),
      checkedAt: /^\d{4}-\d{2}-\d{2}$/.test(entry?.checkedAt || '') ? entry.checkedAt : null,
      confidence: ['high', 'medium', 'pending'].includes(entry?.confidence) ? entry.confidence : 'pending',
    }
  }).filter(entry => entry.title || entry.url || entry.reference)
}

function sanitizeIngredientVerification(value) {
  return {
    status: ['pending', 'verified', 'needs_review', 'outdated'].includes(value?.status) ? value.status : 'pending',
    latestVerifiedAt: /^\d{4}-\d{2}-\d{2}$/.test(value?.latestVerifiedAt || '') ? value.latestVerifiedAt : null,
  }
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

async function upsertDocs(col, docs, now, caller, { authorize, stampNew, stampOwnerEdit, keepIngredientHistory = false }) {
  let n = 0
  for (const d of docs) {
    if (!d || typeof d._id !== 'string' || !d._id) continue
    if (typeof d.name !== 'string' || !d.name.trim()) continue
    const existing = await col.findOne(
      { _id: d._id },
      { projection: keepIngredientHistory ? { history: 1, ...Object.fromEntries(INGREDIENT_VERSION_FIELDS.map(field => [field, 1])), ownerId: 1, createdBy: 1 } : { ownerId: 1, createdBy: 1 } },
    )
    const rest = stripDoc(d)
    /* history 是伺服器管理的不可變版本紀錄，不能由 client 覆寫或捏造。 */
    if (keepIngredientHistory) {
      delete rest.history
      rest.evidence = sanitizeIngredientEvidence(rest.evidence)
      rest.verification = sanitizeIngredientVerification(rest.verification)
      if (existing && ingredientVersionChanged(existing, rest)) {
        rest.history = [...(existing.history || []), ingredientSnapshot(existing, now)]
      } else if (existing?.history) {
        rest.history = existing.history
      }
    }
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

/* 材料採購價(私人):_id/ownerId 一律用呼叫者自己的身份組,不信任 client,
   天然防止寫到別人的價格,不需要額外授權檢查 */
async function upsertPrices(col, entries, now, caller) {
  let n = 0
  for (const p of entries || []) {
    if (!p || typeof p.ingredientId !== 'string' || !p.ingredientId) continue
    const packPrice = Number(p.packPrice)
    const packGrams = Number(p.packGrams)
    if (!Number.isFinite(packPrice) || packPrice < 0) continue
    if (!Number.isFinite(packGrams) || packGrams <= 0) continue
    const _id = `${caller.id}:${p.ingredientId}`
    await col.updateOne(
      { _id },
      { $set: { ingredientId: p.ingredientId, ownerId: caller.id, packPrice, packGrams, updatedAt: now },
        $setOnInsert: { createdAt: now } },
      { upsert: true },
    )
    n++
  }
  return n
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
      ingredientPrices: db.collection('ingredientPrices'),
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
        authorize: canWriteShared, stampNew: stampNewShared, stampOwnerEdit, keepIngredientHistory: true,
      }),
      recipes: await upsertDocs(cols.recipes, body.upserts?.recipes || [], now, caller, {
        authorize: canWriteRecipe, stampNew: stampNewRecipe,
      }),
      molds: await upsertDocs(cols.molds, body.upserts?.molds || [], now, caller, {
        authorize: canWriteShared, stampNew: stampNewShared, stampOwnerEdit,
      }),
      prices: await upsertPrices(cols.ingredientPrices, body.prices, now, caller),
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
