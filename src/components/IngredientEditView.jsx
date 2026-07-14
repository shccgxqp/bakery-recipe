import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chip from './Chip.jsx'
import { toast } from '../lib/toast.js'
import { ingPath } from '../lib/slug.js'
import { findSimilar } from '../lib/dedup.js'

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

const SOURCE_TYPES = [
  ['package_label', '實體包裝標示'],
  ['manufacturer', '原廠／代理商'],
  ['official_db', '政府公開資料庫'],
  ['user_input', '使用者自行輸入'],
  ['unknown', '尚未確認'],
]

const VERIFY_STATES = [
  ['pending', '待確認'],
  ['verified', '已查核'],
  ['needs_review', '需要複核'],
  ['outdated', '可能已過期'],
]

const newEvidence = () => ({ id: crypto.randomUUID(), type: 'package_label', scopes: ['identity', 'nutrition', 'ingredients', 'allergens'], title: '', url: '', reference: '', checkedAt: '', confidence: 'high' })

/* 過敏原勾選群(含有 / 可能含有 共用) */
function AllergenPicker({ list, value, onChange }) {
  const toggle = a =>
    onChange(value.includes(a) ? value.filter(x => x !== a) : [...value, a])
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(a => (
        <Chip key={a} active={value.includes(a)} onClick={() => toggle(a)}>{a}</Chip>
      ))}
    </div>
  )
}

/* 材料新增/編輯整頁(/ing/new、/ing/:id/edit),取代 IngredientDialog。
   欄位跟原對話框一致;新增模式加查重提示(平台化大改造第 3 項)。 */
