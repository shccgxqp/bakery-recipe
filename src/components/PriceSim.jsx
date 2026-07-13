import { useState, useMemo } from 'react'
import { fmt, calc } from '../lib/calc.js'

/* 材料漲價模擬:選一種材料 + 漲幅 %,列出受影響食譜的成本/利潤率變化 */
export default function PriceSim({ ING, RCP }) {
  const [ingId, setIngId] = useState('')
  const [pct, setPct] = useState(10)

  /* 只列出「我自己設過採購價」的材料——沒設價格的材料漲價模擬沒有意義
     (v4.6.0 起 packPrice 是私人資料,見 db-schema.md ingredientPrices) */
  const list = Object.values(ING)
    .filter(i => i.packPrice != null && i.packGrams)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))

  const rows = useMemo(() => {
    const ing = ING[ingId]
    const p = parseFloat(pct)
    if (!ing || !Number.isFinite(p)) return []
    return RCP.map(r => {
      const gramsUsed = r.items
        .filter(it => it.ingredientId === ingId)
        .reduce((a, it) => a + it.grams, 0)
      if (!(gramsUsed > 0)) return null
      const s = r.servings || 1
      const cost = calc(r, ING).cost
      const delta = ((gramsUsed * ing.packPrice) / (ing.packGrams || 1)) * (p / 100)
      const curPer = cost / s
      const newPer = (cost + delta) / s
      const margin = v => (r.price != null && r.price > 0 && v > 0 ? ((r.price - v) / v) * 100 : null)
      return { r, curPer, newPer, dPer: delta / s, m0: margin(curPer), m1: margin(newPer) }
    }).filter(Boolean).sort((a, b) => b.dPer - a.dPer)
  }, [ingId, pct, ING, RCP])

  const mtxt = m => (m == null ? '未定價' : `${fmt(m)}%`)

  return (
    <div className="mt-4 rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold tracking-[.08em] text-ink-soft">漲價模擬</span>
        <select value={ingId} onChange={e => setIngId(e.target.value)}
          className="rounded-md border border-line bg-white px-2 py-1.5 text-sm">
          <option value="">選擇材料…</option>
          {list.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
        </select>
        <span className="flex items-center gap-1">
          漲
          <input type="number" step="1" value={pct} onChange={e => setPct(e.target.value)}
            className="w-16 rounded-md border border-line bg-white px-2 py-1.5 text-right font-mono text-sm" />
          %
        </span>
        {ingId && ING[ingId] && (
          <span className="text-xs text-ink-soft">
            (目前 ${fmt(ING[ingId].packPrice)}/{fmt(ING[ingId].packGrams)}g →
            漲後 ${fmt(ING[ingId].packPrice * (1 + (parseFloat(pct) || 0) / 100), 1)})
          </span>
        )}
      </div>

      {ingId && (rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-soft">沒有食譜使用這個材料。</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="ltable">
            <thead>
              <tr>
                <th>食譜</th><th className="num">成本/份(現)</th><th className="num">成本/份(漲後)</th>
                <th className="num">增加</th><th className="num">利潤率 現→漲後</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, curPer, newPer, dPer, m0, m1 }) => (
                <tr key={r._id}>
                  <td>{r.name}</td>
                  <td className="num">${fmt(curPer, 1)}</td>
                  <td className="num">${fmt(newPer, 1)}</td>
                  <td className="num text-warn">+${fmt(dPer, 2)}</td>
                  <td className="num">
                    {mtxt(m0)} → <b className={m1 != null && m1 < m0 ? 'text-warn' : ''}>{mtxt(m1)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
