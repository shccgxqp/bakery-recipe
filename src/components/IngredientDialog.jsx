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

/* 過敏原勾選群(含有 / 可能含有 共用) */
function AllergenPicker({ list, value, onChange }) {
  const toggle = a =>
    onChange(value.includes(a) ? value.filter(x => x !== a) : [...value, a])
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(a => (
        <button key={a} type="button" onClick={() => toggle(a)}
          className={'rounded-full border px-2.5 py-0.5 text-[12px] ' +
            (value.includes(a) ? 'border-ink bg-yolk-soft font-bold' : 'border-line text-ink-soft hover:border-yolk')}>
          {a}
        </button>
      ))}
    </div>
  )
}

export default function IngredientDialog({ ing, allergenList, ingCatOrder, onSave, onClose }) {
  const [name, setName] = useState(ing?.name || '')
  const [category, setCategory] = useState(ing?.category || '')
  const [brand, setBrand] = useState(ing?.brand || '')
  const [spec, setSpec] = useState(ing?.spec || '')
  const [saving, setSaving] = useState(false)
  const [price, setPrice] = useState(ing?.packPrice ?? '')
  const [grams, setGrams] = useState(ing?.packGrams ?? '')
  const [unitName, setUnitName] = useState(ing?.unitName || '')
  const [unitGrams, setUnitGrams] = useState(ing?.unitGrams ?? '')
  const [noData, setNoData] = useState(ing ? ing.per100g == null : false)
  const [nut, setNut] = useState(
    Object.fromEntries(NUT_FIELDS.map(([k]) => [k, ing?.per100g?.[k] ?? 0]))
  )
  const [allergens, setAllergens] = useState(ing?.allergens || [])
  const [mayContain, setMayContain] = useState(ing?.mayContain || [])
  const [subIngredients, setSubIngredients] = useState(ing?.subIngredients || '')
  const [labelDate, setLabelDate] = useState(ing?.labelDate || '')
  const [note, setNote] = useState(ing?.note || '')

  const submit = async e => {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    const v = x => { const f = parseFloat(x); return Number.isFinite(f) ? f : 0 }
    setSaving(true)
    try {
      await onSave(ing || null, {
        name: nm,
        category: category.trim() || '未分類',
        brand: brand.trim(),
        spec: spec.trim(),
        packPrice: v(price),
        packGrams: Math.max(0.1, v(grams)),
        unitName: unitName.trim(),
        unitGrams: unitName.trim() ? v(unitGrams) : null,
        per100g: noData ? null : Object.fromEntries(NUT_FIELDS.map(([k]) => [k, v(nut[k])])),
        allergens,
        mayContain,
        subIngredients: subIngredients.trim(),
        labelDate: labelDate || null,
        note: note.trim(),
      })
    } catch (err) {
      alert('儲存失敗:' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={ing ? `編輯:${ing.name}` : '新增材料'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>取消</button>
          <button type="submit" form="ing-form" className="btn btn-primary" disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
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
            <label>分類</label>
            <input value={category} onChange={e => setCategory(e.target.value)} list="ing-cat-list"
              placeholder="例:乳製品" />
            <datalist id="ing-cat-list">
              {ingCatOrder.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="field">
            <label>廠牌(可空)</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="例:依思尼" />
          </div>
          <div className="field">
            <label>規格/型號(可空)</label>
            <input value={spec} onChange={e => setSpec(e.target.value)} placeholder="例:35.1% 乳脂" />
          </div>
          <div className="field">
            <label>採購價(NT$)</label>
            <input type="number" min="0" step="0.1" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
          <div className="field">
            <label>採購重量(g)</label>
            <input type="number" min="0.1" step="0.1" value={grams} onChange={e => setGrams(e.target.value)} required />
          </div>
          <div className="field">
            <label>單位名稱(可空;例:顆、大匙、片)</label>
            <input value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="填了才會開放食譜用「數量」輸入" />
          </div>
          <div className="field">
            <label>單位換算克數(1{unitName || '單位'} = 幾克)</label>
            <input type="number" min="0" step="0.1" value={unitGrams} onChange={e => setUnitGrams(e.target.value)}
              disabled={!unitName.trim()} placeholder="例:55(1顆蛋≈55g)" />
          </div>
        </div>

        <div className="mb-2.5 mt-4.5 flex items-baseline justify-between border-b border-ink pb-1">
          <span className="text-xs font-bold tracking-[.12em] text-ink-soft">每 100g 營養成分(照包裝標示抄)</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-soft">
            <input type="checkbox" checked={noData} onChange={e => setNoData(e.target.checked)} />
            尚無資料(顯示「無資料」而非 0)
          </label>
        </div>
        {!noData && (
          <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
            {NUT_FIELDS.map(([k, label]) => (
              <div className="field" key={k}>
                <label>{label}</label>
                <input type="number" min="0" step="0.01" value={nut[k]}
                  onChange={e => setNut(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}

        <div className="mb-2.5 mt-4.5 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          過敏原:本產品含有(依包裝標示勾選)
        </div>
        <AllergenPicker list={allergenList} value={allergens} onChange={setAllergens} />

        <div className="mb-2.5 mt-4 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          過敏原:可能含有(產線交叉污染警語,包裝有寫才勾)
        </div>
        <AllergenPicker list={allergenList} value={mayContain} onChange={setMayContain} />

        <div className="mb-2.5 mt-4 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          成分(照包裝「成分」欄原文抄,含添加物寫法;食譜內容物標示會展開它)
        </div>
        <textarea rows={2} value={subIngredients} onChange={e => setSubIngredients(e.target.value)}
          placeholder="例:碳酸氫鈉、酸性焦磷酸鈉、玉米澱粉"
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm" />

        <div className="mt-3 grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field">
            <label>標示登記日(這批營養/成分資料哪天抄的)</label>
            <input type="date" value={labelDate || ''} onChange={e => setLabelDate(e.target.value)} />
          </div>
          <div className="field">
            <label>備註(購買通路…,可空)</label>
            <input value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
      </form>
    </Dialog>
  )
}
