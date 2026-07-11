/* GET /api/label?id=<recipeId> — 對外營養標示卡的專屬資料端點
   任何人可讀、不用登入、不受食譜公開/私人影響(站長分享私人食譜的標示卡
   給特定客人也要能開;食譜 id 是不可猜的 UUID)。
   關鍵:後端算好只回「標示需要的欄位」——成本、售價、配方克數、材料單價
   一律不出後端(「不顯示」不等於「不傳」,見 docs/design-guide.md)。 */

import { getDb, cors } from './_lib/mongo.js'
import { calc, NUTR, DV_NOTE, allergenSummary } from '../src/lib/calc.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' })
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) return res.status(400).json({ ok: false, error: '缺少食譜 id' })

  try {
    const db = await getDb()
    const r = await db.collection('recipes').findOne({ _id: id, deletedAt: null })
    if (!r) return res.status(404).json({ ok: false, error: '找不到這道食譜' })

    const ids = [...new Set((r.items || []).map(it => it.ingredientId))]
    const ings = await db.collection('ingredients')
      .find({ _id: { $in: ids } })
      .project({ name: 1, per100g: 1, allergens: 1, mayContain: 1, subIngredients: 1, packPrice: 1, packGrams: 1 })
      .toArray()
    const ING = Object.fromEntries(ings.map(i => [i._id, i]))

    const c = calc(r, ING)
    const al = allergenSummary(r, ING)
    const s = r.servings || 1
    const hasFinished = r.finishedGrams > 0
    const labelGrams = hasFinished ? r.finishedGrams : c.grams

    /* 內容物:同材料跨層先合併克數,再依重量遞減排列(法規慣例),
       複合材料以包裝成分欄原文展開 */
    const gramsById = {}
    for (const it of r.items || []) {
      if (ING[it.ingredientId]) gramsById[it.ingredientId] = (gramsById[it.ingredientId] || 0) + it.grams
    }
    const contents = Object.entries(gramsById)
      .sort((a, b) => b[1] - a[1])
      .map(([iid]) => {
        const ing = ING[iid]
        return ing.subIngredients ? `${ing.name}(${ing.subIngredients})` : ing.name
      })

    res.status(200).json({
      ok: true,
      label: {
        name: r.name,
        servings: s,
        perServingGrams: labelGrams / s,
        basis: hasFinished ? 'finished' : 'raw',
        nutrition: NUTR.map(([k, zh, unit, d, dv]) => ({
          key: k, zh, unit, dec: d,
          perServing: c.tot[k] / s,
          per100g: (c.tot[k] * 100) / Math.max(labelGrams, 1),
          dvPercent: dv ? (c.tot[k] / s / dv) * 100 : null,
        })),
        dvNote: DV_NOTE,
        allergens: al,
        contents,
        shelfLifeDays: r.shelfLifeDays || null,
        storage: r.storage || '',
        noNutr: c.noNutr,
        updatedAt: r.updatedAt || null,
      },
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
