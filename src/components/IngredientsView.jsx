import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../lib/calc.js'
import { exportIngredientsCSV } from '../lib/exportData.js'
import { ingCategoryColor } from '../lib/ingCategoryColors.js'
import { ingPath } from '../lib/slug.js'
import PriceSim from './PriceSim.jsx'

/* 材料主檔:搜尋(名稱/廠牌/規格/分類)+ 依分類區段顯示
   資料量小(全載入),搜尋與分組都在前端即時完成。
   列表只留核心欄位(平台化大改造第 2 項),完整營養/成分/溯源點進詳細頁看。 */
export default function IngredientsView({ ING, RCP, ingCatOrder, isEditor, onEdit, onAdd, onDelete }) {
  const [q, setQ] = useState('')
  const [simOpen, setSimOpen] = useState(false)

  const { sections, total, shown } = useMemo(() => {
    const list = Object.values(ING)
    const needle = q.trim().toLowerCase()
    const hit = i => !needle ||
      [i.name, i.brand, i.spec, i.category].some(s => (s || '').toLowerCase().includes(needle))
    const filtered = list.filter(hit)

    const byCat = {}
    for (const i of filtered) {
      const c = i.category || '未分類'
      ;(byCat[c] = byCat[c] || []).push(i)
    }
    const rank = c => {
      if (c === '未分類') return 999
      const idx = ingCatOrder.indexOf(c)
      return idx < 0 ? 500 : idx
    }
    const cats = Object.keys(byCat).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'zh-Hant'))
    for (const c of cats) byCat[c].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    return {
      sections: cats.map(c => ({ cat: c, rows: byCat[c] })),
      total: list.length,
      shown: filtered.length,
    }
  }, [ING, ingCatOrder, q])

  const cols = 8 + (isEditor ? 1 : 0)

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">材料主檔</h2>
        <span className="text-[13px] text-ink-soft">
          {q.trim() ? `符合 ${shown} / ${total} 筆` : `共 ${total} 筆`}
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          <button className={'btn btn-sm ' + (simOpen ? 'btn-active' : '')}
            onClick={() => setSimOpen(v => !v)}>📈 漲價模擬</button>
          <button className="btn btn-sm" onClick={() => exportIngredientsCSV(ING)}>⬇ CSV</button>
          {isEditor && <button className="btn btn-sm btn-primary" onClick={onAdd}>＋ 新增材料</button>}
        </span>
      </div>

      {simOpen && <PriceSim ING={ING} RCP={RCP} />}

      <div className="mt-4 max-w-md">
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜尋材料名稱、廠牌、規格、分類…(例:巧)"
          aria-label="搜尋材料"
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-ink-soft"
        />
      </div>

      {sections.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">找不到符合「{q}」的材料。</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="ltable">
            <thead>
              <tr>
                <th>材料</th><th>廠牌</th><th className="num">採購價</th><th className="num">採購量 g</th>
                <th className="num">$/100g</th><th className="num">大卡/100g</th>
                <th>過敏原</th><th>營養資料</th>
                {isEditor && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {sections.map(sec => (
                <SectionRows key={sec.cat} sec={sec} cols={cols} isEditor={isEditor}
                  onEdit={onEdit} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function SectionRows({ sec, cols, isEditor, onEdit, onDelete }) {
  const navigate = useNavigate()
  const color = ingCategoryColor(sec.cat)
  return (
    <>
      <tr style={{ borderLeft: `4px solid ${color}` }}>
        <td colSpan={cols}
          className="border-b! border-ink! pb-1! pt-4! pl-2! text-xs font-bold tracking-[.12em] text-ink">
          <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ background: color }} />
          {sec.cat}<span className="ml-2 font-mono font-medium text-ink-soft">{sec.rows.length}</span>
        </td>
      </tr>
      {sec.rows.map(i => {
        const p = i.per100g
        return (
          <tr key={i._id}>
            <td>
              <button className="text-left underline decoration-line underline-offset-2 hover:text-yolk"
                onClick={() => navigate(ingPath(i))} title="看完整資料">
                {i.name}
              </button>
              {i.spec && <span className="ml-1 text-[11px] text-ink-soft">{i.spec}</span>}
            </td>
            <td className="text-[12.5px] text-ink-soft">{i.brand || '—'}</td>
            <td className="num">{i.packPrice != null ? `$${fmt(i.packPrice)}` : '—'}</td>
            <td className="num">{i.packGrams != null ? fmt(i.packGrams) : '—'}</td>
            <td className="num">{i.packPrice != null && i.packGrams ? `$${fmt((i.packPrice * 100) / i.packGrams, 1)}` : '—'}</td>
            <td className="num">{p ? fmt(p.kcal) : '—'}</td>
            <td className="whitespace-nowrap text-[11.5px] text-ink-soft">
              {(i.allergens || []).join('、') || '—'}
              {i.mayContain?.length > 0 && <span title="可能含有">(可:{i.mayContain.join('、')})</span>}
            </td>
            <td className="text-[12px]">
              {p ? <span className="text-ok">✓</span> : <span className="text-warn">無資料</span>}
            </td>
            {isEditor && (
              <td className="whitespace-nowrap">
                <button className="btn btn-sm" onClick={() => onEdit(i._id)}>編輯</button>
                <button className="btn btn-sm btn-danger ml-1" onClick={() => onDelete(i._id)}>刪除</button>
              </td>
            )}
          </tr>
        )
      })}
    </>
  )
}
