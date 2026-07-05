/* 匯出 data/*.js 檔(給沒接 Apps Script 時把修改帶回 repo 用) */
const jsN = v => (Number.isFinite(v) ? String(+(+v).toFixed(4)) : '0')

function download(fname, text) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript;charset=utf-8' }))
  a.download = fname
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportFiles(ING, RCP) {
  const d = new Date().toISOString().slice(0, 10)
  let ing = `// 材料主檔 — 由烘焙帳本網頁匯出 ${d}\n\nexport const INGREDIENTS = {\n`
  ing += Object.entries(ING)
    .map(([n, i]) =>
      `  "${n}": {\n    packPrice: ${jsN(i.packPrice)}, packGrams: ${jsN(i.packGrams)},\n` +
      `    per100g: { kcal: ${jsN(i.per100g.kcal)}, protein: ${jsN(i.per100g.protein)}, fat: ${jsN(i.per100g.fat)}, carbs: ${jsN(i.per100g.carbs)}, sugar: ${jsN(i.per100g.sugar)} }\n  }`)
    .join(',\n')
  ing += '\n};\n'

  let rec = `// 甜點食譜 — 由烘焙帳本網頁匯出 ${d}\n\nexport const RECIPES = [\n`
  rec += RCP.map(r =>
    `  {\n    name: "${r.name}",\n    servings: ${r.servings},\n    category: "${r.category || '未分類'}",\n` +
    `    price: ${r.price == null ? 'null' : jsN(r.price)},\n    note: "${(r.note || '').replace(/"/g, '\\"')}",\n` +
    `    items: [\n${r.items.map(([n, g, layer]) => (layer ? `      ["${n}", ${jsN(g)}, "${layer}"]` : `      ["${n}", ${jsN(g)}]`)).join(',\n')}\n    ]\n  }`)
    .join(',\n')
  rec += '\n];\n'

  download('base.js', ing + '\n' + rec)
  alert('已下載 base.js,取代 repo 的 src/data/base.js 後 commit + push 即可永久保存。')
}
