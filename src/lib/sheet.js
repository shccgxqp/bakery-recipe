/* Google Sheet 讀取:gviz CSV 端點(需「知道連結的任何人可檢視」以上) */

export function parseCSV(text) {
  const rows = []
  let row = [], cell = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQ = false
      } else cell += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') {
      row.push(cell); cell = ''
      if (row.some(c => c !== '')) rows.push(row)
      row = []
    } else if (ch !== '\r') cell += ch
  }
  row.push(cell)
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

const num = v => {
  const f = parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(f) ? f : 0
}

export async function loadFromSheet(sheetId) {
  const url = s =>
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(s)}`
  const [mRes, rRes, xRes] = await Promise.all([
    fetch(url('材料')), fetch(url('食譜')), fetch(url('食譜補充')),
  ])
  if (!mRes.ok || !rRes.ok) throw new Error(`sheet fetch ${mRes.status}/${rRes.status}`)

  const ing = {}
  for (const r of parseCSV(await mRes.text()).slice(1)) {
    const name = (r[0] || '').trim()
    if (!name) continue
    ing[name] = {
      packPrice: num(r[1]),
      packGrams: num(r[2]) || 100,
      per100g: {
        kcal: num(r[3]), protein: num(r[4]), fat: num(r[5]), carbs: num(r[6]), sugar: num(r[7]),
        satFat: num(r[8]), transFat: num(r[9]), sodium: num(r[10]),
      },
    }
  }

  const map = new Map()
  for (const r of parseCSV(await rRes.text()).slice(1)) {
    const name = (r[0] || '').trim()
    const mat = (r[5] || '').trim()
    const g = num(r[6])
    if (!name || !mat || !(g > 0)) continue
    if (!map.has(name))
      map.set(name, {
        name,
        servings: Math.max(1, Math.round(num(r[1])) || 1),
        category: (r[2] || '').trim() || '未分類',
        price: String(r[3]).trim() === '' ? null : num(r[3]),
        note: (r[4] || '').trim(),
        items: [],
      })
    const layer = (r[7] || '').trim()
    map.get(name).items.push(layer ? [mat, g, layer] : [mat, g])
  }

  if (!Object.keys(ing).length || !map.size) throw new Error('sheet empty')

  /* 食譜補充:步驟 / 烘烤 / 連結(分頁不存在或空白不影響主資料) */
  if (xRes.ok) {
    const lines = v => String(v || '').split('\n').map(s => s.trim()).filter(Boolean)
    for (const r of parseCSV(await xRes.text()).slice(1)) {
      const rec = map.get((r[0] || '').trim())
      if (!rec) continue
      rec.steps = lines(r[1])
      rec.bakes = lines(r[2])
      rec.links = lines(r[3]).map(s => {
        const i = s.lastIndexOf('|')
        return i > 0
          ? [s.slice(0, i).trim(), s.slice(i + 1).trim()]
          : [s, s]
      }).filter(([, u]) => /^https?:\/\//.test(u))
    }
  }

  return { ing, rcp: [...map.values()] }
}
