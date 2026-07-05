import { calc, fmt, groupByLayer } from './calc.js'

/* 把一道食譜轉成適合貼 LINE 的純文字購買清單 */
export function shoppingListText(r, ING) {
  const c = calc(r, ING)
  const s = r.servings || 1
  const sections = groupByLayer(c.rows)
  const showLayer = sections.length > 1 || sections[0]?.layer

  const lines = [`🍰 ${r.name}(${s} 份)`, '']
  lines.push('【購買清單】')
  for (const sec of sections) {
    if (showLayer) lines.push(`◆ ${sec.layer || '未分層'}`)
    for (const row of sec.rows) {
      lines.push(row.missing ? `${row.name}  ${fmt(row.g)}g(材料主檔缺價)` : `${row.name}  ${fmt(row.g)}g`)
    }
  }
  lines.push('')
  lines.push(`合計 ${fmt(c.grams)}g・成本 $${fmt(c.cost, 0)}(約 $${fmt(c.cost / s, 1)}/份)`)

  if (r.bakes?.length) lines.push('', `🔥 烘烤:${r.bakes.join(' → ')}`)
  if (r.note) lines.push(`📝 ${r.note}`)

  lines.push('', '—— 烘焙帳本 https://shccgxqp.github.io/bakery-recipe/')
  return lines.join('\n')
}

export function lineShareUrl(text) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`
}
