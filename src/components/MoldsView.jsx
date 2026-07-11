import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../lib/calc.js'
import { MOLD_SHAPES, shapeName, moldVolume, moldDimsText } from '../lib/molds.js'
import { LENGTH_UNITS, loadUnitPref, saveUnitPref } from '../lib/units.js'
import { moldPath } from '../lib/slug.js'
import Chip from './Chip.jsx'

/* 模具庫:幾何制模具主檔(配方換算的基礎)
   分類:依形狀分組(圓模/方模/…),組內容積由小到大排列;搜尋比對名稱/廠牌/備註。 */
export default function MoldsView({ molds, isEditor, onEdit, onAdd, onDelete }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [unit, setUnit] = useState(loadUnitPref)
  const changeUnit = u => { setUnit(u); saveUnitPref(u) }

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? molds.filter(m => [m.name, m.brand, m.note].some(s => (s || '').toLowerCase().includes(needle)))
      : molds
    return MOLD_SHAPES
      .map(([shape, zh]) => ({
        shape, zh,
        items: filtered.filter(m => m.shape === shape).sort((a, b) => moldVolume(a) - moldVolume(b)),
      }))
      .filter(g => g.items.length > 0)
  }, [molds, q])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">模具庫</h2>
        <span className="text-[13px] text-ink-soft">共 {molds.length} 個</span>
        <span className="ml-auto flex gap-2 print:hidden">
          <button className="btn btn-sm" onClick={() => window.print()}>🖨 列印</button>
          {isEditor && <button className="btn btn-sm btn-primary" onClick={onAdd}>＋ 新增模具</button>}
        </span>
      </div>
      <p className="mb-3 mt-3.5 max-w-2xl text-[13px] text-ink-soft print:hidden">
        模具以<b>幾何尺寸</b>登記(品牌獨立一欄,計算只看尺寸);同直徑不同高度(拉高版)請建成兩筆。
        食譜綁定模具後,就能用「⇄ 換算」把配方換算到別的模具。
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜尋名稱/廠牌/備註…"
          className="w-full max-w-xs rounded-md border border-line bg-white px-2.5 py-1.5 text-sm"
        />
        <div className="flex gap-1">
          <span className="mr-1 self-center text-[12px] text-ink-soft">尺寸單位</span>
          {LENGTH_UNITS.map(([k, zh]) => (
            <Chip key={k} active={unit === k} onClick={() => changeUnit(k)}>{zh}</Chip>
          ))}
        </div>
      </div>
      {molds.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          還沒有模具。{isEditor ? '按「＋ 新增模具」建立第一個(例:6吋圓模、方形模21.5cm)。' : '登入後即可建立。'}
        </p>
      ) : total === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">沒有符合「{q}」的模具。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="ltable">
            <thead>
              <tr>
                <th>廠牌</th><th>名稱</th><th>尺寸</th><th className="num">容積 cc</th><th>備註</th>
                {isEditor && <th className="print:hidden">操作</th>}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <>
                  <tr key={g.shape} className="bg-paper-deep">
                    <td colSpan={isEditor ? 6 : 5} className="font-bold text-ink-soft">
                      {g.zh}({g.items.length})
                    </td>
                  </tr>
                  {g.items.map(m => (
                    <tr key={m._id}>
                      <td className="text-[12.5px] text-ink-soft">{m.brand || '—'}</td>
                      <td>
                        <button className="text-left underline decoration-line underline-offset-2 hover:text-yolk"
                          onClick={() => navigate(moldPath(m))} title="看完整資料">
                          {m.name}
                        </button>
                        {m.dataSource === 'web' && (
                          <span title="網路搜尋整理,尺寸未經官方驗證,容積為粗估"
                            className="ml-1.5 rounded border border-warn px-1 text-[10px] text-warn">網路</span>
                        )}
                      </td>
                      <td className="font-mono text-[12.5px]">{moldDimsText(m, unit)}</td>
                      <td className="num">{fmt(moldVolume(m))}</td>
                      <td className="text-[12.5px] text-ink-soft">{m.note || '—'}</td>
                      {isEditor && (
                        <td className="whitespace-nowrap print:hidden">
                          <button className="btn btn-sm" onClick={() => onEdit(m._id)}>編輯</button>
                          <button className="btn btn-sm btn-danger ml-1" onClick={() => onDelete(m._id)}>刪除</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
