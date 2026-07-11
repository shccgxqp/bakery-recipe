import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chip from './Chip.jsx'
import IngredientPicker from './IngredientPicker.jsx'
import { toast } from '../lib/toast.js'
import { recipePath } from '../lib/slug.js'

const SECTIONS = [
  ['sec-basic', '基本資料'],
  ['sec-items', '配方'],
  ['sec-steps', '步驟與烘烤'],
  ['sec-label', '標示與狀態'],
]

function SectionTitle({ id, children }) {
  return (
    <div id={id} className="mb-2.5 mt-6 scroll-mt-16 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
      {children}
    </div>
  )
}

/* 食譜新增/編輯整頁(/r/new、/r/:id/edit),取代 RecipeDialog。
   單頁分段落+頂部錨點導覽(2026-07-11 拍板,不做 wizard);
   配方改搜尋式下拉(IngredientPicker),items 直接存 ingredientId,
   不再有「存檔才發現材料找不到」的問題。克為唯一真相,qty 只是輸入輔助。 */
export default function RecipeEditView({ recipe: r, ING, RCP, molds, onSave, onQuickAddIngredient, ingCatOrder }) {
  const navigate = useNavigate()
  const [name, setName] = useState(r?.name || '')
  const [cat, setCat] = useState(r?.category || '')
  const [servings, setServings] = useState(r?.servings ?? 8)
  const [price, setPrice] = useState(r?.price ?? '')
  const [note, setNote] = useState(r?.note || '')
  const [items, setItems] = useState(r
    ? r.items.map(it => ({ ingredientId: it.ingredientId, g: it.grams, layer: it.layer || '', qty: '' }))
    : [{ ingredientId: null, g: '', layer: '', qty: '' }, { ingredientId: null, g: '', layer: '', qty: '' }])
  const [steps, setSteps] = useState(r?.steps?.join('\n') || '')
  const [bakes, setBakes] = useState(r?.bakes?.join('\n') || '')
  const [links, setLinks] = useState(
    r?.links?.map(l => (l.title === l.url ? l.url : `${l.title} | ${l.url}`)).join('\n') || ''
  )
  const [finishedGrams, setFinishedGrams] = useState(r?.finishedGrams ?? '')
  const [shelfLifeDays, setShelfLifeDays] = useState(r?.shelfLifeDays ?? '')
  const [storage, setStorage] = useState(r?.storage || '')
  const [moldId, setMoldId] = useState(r?.moldId || '')
  const [isPublic, setIsPublic] = useState(r?.public !== false)
  const [saving, setSaving] = useState(false)

  const cats = [...new Set(RCP.map(x => x.category).filter(Boolean))]

  const setItem = (i, k, v) => setItems(prev => prev.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const setQty = (i, qty) => setItems(prev => prev.map((it, j) => {
    if (j !== i) return it
    const ing = ING[it.ingredientId]
    const g = ing?.unitGrams > 0 && qty !== '' ? +(parseFloat(qty) * ing.unitGrams).toFixed(1) : it.g
    return { ...it, qty, g }
  }))
  const delItem = i => setItems(prev => prev.filter((_, j) => j !== i))

  const cancel = () => navigate(r ? recipePath(r) : '/r')
  const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const submit = async e => {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    const rows = items
      .map(it => ({ ingredientId: it.ingredientId, grams: parseFloat(it.g), layer: (it.layer || '').trim() }))
      .filter(it => it.ingredientId && it.grams > 0)
    if (!rows.length) { toast('至少填一項材料與用量。', { type: 'error' }); jump('sec-items'); return }
    const lines = t => t.split('\n').map(s => s.trim()).filter(Boolean)
    const num = v => { const f = parseFloat(v); return Number.isFinite(f) && f > 0 ? f : null }
    setSaving(true)
    try {
      await onSave(r || null, {
        name: nm,
        servings: Math.max(1, parseInt(servings) || 1),
        category: cat.trim() || '未分類',
        price: String(price).trim() === '' ? null : parseFloat(price),
        note: note.trim(),
        steps: lines(steps),
        bakes: lines(bakes),
        links: lines(links).map(s => {
          const i = s.lastIndexOf('|')
          return i > 0
            ? { title: s.slice(0, i).trim(), url: s.slice(i + 1).trim() }
            : { title: s, url: s }
        }).filter(l => /^https?:\/\//.test(l.url)),
        items: rows,
        finishedGrams: num(finishedGrams),
        shelfLifeDays: num(shelfLifeDays),
        storage: storage.trim(),
        moldId: moldId || null,
        public: isPublic,
      })
    } catch (err) {
      toast('儲存失敗:' + err.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      {/* sticky 錨點導覽 + 取消/儲存 */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-1.5 border-b-[3px] border-ink bg-paper px-1 pb-2.5 pt-3">
        <h2 className="mr-2 font-serif text-[22px] font-bold">{r ? `編輯:${r.name}` : '新增食譜'}</h2>
        <span className="flex flex-wrap gap-1">
          {SECTIONS.map(([id, zh]) => (
            <Chip key={id} size="sm" onClick={() => jump(id)}>{zh}</Chip>
          ))}
        </span>
        <span className="ml-auto flex gap-2">
          <button type="button" className="btn btn-sm" onClick={cancel} disabled={saving}>取消</button>
          <button type="submit" form="recipe-form" className="btn btn-sm btn-primary" disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </span>
      </div>

      <form id="recipe-form" onSubmit={submit}>
        <SectionTitle id="sec-basic">基本資料</SectionTitle>
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
            <label>備註(口味、注意事項…)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="例:6吋模" />
          </div>
          <div className="field sm:col-span-2">
            <label>模具(綁定後可用「⇄ 換算」換模具)</label>
            <select value={moldId} onChange={e => setMoldId(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm">
              <option value="">未指定(到「模具庫」新增)</option>
              {(molds || []).map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <SectionTitle id="sec-items">配方(材料 + 用量g + 層,層可空;例:餅乾層、奶油層、塔皮、內餡)</SectionTitle>
        <p className="mb-2 text-[12px] text-ink-soft">
          用量一律以<b>克</b>儲存與顯示;材料有設「單位換算」(如全蛋=顆)時,「數量」欄填「3」自動算成克數。
          搜尋不到材料?打完名稱會出現「＋ 快速新增」。
        </p>
        <datalist id="layer-list">
          {[...new Set([...items.map(it => it.layer).filter(Boolean), '餅乾層', '奶油層', '塔皮', '內餡', '蛋糕體', '淋面'])]
            .map(l => <option key={l} value={l} />)}
        </datalist>
        {items.map((it, i) => {
          const ing = ING[it.ingredientId]
          const hasUnit = ing?.unitName && ing?.unitGrams > 0
          return (
            <div key={i} className="mb-2 grid grid-cols-[1fr_64px_76px_76px_32px] gap-2">
              <IngredientPicker ING={ING} value={it.ingredientId} ingCatOrder={ingCatOrder}
                onPick={id => setItem(i, 'ingredientId', id)}
                onQuickAdd={async (nm, category) => {
                  const newId = await onQuickAddIngredient(nm, category)
                  setItem(i, 'ingredientId', newId)
                }} />
              <input
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-right font-mono text-sm disabled:bg-paper-deep disabled:text-ink-soft"
                type="number" min="0" step="0.1" placeholder={hasUnit ? ing.unitName : '—'} value={it.qty}
                disabled={!hasUnit} title={hasUnit ? `1 ${ing.unitName} ≈ ${ing.unitGrams} g` : '這個材料沒設單位換算'}
                onChange={e => setQty(i, e.target.value)}
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
          )
        })}
        <button type="button" className="btn btn-sm"
          onClick={() => setItems(p => [...p, { ingredientId: null, g: '', layer: p[p.length - 1]?.layer || '', qty: '' }])}>
          ＋ 加一項材料
        </button>

        <SectionTitle id="sec-steps">作法步驟(一行一步,可空)</SectionTitle>
        <textarea rows={5} value={steps} onChange={e => setSteps(e.target.value)}
          placeholder={'奶油乳酪回溫,與糖攪拌至滑順\n分次加入全蛋拌勻\n…'}
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm" />

        <div className="mb-2.5 mt-4 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          烘烤(一行一段,分段烤就多行)
        </div>
        <textarea rows={2} value={bakes} onChange={e => setBakes(e.target.value)}
          placeholder={'70°C 20分鐘結皮\n150-160°C 16分鐘'}
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 font-mono text-sm" />

        <div className="mb-2.5 mt-4 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          參考食譜連結(一行一個,格式:標題 | 網址)
        </div>
        <textarea rows={2} value={links} onChange={e => setLinks(e.target.value)}
          placeholder={'食不相瞞提拉米蘇 | https://www.youtube.com/watch?v=…'}
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm" />

        <SectionTitle id="sec-label">標示與狀態</SectionTitle>
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field">
            <label>成品重 g(出爐實秤,可空;營養標示每100g用它算)</label>
            <input type="number" min="0" step="1" value={finishedGrams} onChange={e => setFinishedGrams(e.target.value)} />
          </div>
          <div className="field">
            <label>保存期限(天,可空)</label>
            <input type="number" min="0" step="1" value={shelfLifeDays} onChange={e => setShelfLifeDays(e.target.value)} />
          </div>
          <div className="field">
            <label>保存條件(可空)</label>
            <input value={storage} onChange={e => setStorage(e.target.value)} list="storage-list" placeholder="例:冷藏" />
            <datalist id="storage-list">
              {['常溫', '冷藏', '冷凍', '常溫避光'].map(x => <option key={x} value={x} />)}
            </datalist>
          </div>
          <div className="field">
            <label>公開狀態</label>
            <div className="flex gap-1.5">
              <Chip active={isPublic} onClick={() => setIsPublic(true)}>公開</Chip>
              <Chip active={!isPublic} tone="warn" onClick={() => setIsPublic(false)}>🔒 私人</Chip>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t-2 border-ink pt-3">
          <button type="button" className="btn" onClick={cancel} disabled={saving}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  )
}
