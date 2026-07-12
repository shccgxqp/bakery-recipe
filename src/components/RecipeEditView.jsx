import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chip from './Chip.jsx'
import IngredientPicker from './IngredientPicker.jsx'
import { toast } from '../lib/toast.js'
import { ledgerRecipePath } from '../lib/slug.js'

const SECTIONS = [
  ['sec-basic', '基本資料'],
  ['sec-items', '配方'],
  ['sec-steps', '步驟與烘烤'],
  ['sec-label', '標示與狀態'],
]

const emptyBake = () => ({ temp: '', time: '', note: '' })
const emptyLink = () => ({ title: '', url: '' })

function SectionTitle({ id, children }) {
  return (
    <div id={id} className="mb-2.5 mt-6 scroll-mt-16 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
      {children}
    </div>
  )
}

/* 一步/一段/一筆共用的「編號徽章 + 內容 + 增刪按鈕」列。content 是那一列
   的實際欄位(可以是單一 textarea,也可以是好幾個 input 並排)。 */
function NumberedRow({ n, onAdd, onDel, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yolk-soft font-mono text-[11px] font-bold text-yolk">
        {n}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" title="在這則下面插入一則"
          className="rounded-md border border-line px-2 py-0.5 text-[13px] hover:border-yolk"
          onClick={onAdd}>＋</button>
        <button type="button" title="刪除這一則"
          className="rounded-md border border-line px-2 py-0.5 text-[13px] font-bold text-warn hover:border-warn"
          onClick={onDel}>×</button>
      </div>
    </div>
  )
}

/* 食譜新增/編輯整頁(/r/new、/r/:id/edit),取代 RecipeDialog。
   單頁分段落+頂部錨點導覽(2026-07-11 拍板,不做 wizard);
   配方改搜尋式下拉(IngredientPicker),items 直接存 ingredientId,
   不再有「存檔才發現材料找不到」的問題。克為唯一真相——材料的單位換算
   (顆/大匙…)功能已在 v4.2.0 移除:59 筆材料從沒人設過,水果/蔬菜這類
   單顆重量本來就不固定,這個換算對食譜配方沒有意義。
   步驟/烘烤/參考連結三處都是「一筆一列」的結構化編輯,不用分隔符號。 */
