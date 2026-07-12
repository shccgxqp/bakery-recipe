import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../lib/calc.js'
import { shapeName, moldVolume, moldDimsText } from '../lib/molds.js'
import { LENGTH_UNITS, loadUnitPref, saveUnitPref } from '../lib/units.js'
import { recipePath } from '../lib/slug.js'
import { canEditShared } from '../lib/permissions.js'
import Chip from './Chip.jsx'

const dateOnly = d => (d ? String(d).slice(0, 10) : null)

const DATA_SOURCE_ZH = {
  catalog: '廠商官方型錄',
  web: '網路搜尋整理(尺寸未經官方驗證,容積為粗估)',
  manual: '自己量測',
}

/* 模具詳細頁(/mold/:id/:name):完整資料 + 建立者/日期溯源,
   跟材料詳細頁同一套模式(平台化大改造第 4 項)。 */
export default function MoldDetail({ mold, RCP, googleUser, onEdit, onDelete }) {
  const navigate = useNavigate()
  const [unit, setUnit] = useState(loadUnitPref)
  const changeUnit = u => { setUnit(u); saveUnitPref(u) }

  if (!mold) {
    return (
      <>
        <p className="mt-10 text-sm text-ink-soft">找不到這個模具,可能已被刪除或網址有誤。</p>
        <button className="btn btn-sm mt-3" onClick={() => navigate('/molds')}>← 回模具庫</button>
      </>
    )
  }

  const usedBy = RCP.filter(r => r.moldId === mold._id)
  const editable = canEditShared(mold, googleUser)

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b-[3px] border-ink pb-3">
        <button className="btn btn-sm" onClick={() => navigate('/molds')}>← 模具庫</button>
        <h2 className="font-serif text-[28px] font-bold">{mold.name}</h2>
        {mold.brand && <span className="text-[14px] text-ink-soft">{mold.brand}</span>}
        <span className="rounded-[--radius-pill] bg-yolk-soft px-2 py-0.5 text-[11.5px] font-bold">
          {shapeName(mold.shape)}
        </span>
        {editable && (
          <span className="ml-auto flex gap-2">
            <button className="btn btn-sm" onClick={() => onEdit(mold._id)}>✎ 編輯</button>
            <button className="btn btn-sm btn-danger" onClick={() => onDelete(mold._id)}>刪除</button>
          </span>
        )}
      </div>

      <div className="mt-5 grid max-w-4xl gap-x-10 gap-y-6 md:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between border-b-2 border-ink pb-1">
            <h3 className="text-xs font-bold tracking-[.12em] text-ink-soft">規格</h3>
            <span className="flex gap-1">
              {LENGTH_UNITS.map(([k, zh]) => (
                <Chip key={k} size="sm" active={unit === k} onClick={() => changeUnit(k)}>{zh}</Chip>
              ))}
            </span>
          </div>
          <table className="ltable mt-2">
            <tbody>
              <tr><td>尺寸</td><td className="num">{moldDimsText(mold, unit)}</td></tr>
              <tr><td>容積</td><td className="num">{fmt(moldVolume(mold))} cc</td></tr>
              <tr><td>入數</td><td className="num">{mold.count || 1}</td></tr>
              <tr><td>資料來源</td><td className="text-[13px]">{DATA_SOURCE_ZH[mold.dataSource] || '—'}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
            綁定此模具的食譜({usedBy.length})
          </h3>
          {usedBy.length ? (
            <ul className="mt-2 flex flex-col gap-1">
              {usedBy.map(r => (
                <li key={r._id}>
                  <button className="text-[13.5px] underline decoration-line underline-offset-2 hover:text-yolk"
                    onClick={() => navigate(recipePath(r))}>
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-ink-soft">目前沒有食譜綁定這個模具。</p>
          )}
        </section>
      </div>

      {mold.note && (
        <p className="mt-6 max-w-4xl text-[13px] text-ink-soft">備註:{mold.note}</p>
      )}

      <div className="mt-8 max-w-4xl border-t border-dashed border-line pt-3 text-[12px] text-ink-soft">
        由 {mold.creatorName || '站長'} 建立
        {mold.createdAt && ` · ${dateOnly(mold.createdAt)}`}
        {mold.editorName && (
          <> · 最後由 {mold.editorName} 於 {dateOnly(mold.lastEditedAt)} 修正</>
        )}
      </div>
    </>
  )
}
