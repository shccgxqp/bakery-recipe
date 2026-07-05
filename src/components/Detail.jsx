import { calc, fmt, NUTR, groupByLayer } from '../lib/calc.js'

/* 一個「層」段落:段標題列 + 材料列 + 層小計 */
function FragmentSection({ sec, hasLayers, subG, subC }) {
  return (
    <>
      {hasLayers && (
        <tr>
          <td colSpan={4} className="border-b! border-ink! pb-1! pt-3.5! text-xs font-bold tracking-[.12em] text-yolk">
            {sec.layer || '未分層'}
          </td>
        </tr>
      )}
      {sec.rows.map((row, i) =>
        row.missing ? (
          <tr key={i}>
            <td className="font-bold text-warn">{row.name}(材料主檔找不到)</td>
            <td className="num">{fmt(row.g)}</td><td className="num">—</td><td className="num">—</td>
          </tr>
        ) : (
          <tr key={i}>
            <td>{row.name}</td>
            <td className="num">{fmt(row.g)}</td>
            <td className="num">${fmt(row.cost, 1)}</td>
            <td className="num">{fmt(row.n.kcal)}</td>
          </tr>
        ))}
      {hasLayers && (
        <tr>
          <td className="py-1! text-xs text-ink-soft">小計</td>
          <td className="num py-1! text-xs text-ink-soft">{fmt(subG)}</td>
          <td className="num py-1! text-xs text-ink-soft">${fmt(subC, 1)}</td>
          <td></td>
        </tr>
      )}
    </>
  )
}

function Cell({ n, l, tone }) {
  return (
    <div className="border-l border-line px-4 pb-3 pt-3.5 first:border-l-0">
      <div className={'font-mono text-[22px] font-semibold leading-tight ' + (tone || '')}>{n}</div>
      <div className="mt-0.5 text-[11.5px] tracking-[.06em] text-ink-soft">{l}</div>
    </div>
  )
}

export default function Detail({ recipe: r, ING, onEdit, onDelete }) {
  const c = calc(r, ING)
  const s = r.servings || 1
  const per = c.cost / s
  const hasPrice = r.price != null && r.price > 0
  const profit = hasPrice ? r.price - per : null
  const margin = hasPrice ? ((r.price - per) / per) * 100 : null

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">{r.name}</h2>
        <span className="whitespace-nowrap rounded-full bg-yolk-soft px-3 py-0.5 text-xs font-bold tracking-[.08em] text-yolk">
          {r.category || '未分類'}
        </span>
        {r.note && <span className="text-[13px] text-ink-soft">{r.note}</span>}
        <span className="ml-auto flex gap-2">
          <button className="btn btn-sm" onClick={onEdit}>編輯</button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>刪除</button>
        </span>
      </div>

      <div className="mt-4.5 grid grid-cols-2 overflow-hidden rounded-[10px] border border-line bg-white sm:grid-cols-3 lg:grid-cols-6">
        <Cell n={`$${fmt(per, 1)}`} l={`成本/份(共 $${fmt(c.cost, 0)})`} tone="text-yolk" />
        {hasPrice
          ? <Cell n={`$${fmt(r.price)}`} l="售價/份" />
          : <Cell n="未定價" l="售價/份" tone="text-warn !text-[15px] leading-[1.9]" />}
        {hasPrice
          ? <Cell n={`$${fmt(profit, 1)}`} l="利潤/份" tone={profit >= 0 ? 'text-ok' : 'text-warn'} />
          : <Cell n="—" l="利潤/份" />}
        {hasPrice
          ? <Cell n={`${fmt(margin)}%`} l="利潤率(利潤÷成本)" tone={margin >= 0 ? 'text-ok' : 'text-warn'} />
          : <Cell n="—" l="利潤率" />}
        <Cell n={fmt(c.tot.kcal / s)} l="大卡/份" />
        <Cell n={fmt(c.grams / s)} l="每份約 g" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <table className="ltable">
            <thead>
              <tr><th>材料</th><th className="num">用量 g</th><th className="num">成本</th><th className="num">熱量</th></tr>
            </thead>
            <tbody>
              {groupByLayer(c.rows).map((sec, si, all) => {
                const hasLayers = all.length > 1 || sec.layer
                const subG = sec.rows.reduce((a, r) => a + r.g, 0)
                const subC = sec.rows.reduce((a, r) => a + (r.cost || 0), 0)
                return (
                  <FragmentSection key={si} sec={sec} hasLayers={hasLayers} subG={subG} subC={subC} />
                )
              })}
              <tr className="total">
                <td>合計({fmt(c.grams)} g)</td><td></td>
                <td className="num">${fmt(c.cost, 0)}</td>
                <td className="num">{fmt(c.tot.kcal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div className="nlabel">
            <h4>營養標示</h4>
            <div className="meta">本品每份 {fmt(c.grams / s)} 公克 · 本包裝含 {s} 份</div>
            <table>
              <tbody>
                <tr className="hd"><td></td><td className="num">每份</td><td className="num">每100公克</td></tr>
                {NUTR.map(([k, zh, unit, d]) => (
                  <tr key={k}>
                    <td>{zh}</td>
                    <td className="num">{fmt(c.tot[k] / s, d)} {unit === '大卡' ? '大卡' : '公克'}</td>
                    <td className="num">{fmt((c.tot[k] * 100) / Math.max(c.grams, 1), d)} {unit === '大卡' ? '大卡' : '公克'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-[340px] text-xs text-ink-soft">
            依材料主檔數值估算,實際熱量會因烘焙水分蒸發而每 100g 略高。
          </p>
        </div>
      </div>
    </>
  )
}
