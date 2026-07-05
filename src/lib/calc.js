export const fmt = (n, d = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })

export const NUTR = [
  ['kcal', '熱量', '大卡', 0],
  ['protein', '蛋白質', '公克', 1],
  ['fat', '脂肪', '公克', 1],
  ['carbs', '碳水化合物', '公克', 1],
  ['sugar', '糖', '公克', 1],
]

/* 一道食譜 → 成本 + 營養 + 缺料清單 */
export function calc(recipe, ING) {
  const rows = []
  let cost = 0
  const tot = { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
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
      n[k] = (ing.per100g[k] * g) / 100
      tot[k] += n[k]
    }
    rows.push({ name, g, layer: layer || '', cost: c, n })
  }
  return { rows, cost, tot, grams, missing }
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
