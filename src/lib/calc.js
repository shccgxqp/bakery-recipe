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

/* 一道食譜 → 成本 + 營養 + 缺料清單 */
export function calc(recipe, ING) {
  const rows = []
  let cost = 0
  const tot = Object.fromEntries(NUTR.map(([k]) => [k, 0]))
  let grams = 0
  const missing = []
  for (const [name, g, layer] of recipe.items) {
    const ing = ING[name]
    if (!ing) {
      missing.push(name)
      rows.push({ name, g, layer: layer || '', missing: true })
      continue
    }
    const c = (g * ing.packPrice) / ing.packGrams
    cost += c
    grams += g
    const n = {}
    for (const [k] of NUTR) {
      n[k] = ((ing.per100g[k] || 0) * g) / 100
      tot[k] += n[k]
    }
    rows.push({ name, g, layer: layer || '', cost: c, n })
  }
  return { rows, cost, tot, grams, missing }
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
