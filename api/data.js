/* GET /api/data — 公開讀取全部資料
   回傳 { ok, ingredients, recipes, molds, settings },已過濾軟刪除。
   帶合法登入 token(Authorization: Bearer)時,recipes 額外回自己的私人食譜;
   沒帶或 token 無效,recipes 只回 public !== false 的。任何身份都只看得到
   自己的私人食譜(沒有站長特例)。

   隱私(v4.3.0):公開回應**不含任何 email**——ownerId/createdBy/lastEditedBy
   在伺服器換成暱稱與旗標才出門:
   - recipes:  ownerName(暱稱或「未命名烘焙師」)、mine(是不是我的)
   - ing/mold: creatorName、editorName(站長修正過才有)、mine、editedByMe
   前端顯示層權限(src/lib/permissions.js)吃這些旗標;真正的寫入授權
   仍在 api/save.js 以資料庫裡的 email 比對,不受影響。

   材料採購價(v4.6.0):packPrice/packGrams 不再是 ingredients 文件本身的欄位,
   改存 ingredientPrices(見 db-schema.md),只有登入者才會併回自己的價格——
   訪客、或還沒替這項材料設過價格的使用者,這兩個欄位就不存在(calc.js
   當「尚無資料」處理,列入 noPrice 警示,不是真的免費)。 */

import { getDb, cors } from './_lib/mongo.js'
import { resolveCaller } from './_lib/auth.js'

const OWNER_EMAIL = 'shccgxqp@gmail.com' // 舊資料 createdBy 缺欄位/= 'owner' 時的顯示歸屬

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
    const [ingredients, recipes, molds, settings, myPrices] = await Promise.all([
      db.collection('ingredients').find({ deletedAt: null }).sort({ name: 1 }).toArray(),
      db.collection('recipes').find(recipeFilter).sort({ sortOrder: 1 }).toArray(),
      db.collection('molds').find({ deletedAt: null }).sort({ name: 1 }).toArray(),
      db.collection('settings').findOne({ _id: 'main' }),
      caller
        ? db.collection('ingredientPrices').find({ ownerId: caller.id })
            .project({ ingredientId: 1, packPrice: 1, packGrams: 1 }).toArray()
        : [],
    ])
    const priceOf = Object.fromEntries(myPrices.map(p => [p.ingredientId, { packPrice: p.packPrice, packGrams: p.packGrams }]))

    /* email → 暱稱對照(只查回應中實際出現的 email) */
    const emails = new Set()
    for (const r of recipes) if (r.ownerId) emails.add(r.ownerId)
    for (const d of [...ingredients, ...molds]) {
      if (d.createdBy && d.createdBy !== 'owner') emails.add(d.createdBy)
      if (d.lastEditedBy && d.lastEditedBy !== 'owner') emails.add(d.lastEditedBy)
    }
    const users = emails.size
      ? await db.collection('users')
          .find({ email: { $in: [...emails] } })
          .project({ email: 1, displayName: 1 })
          .toArray()
      : []
    const nameOf = Object.fromEntries(users.map(u => [u.email, u.displayName]))
    const display = email => {
      if (!email || email === 'owner' || email === OWNER_EMAIL) {
        return nameOf[OWNER_EMAIL] || '站長'
      }
      return nameOf[email] || '未命名烘焙師'
    }

    const me = caller?.id || null
    const cleanRecipe = ({ ownerId, ...rest }) => ({
      ...rest,
      ownerName: display(ownerId),
      mine: !!me && ownerId === me,
    })
    const cleanShared = ({ createdBy, lastEditedBy, ...rest }) => ({
      ...rest,
      creatorName: display(createdBy),
      ...(lastEditedBy ? { editorName: display(lastEditedBy) } : {}),
      mine: !!me && createdBy === me,
      editedByMe: !!me && lastEditedBy === me,
    })

    res.status(200).json({
      ok: true,
      ingredients: ingredients.map(d => ({ ...cleanShared(d), ...priceOf[d._id] })),
      recipes: recipes.map(cleanRecipe),
      molds: molds.map(cleanShared),
      settings,
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
