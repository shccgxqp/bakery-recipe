import { useEffect, useMemo, useRef, useState } from 'react'
import { findSimilar } from '../lib/dedup.js'
import { toast } from '../lib/toast.js'

/* 材料搜尋式下拉(食譜配方列用):打字即時過濾(名稱/廠牌/規格/分類,跟
   材料頁同一套比對),點選/Enter 確定,選不到才出現「快速新增」——
   取代舊的打字+datalist(上千筆時 datalist 不可用,打錯字存檔才發現)。
   快速新增只填名稱+分類(2026-07-11 拍板最小欄位),營養標「無資料」、
   價格 0,事後去材料編輯頁補;查重跟 /ing/new 同一套,不留後門。 */
export default function IngredientPicker({ ING, value, onPick, onQuickAdd, ingCatOrder }) {
  const selected = value ? ING[value] : null
  const [q, setQ] = useState(selected?.name || '')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const [quick, setQuick] = useState(false) // 快速新增小表單展開
  const [quickCat, setQuickCat] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const rootRef = useRef(null)

  /* 外部 value 變了(例如快速新增完成)同步顯示文字 */
  useEffect(() => { setQ(selected?.name || '') }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => Object.values(ING), [ING])
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return list
      .filter(i => [i.name, i.brand, i.spec, i.category].some(s => (s || '').toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
      .slice(0, 8)
  }, [list, q])
  const exact = matches.some(i => i.name === q.trim())
  const canQuickAdd = q.trim().length >= 2 && !exact
  const similar = useMemo(() => (quick ? findSimilar(q, list, null) : []), [quick, q, list])

  /* 點外面關閉 */
  useEffect(() => {
    const onDown = e => { if (!rootRef.current?.contains(e.target)) { setOpen(false); setQuick(false) } }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pick = i => {
    onPick(i._id)
    setQ(i.name)
    setOpen(false)
    setQuick(false)
  }

  const doQuickAdd = async () => {
    const nm = q.trim()
    if (!nm || quickBusy) return
    setQuickBusy(true)
    try {
      await onQuickAdd(nm, quickCat.trim() || '未分類') // App 端建檔+把新 id 回填這一列
      setQuick(false)
      setOpen(false)
      setQuickCat('')
    } catch (err) {
      toast('快速新增失敗:' + err.message, { type: 'error' })
    } finally {
      setQuickBusy(false)
    }
  }

  const onKey = e => {
    if (!open) return
    const n = matches.length + (canQuickAdd ? 1 : 0)
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, n - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (hi < matches.length) pick(matches[hi])
      else if (canQuickAdd) setQuick(true)
    } else if (e.key === 'Escape') { setOpen(false); setQuick(false) }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input
        className={'w-full rounded-md border bg-white px-2.5 py-1.5 text-sm ' +
          (value ? 'border-line' : q.trim() ? 'border-warn/60' : 'border-line')}
        placeholder="搜尋材料(名稱/廠牌/分類)…"
        value={q}
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={e => { setQ(e.target.value); setOpen(true); setHi(0); if (value) onPick(null) }}
        onFocus={() => q.trim() && setOpen(true)}
        onKeyDown={onKey}
      />
      {open && (matches.length > 0 || canQuickAdd) && (
        <div role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-[--radius-sm] border border-ink bg-white shadow-lg">
          {matches.map((i, idx) => (
            <button key={i._id} type="button" role="option" aria-selected={idx === hi}
              className={'flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left text-sm ' +
                (idx === hi ? 'bg-yolk-soft' : 'hover:bg-yolk-soft')}
              onMouseEnter={() => setHi(idx)}
              onClick={() => pick(i)}>
              <span className="truncate">{i.name}</span>
              {(i.brand || i.spec) && (
                <span className="shrink-0 text-[11px] text-ink-soft">{[i.brand, i.spec].filter(Boolean).join(' ')}</span>
              )}
              {!i.per100g && <span className="ml-auto shrink-0 text-[10.5px] text-warn" title="尚無營養資料">⚠ 無營養</span>}
            </button>
          ))}
          {canQuickAdd && !quick && (
            <button type="button" role="option" aria-selected={hi === matches.length}
              className={'w-full border-t border-line px-2.5 py-1.5 text-left text-sm font-bold text-yolk ' +
                (hi === matches.length ? 'bg-yolk-soft' : 'hover:bg-yolk-soft')}
              onMouseEnter={() => setHi(matches.length)}
              onClick={() => setQuick(true)}>
              ＋ 快速新增「{q.trim()}」
            </button>
          )}
          {quick && (
            <div className="border-t border-ink bg-paper-deep px-2.5 py-2">
              {similar.length > 0 && (
                <p className="mb-1.5 text-[12px]">
                  <span className="font-bold text-warn">已有相似材料:</span>
                  {similar.map((s, i) => (
                    <span key={s._id}>{i > 0 && '、'}
                      <button type="button" className="underline underline-offset-2"
                        onClick={() => pick(s)}>{s.name}{s.brand ? `(${s.brand})` : ''}</button>
                    </span>
                  ))}
                  <span className="text-ink-soft">——點名稱直接用它。</span>
                </p>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1 text-[13px]"
                  placeholder="分類(選填)" list="picker-cat-list"
                  value={quickCat} onChange={e => setQuickCat(e.target.value)}
                />
                <datalist id="picker-cat-list">
                  {(ingCatOrder || []).map(c => <option key={c} value={c} />)}
                </datalist>
                <button type="button" className="btn btn-sm btn-primary" disabled={quickBusy} onClick={doQuickAdd}>
                  {quickBusy ? '建立中…' : `建立「${q.trim()}」`}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-ink-soft">先建名稱就好,營養/價格之後去材料頁補(食譜會顯示缺資料警示)。</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
