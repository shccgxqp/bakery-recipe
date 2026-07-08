export const fmt = (n, d = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })

/* 台灣「包裝食品營養標示應遵行事項」8 項必要標示,依規定順序排列 */
export const NUTR = [
  ['kcal', '熱量', '大卡', 0],
  ['protein', '蛋白質', '公克', 1],
  ['fat', '脂肪', '公克', 1],
  ['satFat', '飽和脂肪', '公克', 1],
  ['transFat', '反式脂肪', '公克', 2],
  ['carbs', '碳水化合物', '公克', 1],
  ['sugar', '糖', '公克', 1],
  ['sodium', '鈉', '毫克', 0],
]

/* 一道食譜 → 成本 + 營養 + 缺料/無營養資料清單(ING 以 _id 為 key)
   材料 per100g === null 代表「尚無營養資料」,以 0 計並列入 noNutr 提示 */
export function calc(recipe, ING) {
  const rows = []
  let cost = 0
  const tot = Object.fromEntries(NUTR.map(([k]) => [k, 0]))
  let grams = 0
  const missing = []
  const noNutr = []
  for (const it of recipe.items) {
    const ing = ING[it.ingredientId]
    const g = it.grams
    if (!ing) {
      missing.push(it.ingredientId)
      rows.push({ name: '(材料已刪除)', g, layer: it.layer || '', missing: true })
      continue
    }
    const c = (g * ing.packPrice) / (ing.packGrams || 1)
    cost += c
    grams += g
    const n = {}
    for (const [k] of NUTR) {
      n[k] = ((ing.per100g?.[k] || 0) * g) / 100
      tot[k] += n[k]
    }
    if (ing.per100g == null) noNutr.push(ing.name)
    rows.push({ name: ing.name, g, layer: it.layer || '', cost: c, n })
  }
  return { rows, cost, tot, grams, missing, noNutr: [...new Set(noNutr)] }
}

/* 食譜過敏原標示 = 材料標註的聯集,即時計算、不落地儲存
   has:含有;may:可能含有(交叉污染,已含有的不重複列) */
export function allergenSummary(recipe, ING) {
  const has = new Set()
  const may = new Set()
  for (const it of recipe.items) {
    const ing = ING[it.ingredientId]
    if (!ing) continue
    for (const a of ing.allergens || []) has.add(a)
    for (const a of ing.mayContain || []) may.add(a)
  }
  for (const a of has) may.delete(a)
  return { has: [...has], may: [...may] }
}

/* 排序用指標:每份成本、利潤率(無售價回傳 null,排序時沉底) */
export function metrics(r, ING) {
  const c = calc(r, ING)
  const s = r.servings || 1
  const per = c.cost / s
  const margin = r.price != null && r.price > 0 && per > 0 ? ((r.price - per) / per) * 100 : null
  return { cost: c.cost, per, margin }
}

/* rows → 依「層」分段(保持原順序);全部無層 → 單一無名段 */
export function groupByLayer(rows) {
  const sections = []
  for (const row of rows) {
    const last = sections[sections.length - 1]
    if (!last || last.layer !== row.layer) sections.push({ layer: row.layer, rows: [row] })
    else last.rows.push(row)
  }
  return sections
}
