import { useState } from 'react'
import Dialog from './Dialog.jsx'

const NUT_FIELDS = [
  ['kcal', '熱量(大卡)'],
  ['protein', '蛋白質(g)'],
  ['fat', '脂肪(g)'],
  ['satFat', '飽和脂肪(g)'],
  ['transFat', '反式脂肪(g)'],
  ['carbs', '碳水化合物(g)'],
  ['sugar', '糖(g)'],
  ['sodium', '鈉(mg)'],
]

export default function IngredientDialog({ name: orig, ING, onSave, onClose }) {
  const ing = orig ? ING[orig] : null
  const [name, setName] = useState(orig || '')
  const [price, setPrice] = useState(ing?.packPrice ?? '')
  const [grams, setGrams] = useState(ing?.packGrams ?? '')
  const [nut, setNut] = useState(
    Object.fromEntries(NUT_FIELDS.map(([k]) => [k, ing?.per100g[k] ?? 0]))
  )

  const submit = e => {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    const v = x => { const f = parseFloat(x); return Number.isFinite(f) ? f : 0 }
    onSave(orig, nm, {
      packPrice: v(price),
      packGrams: Math.max(0.1, v(grams)),
      per100g: Object.fromEntries(NUT_FIELDS.map(([k]) => [k, v(nut[k])])),
    })
  }

  return (
    <Dialog
      title={orig ? `編輯:${orig}` : '新增材料'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" form="ing-form" className="btn btn-primary">儲存</button>
        </>
      }
    >
      <form id="ing-form" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label>材料名稱</label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>採購價(NT$)</label>
            <input type="number" min="0" step="0.1" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
          <div className="field">
            <label>採購重量(g)</label>
            <input type="number" min="0.1" step="0.1" value={grams} onChange={e => setGrams(e.target.value)} required />
          </div>
        </div>
        <div className="mb-2.5 mt-4.5 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          每 100g 營養成分
        </div>
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          {NUT_FIELDS.map(([k, label]) => (
            <div className="field" key={k}>
              <label>{label}</label>
              <input type="number" min="0" step="0.01" value={nut[k]}
                onChange={e => setNut(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </form>
    </Dialog>
  )
}