export default function IngredientEditView({ ing, ING, allergenList, ingCatOrder, onSave }) {
  const navigate = useNavigate()
  const isNew = !ing
  const [name, setName] = useState(ing?.name || '')
  const [category, setCategory] = useState(ing?.category || '')
  const [brand, setBrand] = useState(ing?.brand || '')
  const [spec, setSpec] = useState(ing?.spec || '')
  const [saving, setSaving] = useState(false)
  const [price, setPrice] = useState(ing?.packPrice ?? '')
  const [grams, setGrams] = useState(ing?.packGrams ?? '')
  const [noData, setNoData] = useState(ing ? ing.per100g == null : false)
  const [nut, setNut] = useState(
    Object.fromEntries(NUT_FIELDS.map(([k]) => [k, ing?.per100g?.[k] ?? 0]))
  )
  const [allergens, setAllergens] = useState(ing?.allergens || [])
  const [mayContain, setMayContain] = useState(ing?.mayContain || [])
  const [subIngredients, setSubIngredients] = useState(ing?.subIngredients || '')
  const [labelDate, setLabelDate] = useState(ing?.labelDate || '')
  const [note, setNote] = useState(ing?.note || '')
  const [verification, setVerification] = useState(ing?.verification || { status: ing ? 'pending' : 'pending', latestVerifiedAt: '' })
  const [evidence, setEvidence] = useState(ing?.evidence || [])

  /* 查重只在新增模式跑(編輯自己就是那筆,不用比) */
  const similar = useMemo(
    () => (isNew ? findSimilar(name, Object.values(ING), null) : []),
    [isNew, name, ING],
  )

  const cancel = () => navigate(ing ? ingPath(ing) : '/ings')

  const submit = async e => {
    e.preventDefault()
    const nm = name.trim()
    if (!nm) return
    const v = x => { const f = parseFloat(x); return Number.isFinite(f) ? f : 0 }
    /* 採購價/採購重量是私人資料(見 db-schema.md ingredientPrices),不進這份
       公開的材料文件——可空:沒填就不動你原本存的價格,不會清成 0 */
    const priceInfo = (String(price).trim() !== '' && String(grams).trim() !== '')
      ? { packPrice: v(price), packGrams: Math.max(0.1, v(grams)) }
      : null
    setSaving(true)
    try {
      await onSave(ing || null, {
        name: nm,
        category: category.trim() || '未分類',
        brand: brand.trim(),
        spec: spec.trim(),
        per100g: noData ? null : Object.fromEntries(NUT_FIELDS.map(([k]) => [k, v(nut[k])])),
        allergens,
        mayContain,
        subIngredients: subIngredients.trim(),
        labelDate: labelDate || null,
        note: note.trim(),
        verification: {
          status: verification.status || 'pending',
          latestVerifiedAt: verification.latestVerifiedAt || null,
        },
        evidence: evidence
          .map(item => ({
            ...item,
            title: item.title.trim(), url: item.url.trim(), reference: item.reference.trim(),
            checkedAt: item.checkedAt || null,
          }))
          .filter(item => item.title || item.url || item.reference),
      }, priceInfo)
    } catch (err) {
      toast('儲存失敗:' + err.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <button className="btn btn-sm" onClick={cancel}>← 取消</button>
        <h2 className="font-serif text-[28px] font-bold">{ing ? `編輯:${ing.name}` : '新增材料'}</h2>
      </div>

      <form onSubmit={submit} className="mt-5">
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label>材料名稱</label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>

          {similar.length > 0 && (
            <div className="sm:col-span-2 rounded-[--radius-sm] border border-warn/40 bg-warn/5 px-3 py-2 text-[13px]">
              <span className="font-bold text-warn">已有相似材料:</span>
              {similar.map((s, i) => (
                <span key={s._id}>
                  {i > 0 && '、'}
                  <button type="button" className="underline underline-offset-2 hover:text-yolk"
                    onClick={() => navigate(ingPath(s))}>
                    {s.name}{s.brand ? `(${s.brand})` : ''}
                  </button>
                </span>
              ))}
              <span className="text-ink-soft"> ——先看看是不是同一個,重複建檔會讓資料庫混亂;確定不同再繼續新增。</span>
            </div>
          )}

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
            <label>採購價(NT$,只有你自己看得到;可空,之後再回來補)</label>
            <input type="number" min="0" step="0.1" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>採購重量(g,只有你自己看得到;可空)</label>
            <input type="number" min="0.1" step="0.1" value={grams} onChange={e => setGrams(e.target.value)} />
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

        <section className="mt-5 border-t-2 border-ink pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold tracking-[.12em] text-ink-soft">資料查核與來源</h3>
              <p className="mt-1 text-[12px] text-ink-soft">包裝商品優先填原廠、代理商或實體包裝；原型食材填衛福部資料庫。未確認就保留待確認，不猜測。</p>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => setEvidence(items => [...items, newEvidence()])}>＋ 新增來源</button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
            <div className="field">
              <label>查核狀態</label>
              <select value={verification.status} onChange={e => setVerification(v => ({ ...v, status: e.target.value }))}>
                {VERIFY_STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>最後查核日</label>
              <input type="date" value={verification.latestVerifiedAt || ''} onChange={e => setVerification(v => ({ ...v, latestVerifiedAt: e.target.value }))} />
            </div>
          </div>

          {evidence.map((item, index) => (
            <div key={item.id || index} className="mt-3 rounded-[--radius-sm] border border-line bg-paper/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-ink-soft">來源 {index + 1}</span>
                <button type="button" className="text-[12px] text-danger underline" onClick={() => setEvidence(items => items.filter((_, i) => i !== index))}>移除</button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
                <div className="field"><label>來源類型</label>
                  <select value={item.type} onChange={e => setEvidence(items => items.map((x, i) => i === index ? { ...x, type: e.target.value } : x))}>
                    {SOURCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="field"><label>查核日</label>
                  <input type="date" value={item.checkedAt || ''} onChange={e => setEvidence(items => items.map((x, i) => i === index ? { ...x, checkedAt: e.target.value } : x))} />
                </div>
                <div className="field sm:col-span-2"><label>來源名稱／頁面標題</label>
                  <input value={item.title} placeholder="例：Isigny Sainte-Mère 無鹽奶油產品標示" onChange={e => setEvidence(items => items.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} />
                </div>
                <div className="field sm:col-span-2"><label>來源網址(實體包裝可空)</label>
                  <input type="url" value={item.url} placeholder="https://…" onChange={e => setEvidence(items => items.map((x, i) => i === index ? { ...x, url: e.target.value } : x))} />
                </div>
                <div className="field sm:col-span-2"><label>佐證編號／條碼／資料庫品項</label>
                  <input value={item.reference} placeholder="例：包裝條碼或 TFDA 品項名稱" onChange={e => setEvidence(items => items.map((x, i) => i === index ? { ...x, reference: e.target.value } : x))} />
                </div>
              </div>
            </div>
          ))}
        </section>

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
