import { useState } from 'react'
import Dialog from './Dialog.jsx'

export default function RecipeDialog({ recipe: r, ING, RCP, onSave, onClose }) {
  const [name, setName] = useState(r?.name || '')
  const [cat, setCat] = useState(r?.category || '')
  const [servings, setServings] = useState(r?.servings ?? 8)
  const [price, setPrice] = useState(r?.price ?? '')
  const [note, setNote] = useState(r?.note || '')
  const [items, setItems] = useState(r
    ? r.items.map(([n, g, layer]) => ({ n, g, layer: layer || '' }))
    : [{ n: '', g: '', layer: '' }, { n: '', g: '', layer: '' }])

  const cats = [...new Set(RCP.map(x => x.category).filter(Boolean))]
  const ingNames = Object.keys(ING)

  const setItem = (i, k, v) => setItems(prev => prev.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const delItem = i => setItems(prev => prev.filter((_, j) => j !== i))

  const submit = e => {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    const list = items
      .map(it => ({ n: it.n.trim(), g: parseFloat(it.g), layer: (it.layer || '').trim() }))
      .filter(it => it.n && it.g > 0)
      .map(it => (it.layer ? [it.n, it.g, it.layer] : [it.n, it.g]))
    if (!list.length) { alert('至少填一項材料與用量。'); return }
    onSave(r?.name || null, {
      name: nm,
      servings: Math.max(1, parseInt(servings) || 1),
      category: cat.trim() || '未分類',
      price: String(price).trim() === '' ? null : parseFloat(price),
      note: note.trim(),
      items: list,
    })
  }

  return (
    <Dialog
      title={r ? `編輯:${r.name}` : '新增食譜'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" form="recipe-form" className="btn btn-primary">儲存</button>
        </>
      }
    >
      <form id="recipe-form" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label>甜點名稱</label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>分類</label>
            <input value={cat} onChange={e => setCat(e.target.value)} list="cat-list" placeholder="例:蛋糕冷藏" />
            <datalist id="cat-list">{cats.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="field">
            <label>份數(切幾份/做幾顆)</label>
            <input type="number" min="1" step="1" value={servings} onChange={e => setServings(e.target.value)} required />
          </div>
          <div className="field">
            <label>售價/份(NT$,可空)</label>
            <input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>備註(模具、烤溫…)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="例:6吋模 · 170C 40M" />
          </div>
        </div>

        <div className="mb-2.5 mt-4.5 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          配方(材料 + 用量g + 層,層可空;例:餅乾層、奶油層、塔皮、內餡)
        </div>
        <datalist id="ing-list">{ingNames.map(n => <option key={n} value={n} />)}</datalist>
        <datalist id="layer-list">
          {[...new Set([...items.map(it => it.layer).filter(Boolean), '餅乾層', '奶油層', '塔皮', '內餡', '蛋糕體', '淋面'])]
            .map(l => <option key={l} value={l} />)}
        </datalist>
        {items.map((it, i) => (
          <div key={i} className="mb-2 grid grid-cols-[1fr_76px_96px_32px] gap-2">
            <input
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm"
              list="ing-list" placeholder="材料名稱" value={it.n}
              onChange={e => setItem(i, 'n', e.target.value)}
            />
            <input
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-right font-mono text-sm"
              type="number" min="0" step="0.1" placeholder="g" value={it.g}
              onChange={e => setItem(i, 'g', e.target.value)}
            />
            <input
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm"
              list="layer-list" placeholder="層" value={it.layer}
              onChange={e => setItem(i, 'layer', e.target.value)}
            />
            <button type="button" title="移除"
              className="rounded-md border border-line font-bold text-warn hover:border-warn"
              onClick={() => delItem(i)}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => setItems(p => [...p, { n: '', g: '', layer: p[p.length - 1]?.layer || '' }])}>
          ＋ 加一項材料
        </button>
      </form>
    </Dialog>
  )
}
