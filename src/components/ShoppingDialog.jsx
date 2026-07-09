import { useState, useMemo } from 'react'
import Dialog from './Dialog.jsx'
import { fmt } from '../lib/calc.js'
import { lineShareUrl } from '../lib/shareText.js'

/* 多食譜合併採購清單:勾選食譜 → 同材料用量合併,依材料分類排列(逛材料行順序) */
export default function ShoppingDialog({ ING, RCP, ingCatOrder, onClose }) {
  const [sel, setSel] = useState(() => new Set())
  const [copied, setCopied] = useState(false)

  const toggle = id => setSel(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const text = useMemo(() => {
    const picked = RCP.filter(r => sel.has(r._id))
    if (!picked.length) return ''
    /* 合併同材料 */
    const need = new Map() // ingredientId -> grams
    for (const r of picked)
      for (const it of r.items)
        need.set(it.ingredientId, (need.get(it.ingredientId) || 0) + it.grams)

    /* 依材料分類分組 */
    const rank = c => {
      if (c === '未分類') return 999
      const i = ingCatOrder.indexOf(c)
      return i < 0 ? 500 : i
    }
    const byCat = new Map()
    let total = 0
    for (const [id, g] of need) {
      const ing = ING[id]
      if (!ing) continue
      const cost = (g * ing.packPrice) / (ing.packGrams || 1)
      total += cost
      const cat = ing.category || '未分類'
      if (!byCat.has(cat)) byCat.set(cat, [])
      const unitTxt = ing.unitName && ing.unitGrams > 0 ? `${fmt(g / ing.unitGrams, 1)}${ing.unitName}` : null
      byCat.get(cat).push({ name: ing.name, g, cost, unitTxt })
    }
    const cats = [...byCat.keys()].sort((a, b) => rank(a) - rank(b))

    const lines = [`🛒 採購清單(${picked.length} 道:${picked.map(r => r.name).join('、')})`, '']
    for (const cat of cats) {
      lines.push(`◆ ${cat}`)
      for (const it of byCat.get(cat).sort((a, b) => b.g - a.g))
        lines.push(`${it.name}  ${it.unitTxt ? `${it.unitTxt}(${fmt(it.g)}g)` : `${fmt(it.g)}g`}($${fmt(it.cost, 0)})`)
    }
    lines.push('', `預估材料成本合計 $${fmt(total, 0)}`)
    lines.push('', '—— 烘焙帳本 https://shccgxqp.github.io/bakery-recipe/')
    return lines.join('\n')
  }, [sel, ING, RCP, ingCatOrder])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      alert('複製失敗,瀏覽器不支援剪貼簿權限。')
    }
  }

  return (
    <Dialog
      title="合併採購清單"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>關閉</button>
          <button type="button" className="btn" disabled={!text}
            onClick={() => window.open(lineShareUrl(text), '_blank', 'noopener,noreferrer')}>
            💬 傳到 LINE
          </button>
          <button type="button" className="btn btn-primary" disabled={!text} onClick={copy}>
            {copied ? '✓ 已複製' : '📋 複製清單'}
          </button>
        </>
      }
    >
      <p className="mb-2 text-[13px] text-ink-soft">勾選這次要做的甜點,同材料自動合併、依材料分類排好。</p>
      <div className="flex flex-wrap gap-1.5">
        {RCP.map(r => (
          <button key={r._id} type="button" onClick={() => toggle(r._id)}
            className={'rounded-full border px-3 py-1 text-[13px] ' +
              (sel.has(r._id) ? 'border-ink bg-yolk-soft font-bold' : 'border-line text-ink-soft hover:border-yolk')}>
            {r.name}
          </button>
        ))}
      </div>
      {text && (
        <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-white p-3 font-mono text-[12.5px] leading-relaxed">
          {text}
        </pre>
      )}
    </Dialog>
  )
}