export default function RecipeEditView({ recipe: r, ING, RCP, molds, onSave, onQuickAddIngredient, ingCatOrder }) {
  const navigate = useNavigate()
  const [name, setName] = useState(r?.name || '')
  const [cat, setCat] = useState(r?.category || '')
  const [servings, setServings] = useState(r?.servings ?? 8)
  const [price, setPrice] = useState(r?.price ?? '')
  const [note, setNote] = useState(r?.note || '')
  const [items, setItems] = useState(r
    ? r.items.map(it => ({ ingredientId: it.ingredientId, g: it.grams, section: it.layer || '' }))
    : [{ ingredientId: null, g: '', section: '' }, { ingredientId: null, g: '', section: '' }])
  /* 步驟/烘烤/連結都是「一筆一列」的陣列編輯,使用者清楚看到每一則的內容,
     不用自己記分隔符號;空白列存檔時自動剔除 */
  const [steps, setSteps] = useState(r?.steps?.length ? [...r.steps] : [''])
  const [bakes, setBakes] = useState(r?.bakes?.length ? r.bakes.map(b => ({ ...b })) : [emptyBake()])
  const [links, setLinks] = useState(r?.links?.length ? r.links.map(l => ({ ...l })) : [emptyLink()])
  const [finishedGrams, setFinishedGrams] = useState(r?.finishedGrams ?? '')
  const [shelfLifeDays, setShelfLifeDays] = useState(r?.shelfLifeDays ?? '')
  const [storage, setStorage] = useState(r?.storage || '')
  const [moldId, setMoldId] = useState(r?.moldId || '')
  const [isPublic, setIsPublic] = useState(r?.public !== false)
  const [saving, setSaving] = useState(false)

  const cats = [...new Set(RCP.map(x => x.category).filter(Boolean))]

  /* 一組「陣列 state 的增刪改」共用邏輯,steps/bakes/links 都是這個形狀 */
  const makeListOps = (list, setList, makeEmpty) => ({
    set: (i, patch) => setList(prev => prev.map((x, j) => (j === i ? (typeof patch === 'function' ? patch(x) : { ...x, ...patch }) : x))),
    del: i => setList(prev => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [makeEmpty()])),
    addAfter: i => setList(prev => [...prev.slice(0, i + 1), makeEmpty(), ...prev.slice(i + 1)]),
  })
  const stepOps = makeListOps(steps, setSteps, () => '')
  const bakeOps = makeListOps(bakes, setBakes, emptyBake)
  const linkOps = makeListOps(links, setLinks, emptyLink)

  const setItem = (i, k, v) => setItems(prev => prev.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const delItem = i => setItems(prev => prev.filter((_, j) => j !== i))

  const cancel = () => navigate(r ? ledgerRecipePath(r) : '/ledger')
  const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const submit = async e => {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    const rows = items
      .map(it => ({ ingredientId: it.ingredientId, grams: parseFloat(it.g), layer: (it.section || '').trim() }))
      .filter(it => it.ingredientId && it.grams > 0)
    if (!rows.length) { toast('至少填一項材料與用量。', { type: 'error' }); jump('sec-items'); return }
    const num = v => { const f = parseFloat(v); return Number.isFinite(f) && f > 0 ? f : null }
    setSaving(true)
    try {
      await onSave(r || null, {
        name: nm,
        servings: Math.max(1, parseInt(servings) || 1),
        category: cat.trim() || '未分類',
        price: String(price).trim() === '' ? null : parseFloat(price),
        note: note.trim(),
        steps: steps.map(s => s.trim()).filter(Boolean),
        bakes: bakes
          .map(b => ({ temp: b.temp.trim(), time: b.time.trim(), note: b.note.trim() }))
          .filter(b => b.temp || b.time || b.note),
        links: links
          .map(l => ({ title: l.title.trim() || l.url.trim(), url: l.url.trim() }))
          .filter(l => /^https?:\/\//.test(l.url)),
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

        <SectionTitle id="sec-items">配方</SectionTitle>
        <p className="mb-2 text-[12px] text-ink-soft">
          用量一律以<b>克</b>輸入;搜尋不到材料?打完名稱會出現「＋ 快速新增」。
        </p>
        <datalist id="section-list">
          {[...new Set([...items.map(it => it.section).filter(Boolean), '餅乾層', '奶油層', '塔皮', '內餡', '蛋糕體', '淋面'])]
            .map(s => <option key={s} value={s} />)}
        </datalist>
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_92px_120px_32px] gap-2">
              <IngredientPicker ING={ING} value={it.ingredientId} ingCatOrder={ingCatOrder}
                onPick={id => setItem(i, 'ingredientId', id)}
                onQuickAdd={async (nm, category) => {
                  const newId = await onQuickAddIngredient(nm, category)
                  setItem(i, 'ingredientId', newId)
                }} />
              <div className="relative">
                <input
                  className="w-full rounded-md border border-line bg-white py-1.5 pl-2.5 pr-6 text-right font-mono text-sm"
                  type="number" min="0" step="0.1" value={it.g}
                  onChange={e => setItem(i, 'g', e.target.value)}
                />
                <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-ink-soft">g</span>
              </div>
              <input
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm"
                list="section-list" placeholder="所屬部分(可空)" value={it.section}
                onChange={e => setItem(i, 'section', e.target.value)}
              />
              <button type="button" title="移除"
                className="rounded-md border border-line font-bold text-warn hover:border-warn"
                onClick={() => delItem(i)}>×</button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-soft">
          「所屬部分」是這項材料屬於食譜的哪個組成(例:餅乾層、奶油層、內餡)——
          同名的部分會自動歸在同一段顯示;單層食譜留空即可。
        </p>
        <button type="button" className="btn btn-sm mt-2"
          onClick={() => setItems(p => [...p, { ingredientId: null, g: '', section: p[p.length - 1]?.section || '' }])}>
          ＋ 加一項材料
        </button>

        <SectionTitle id="sec-steps">作法步驟(一步一格,可空;空格存檔時自動略過)</SectionTitle>
        <div className="flex flex-col gap-2">
          {steps.map((st, i) => (
            <NumberedRow key={i} n={i + 1} onAdd={() => stepOps.addAfter(i)} onDel={() => stepOps.del(i)}>
              <textarea rows={2} value={st}
                onChange={e => stepOps.set(i, () => e.target.value)}
                placeholder={i === 0 ? '例:奶油乳酪回溫,與糖攪拌至滑順' : `第 ${i + 1} 步…`}
                className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm leading-relaxed" />
            </NumberedRow>
          ))}
        </div>
        <button type="button" className="btn btn-sm mt-2" onClick={() => setSteps(p => [...p, ''])}>
          ＋ 加一步
        </button>

        <div className="mb-2.5 mt-4 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          烘烤(一段一筆,可空;例:溫度「160/150°C」、時間「13分鐘」、備註「中層」)
        </div>
        <div className="flex flex-col gap-2">
          {bakes.map((b, i) => (
            <NumberedRow key={i} n={i + 1} onAdd={() => bakeOps.addAfter(i)} onDel={() => bakeOps.del(i)}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr]">
                <input value={b.temp} onChange={e => bakeOps.set(i, { temp: e.target.value })}
                  placeholder="溫度,例:160/150°C"
                  className="rounded-md border border-line bg-white px-2.5 py-1.5 font-mono text-sm" />
                <input value={b.time} onChange={e => bakeOps.set(i, { time: e.target.value })}
                  placeholder="時間,例:13分鐘"
                  className="rounded-md border border-line bg-white px-2.5 py-1.5 font-mono text-sm" />
                <input value={b.note} onChange={e => bakeOps.set(i, { note: e.target.value })}
                  placeholder="備註(可空,例:中層、結皮)"
                  className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm" />
              </div>
            </NumberedRow>
          ))}
        </div>
        <button type="button" className="btn btn-sm mt-2" onClick={() => setBakes(p => [...p, emptyBake()])}>
          ＋ 加一段烘烤
        </button>

        <div className="mb-2.5 mt-4 border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
          參考食譜連結(一筆一則,可空)
        </div>
        <div className="flex flex-col gap-2">
          {links.map((l, i) => (
            <NumberedRow key={i} n={i + 1} onAdd={() => linkOps.addAfter(i)} onDel={() => linkOps.del(i)}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.6fr]">
                <input value={l.title} onChange={e => linkOps.set(i, { title: e.target.value })}
                  placeholder="標題,例:食不相瞞提拉米蘇"
                  className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm" />
                <input value={l.url} onChange={e => linkOps.set(i, { url: e.target.value })}
                  placeholder="網址,https:// 開頭"
                  className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm" />
              </div>
            </NumberedRow>
          ))}
        </div>
        <button type="button" className="btn btn-sm mt-2" onClick={() => setLinks(p => [...p, emptyLink()])}>
          ＋ 加一個連結
        </button>

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
