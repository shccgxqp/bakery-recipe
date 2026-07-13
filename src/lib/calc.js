export const fmt = (n, d = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })

/* 台灣「包裝食品營養標示應遵行事項」8 項必要標示,依規定順序排列
   第 5 欄 = 每日參考值(熱量 2000 大卡基準);null = 參考值未訂定,標「＊」 */
export const NUTR = [
  ['kcal', '熱量', '大卡', 0, 2000],
  ['protein', '蛋白質', '公克', 1, 60],
  ['fat', '脂肪', '公克', 1, 60],
  ['satFat', '飽和脂肪', '公克', 1, 18],
  ['transFat', '反式脂肪', '公克', 2, null],
  ['carbs', '碳水化合物', '公克', 1, 300],
  ['sugar', '糖', '公克', 1, null],
  ['sodium', '鈉', '毫克', 0, 2000],
]

export const DV_NOTE = '每日參考值:熱量2000大卡、蛋白質60公克、脂肪60公克、飽和脂肪18公克、碳水化合物300公克、鈉2000毫克。'

/* 一道食譜 → 成本 + 營養 + 缺料/無營養資料清單(ING 以 _id 為 key)
   材料 per100g === null 代表「尚無營養資料」,以 0 計並列入 noNutr 提示 */
export function calc(recipe, ING) {
  const rows = []
  let cost = 0
  const tot = Object.fromEntries(NUTR.map(([k]) => [k, 0]))
  let grams = 0
  const missing = []
  const noNutr = []
  const noPrice = []
  for (const it of recipe.items) {
    const ing = ING[it.ingredientId]
    const g = it.grams
    if (!ing) {
      missing.push(it.ingredientId)
      rows.push({ name: '(材料已刪除)', g, layer: it.layer || '', missing: true })
      continue
    }
    /* packPrice/packGrams 是私人採購價(v4.6.0 起綁個人帳戶),沒登入或
       還沒填自己的採購價時 ing.packPrice 會是 undefined——當 0 成本計,
       跟 per100g:null 的「尚無營養資料」同一種警示邏輯,不是真的免費 */
    const hasPrice = ing.packPrice != null && ing.packGrams
    const c = hasPrice ? (g * ing.packPrice) / ing.packGrams : 0
    cost += c
    grams += g
    const n = {}
    for (const [k] of NUTR) {
      n[k] = ((ing.per100g?.[k] || 0) * g) / 100
      tot[k] += n[k]
    }
    if (ing.per100g == null) noNutr.push(ing.name)
    if (!hasPrice) noPrice.push(ing.name)
    rows.push({ name: ing.name, g, layer: it.layer || '', cost: c, noPrice: !hasPrice, n })
  }
  return { rows, cost, tot, grams, missing, noNutr: [...new Set(noNutr)], noPrice: [...new Set(noPrice)] }
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

/* rows → 依「層」分段,同名的層自動合併成一段(即使在原始材料清單裡不連續),
   段落順序 = 該層第一次出現的順序;全部無層 → 單一無名段 */
export function groupByLayer(rows) {
  const sections = new Map()
  for (const row of rows) {
    if (!sections.has(row.layer)) sections.set(row.layer, { layer: row.layer, rows: [] })
    sections.get(row.layer).rows.push(row)
  }
  return [...sections.values()]
}
