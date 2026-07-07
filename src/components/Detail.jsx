import { useState } from 'react'
import { calc, fmt, NUTR, groupByLayer } from '../lib/calc.js'
import { shoppingListText, lineShareUrl } from '../lib/shareText.js'

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

/* 步驟文字裡的 (Pro Tip:……) 拆成獨立提示區塊,主敘述不被打斷 */
function splitProTip(text) {
  const m = text.match(/[((]\s*Pro\s*Tip\s*[::]\s*([^))]*)[))]/i)
  if (!m) return { main: text, tip: null }
  return { main: (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim(), tip: m[1].trim() }
}

function Cell({ n, l, tone }) {
  return (
    <div className="border-l border-line px-4 pb-3 pt-3.5 first:border-l-0">
      <div className={'font-mono text-[22px] font-semibold leading-tight ' + (tone || '')}>{n}</div>
      <div className="mt-0.5 text-[11.5px] tracking-[.06em] text-ink-soft">{l}</div>
    </div>
  )
}

export default function Detail({ recipe: r, ING, isEditor, onEdit, onDelete }) {
  const c = calc(r, ING)
  const s = r.servings || 1
  const per = c.cost / s
  const hasPrice = r.price != null && r.price > 0
  const profit = hasPrice ? r.price - per : null
  const margin = hasPrice ? ((r.price - per) / per) * 100 : null

  const [copied, setCopied] = useState(false)
  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(shoppingListText(r, ING))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      alert('複製失敗,瀏覽器不支援剪貼簿權限。')
    }
  }
  const shareToLine = () => {
    window.open(lineShareUrl(shoppingListText(r, ING)), '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">{r.name}</h2>
        <span className="whitespace-nowrap rounded-full bg-yolk-soft px-3 py-0.5 text-xs font-bold tracking-[.08em] text-yolk">
          {r.category || '未分類'}
        </span>
        {r.note && <span className="text-[13px] text-ink-soft">{r.note}</span>}
        <span className="ml-auto flex flex-wrap gap-2 print:hidden">
          <button className="btn btn-sm" onClick={copyList}>{copied ? '✓ 已複製' : '📋 複製購買清單'}</button>
          <button className="btn btn-sm" onClick={shareToLine}>💬 傳到 LINE</button>
          <button className="btn btn-sm" onClick={() => window.print()}>🖨 列印食譜卡</button>
          {isEditor && (
            <>
              <button className="btn btn-sm" onClick={onEdit}>編輯</button>
              <button className="btn btn-sm btn-danger" onClick={onDelete}>刪除</button>
            </>
          )}
        </span>
      </div>

      <p className="mt-2 hidden text-xs text-ink-soft print:block">
        烘焙帳本 · https://shccgxqp.github.io/bakery-recipe/ · 列印於 {new Date().toLocaleDateString('zh-TW')}
      </p>

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

      {(r.bakes?.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-xs font-bold tracking-[.08em] text-ink-soft">烘烤</span>
          {r.bakes.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-soft">→</span>}
              <span className="rounded-md border border-line bg-white px-2.5 py-0.5 font-mono">🔥 {b}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr] print:grid-cols-1">
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

          {(r.steps?.length > 0) && (
            <div className="mt-8">
              <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">作法步驟</div>
              <ol className="mt-4 space-y-5">
                {r.steps.map((st, i) => {
                  const { main, tip } = splitProTip(st)
                  return (
                    <li key={i} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yolk-soft font-mono text-[11px] font-bold text-yolk">
                        {i + 1}
                      </span>
                      <div className="flex-1 pt-px">
                        <p className="text-[14.5px] leading-[1.9] text-ink">{main}</p>
                        {tip && (
                          <p className="mt-2 rounded-md border border-line bg-yolk-soft/60 px-3 py-2 text-[12.5px] leading-relaxed text-ink-soft">
                            💡 <b className="font-semibold text-ink">Pro Tip</b>:{tip}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
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
                    <td className="num">{fmt(c.tot[k] / s, d)} {unit}</td>
                    <td className="num">{fmt((c.tot[k] * 100) / Math.max(c.grams, 1), d)} {unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-[340px] text-xs text-ink-soft">
            本表依材料主檔生料數值試算,非實際檢驗結果;烘焙過程水分蒸發,成品每 100 公克實際數值會較估算略高。材料主檔尚未填入之項目以 0 計算。依食品安全衛生管理法相關規定,正式對外標示前應以實際檢驗或供應商數據確認,不得逕以本估算值標示。
          </p>

          {(r.links?.length > 0) && (
            <div className="mt-6 max-w-[340px]">
              <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">參考食譜</div>
              <ul className="mt-2 space-y-1.5">
                {r.links.map(([t, u], i) => (
                  <li key={i} className="text-[13px] leading-snug">
                    <a href={u} target="_blank" rel="noopener noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:text-yolk hover:decoration-yolk">
                      {/youtu\.?be/i.test(u) ? '▶' : '🔗'} {t}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
