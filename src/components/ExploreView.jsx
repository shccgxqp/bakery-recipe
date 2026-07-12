import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chip from './Chip.jsx'
import { calc, fmt, allergenSummary } from '../lib/calc.js'
import { recipePath } from '../lib/slug.js'

/* 探索頁(/explore,v4.3.0):所有人公開食譜的卡片展示——「進入瀏覽」的
   預設首頁(Cookpad 模式)。卡片展示現算真資料(大卡/份、過敏原),
   作者顯示伺服器帶的暱稱(公開回應不含 email)。點卡片進工作檢視 /r/:id。 */
export default function ExploreView({ RCP, ING, catOrder }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('') // '' = 全部

  const cats = useMemo(() => {
    const found = [...new Set(RCP.map(r => r.category || '未分類'))]
    return found.sort((a, b) => {
      const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  }, [RCP, catOrder])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return RCP
      .filter(r => !needle || r.name.toLowerCase().includes(needle) || (r.ownerName || '').toLowerCase().includes(needle))
      .filter(r => !cat || (r.category || '未分類') === cat)
  }, [RCP, q, cat])

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">探索食譜</h2>
        <span className="text-[13px] text-ink-soft">
          {q.trim() || cat ? `符合 ${shown.length} / ${RCP.length} 道` : `共 ${RCP.length} 道公開食譜`}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜尋食譜或烘焙師…" aria-label="搜尋食譜"
          className="w-full max-w-xs rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-ink-soft"
        />
        <div className="flex flex-wrap gap-1">
          <Chip size="sm" active={cat === ''} onClick={() => setCat('')}>全部</Chip>
          {cats.map(c => (
            <Chip key={c} size="sm" active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">找不到符合的食譜。</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(r => {
            const c = calc(r, ING)
            const s = r.servings || 1
            const al = allergenSummary(r, ING)
            return (
              <button key={r._id} type="button"
                onClick={() => navigate(recipePath(r))}
                className="group flex flex-col rounded-[--radius-md] border border-line bg-white px-4 pb-3 pt-3.5 text-left hover:border-yolk">
                <div className="flex items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
                  <span className="truncate font-serif text-[18px] font-bold group-hover:text-yolk">{r.name}</span>
                  <span className="shrink-0 rounded-full bg-yolk-soft px-2 py-0.5 text-[10.5px] font-bold text-yolk">
                    {r.category || '未分類'}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3 font-mono text-[13px]">
                  <span><b className="text-[16px]">{fmt(c.tot.kcal / s)}</b> <span className="text-ink-soft">大卡/份</span></span>
                  <span className="text-ink-soft">{s} 份</span>
                </div>
                {al.has.length > 0 && (
                  <p className="mt-1.5 truncate text-[11.5px] text-ink-soft">
                    含過敏原:{al.has.join('、')}
                  </p>
                )}
                <p className="mt-2 border-t border-dashed border-line pt-1.5 text-[11.5px] text-ink-soft">
                  {r.ownerName || '站長'}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
