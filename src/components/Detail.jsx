import { useEffect, useRef, useState } from 'react'
import { calc, fmt, NUTR, DV_NOTE, groupByLayer, allergenSummary } from '../lib/calc.js'
import { shoppingListText, lineShareUrl } from '../lib/shareText.js'
import { downloadNutritionLabel } from '../lib/labelImage.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { canEditRecipe, isOwner } from '../lib/permissions.js'
import { acceptTerms } from '../lib/googleAuth.js'
import { recipePath } from '../lib/slug.js'
import Tabs from './Tabs.jsx'

/* 一個「層」段落:段標題列 + 材料列 + 層小計
   showCost:成本欄只給本人/站長看(成本毛利歸在自己的分頁籤,配方表跟著收斂) */
function FragmentSection({ sec, hasLayers, subG, subC, showCost }) {
  const cols = showCost ? 4 : 3
  return (
    <>
      {hasLayers && (
        <tr>
          <td colSpan={cols} className="border-b! border-ink! pb-1! pt-3.5! text-xs font-bold tracking-[.12em] text-yolk">
            {sec.layer || '未分層'}
          </td>
        </tr>
      )}
      {sec.rows.map((row, i) =>
        row.missing ? (
          <tr key={i}>
            <td className="font-bold text-warn">{row.name}(材料主檔找不到)</td>
            <td className="num">{fmt(row.g)}</td>
            {showCost && <td className="num">—</td>}
            <td className="num">—</td>
          </tr>
        ) : (
          <tr key={i}>
            <td>{row.name}</td>
            <td className="num">{fmt(row.g)}</td>
            {showCost && <td className="num">${fmt(row.cost, 1)}</td>}
            <td className="num">{fmt(row.n.kcal)}</td>
          </tr>
        ))}
      {hasLayers && (
        <tr>
          <td className="py-1! text-xs text-ink-soft">小計</td>
          <td className="num py-1! text-xs text-ink-soft">{fmt(subG)}</td>
          {showCost && <td className="num py-1! text-xs text-ink-soft">${fmt(subC, 1)}</td>}
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

export default function Detail({ recipe: r, ING, mold, isEditor, googleUser, onEdit, onDelete, onDuplicate, onScale, workspace = false, onBack }) {
  const c = calc(r, ING)
  const s = r.servings || 1
  const per = c.cost / s
  const hasPrice = r.price != null && r.price > 0
  const profit = hasPrice ? r.price - per : null
  const margin = hasPrice ? ((r.price - per) / per) * 100 : null
  const al = allergenSummary(r, ING)
  /* 標籤的「每份重量」「每100公克」以成品重(出爐實秤)為準;沒填就退回生料總重 */
  const hasFinished = r.finishedGrams > 0
  const labelGrams = hasFinished ? r.finishedGrams : c.grams

  /* 成本/毛利是店主的營運數字,只有本人(或站長)看得到;
     編輯/刪除逐項判斷(canEditRecipe),複製食譜任何登入者都可以
     (複製出來的是自己的,伺服器蓋自己的 ownerId) */
  const mine = canEditRecipe(r, googleUser)
  const canCost = workspace && (mine || isOwner(googleUser))
  const canManage = workspace && mine
  const [tab, setTab] = useState('items')

  /* 分享下拉:輸出類動作(複製連結/購買清單/LINE/列印/複製食譜)收在一起,
     右上角不再八顆按鈕排排站。回饋改 toast(選單點完就關,按鈕文字變化看不到) */
  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef(null)
  useEffect(() => {
    if (!shareOpen) return
    const onDown = e => { if (!shareRef.current?.contains(e.target)) setShareOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setShareOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareOpen])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${recipePath(r)}`)
      toast('連結已複製', { type: 'success' })
    } catch {
      toast('複製失敗,瀏覽器不支援剪貼簿權限。', { type: 'error' })
    }
  }
  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(shoppingListText(r, ING))
      toast('購買清單已複製', { type: 'success' })
    } catch {
      toast('複製失敗,瀏覽器不支援剪貼簿權限。', { type: 'error' })
    }
  }
  const shareToLine = () => {
    window.open(lineShareUrl(shoppingListText(r, ING)), '_blank', 'noopener,noreferrer')
  }

  /* 標示卡連結:給客人/包裝 QR 用的公開頁。第一次取得前跳免責同意,
     同意時間記錄在伺服器(users.labelTermsAcceptedAt,善盡提醒義務的鐵證);
     localStorage 只當「跳過重複詢問」的快取,清掉也只是再同意一次(冪等)。 */
  const [labelLinkCopied, setLabelLinkCopied] = useState(false)
  const copyLabelLink = async () => {
    const LABEL_TERMS_KEY = 'bakery-label-page-terms-v1'
    if (!localStorage.getItem(LABEL_TERMS_KEY)) {
      const ok = await confirmDialog({
        title: '取得標示卡連結前請確認',
        confirmText: '我已了解並同意',
        body:
          '僅需同意一次:\n' +
          '1. 標示卡頁為理論試算之參考資訊,不具法律效力。\n' +
          '2. 依《食品安全衛生管理法》第 22 條,包裝食品的標示必須印在包裝上——標示卡連結/QR code 不能取代包裝上的法定標示。\n' +
          '3. 將本站數據用於商業販售,一切法律責任(含標示不實 4 萬~400 萬元罰鍰)由使用者自行承擔;正式量產請送 SGS、台美檢驗等公正單位化驗。',
      })
      if (!ok) return
      try {
        await acceptTerms('label') // 伺服器留存同意時間
      } catch { /* 記錄失敗不擋使用,下次會再詢問 */ }
      localStorage.setItem(LABEL_TERMS_KEY, new Date().toISOString())
    }
    const url = `${window.location.origin}${window.location.pathname}#/label/${r._id}/${encodeURIComponent(r.name)}`
    try {
      await navigator.clipboard.writeText(url)
      setLabelLinkCopied(true)
      setTimeout(() => setLabelLinkCopied(false), 1800)
    } catch {
      toast('複製失敗,瀏覽器不支援剪貼簿權限。', { type: 'error' })
    }
  }

  /* 下載標示前的一次性同意(留存同意時間,善盡提醒義務;文字同 docs/legal/compliance.md) */
  const downloadLabel = async () => {
    const TERMS_KEY = 'bakery-label-terms-v1'
    if (!localStorage.getItem(TERMS_KEY)) {
      const ok = await confirmDialog({
        title: '下載營養標示前請確認',
        confirmText: '我已了解並同意',
        body:
          '僅需同意一次:\n' +
          '1. 本數值為理論試算,僅供研發與個人參考,不具法律效力。\n' +
          '2. 實際成品受製程、耗損、水分蒸發影響會有誤差,本站不保證符合法規抽驗標準。\n' +
          '3. 直接用於商業販售之標示,一切法律責任(含《食品安全衛生管理法》標示不實 4 萬~400 萬元罰鍰)由使用者自行承擔;正式量產請送 SGS、台美檢驗等公正單位化驗。',
      })
      if (!ok) return
      localStorage.setItem(TERMS_KEY, new Date().toISOString())
    }
    downloadNutritionLabel(r, c, al)
  }

  return (
    <>
      {onBack && <button className="mb-3 text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-ink" onClick={onBack}>← 探索食譜</button>}
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">{r.name}</h2>
        <span className="whitespace-nowrap rounded-full bg-yolk-soft px-3 py-0.5 text-xs font-bold tracking-[.08em] text-yolk">
          {r.category || '未分類'}
        </span>
        {r.public === false && (
          <span className="whitespace-nowrap rounded-full border border-warn px-3 py-0.5 text-xs font-bold tracking-[.08em] text-warn">
            🔒 私人
          </span>
        )}
        {r.note && <span className="text-[13px] text-ink-soft">{r.note}</span>}
        <span className="ml-auto flex flex-wrap gap-2 print:hidden">
          {workspace && <button className="btn btn-sm" onClick={onScale}>⇄ 換算</button>}
          <div ref={shareRef} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={shareOpen}
              className={'btn btn-sm ' + (shareOpen ? 'btn-active' : '')}
              onClick={() => setShareOpen(v => !v)}>
              📤 分享 ▾
            </button>
            {shareOpen && (
              <div role="menu"
                className="absolute right-0 top-full z-30 mt-1 min-w-44 border-[2.5px] border-ink bg-paper py-1">
                {[
                  ['🔗 複製連結', () => { copyLink(); setShareOpen(false) }],
                  ['📋 複製購買清單', () => { copyList(); setShareOpen(false) }],
                  ['💬 傳到 LINE', () => { shareToLine(); setShareOpen(false) }],
                  ['🖨 列印食譜卡', () => { setShareOpen(false); window.print() }],
                  ...(workspace && isEditor ? [['📄 複製食譜', () => { setShareOpen(false); onDuplicate() }]] : []),
                ].map(([zh, fn]) => (
                  <button key={zh} type="button" role="menuitem"
                    className="block w-full whitespace-nowrap px-3.5 py-2 text-left text-[13.5px] hover:bg-yolk-soft"
                    onClick={fn}>
                    {zh}
                  </button>
                ))}
              </div>
            )}
          </div>
          {canManage && (
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

      {/* 分頁籤只在手機(<md)出現;桌面空間夠,四個區塊全部一次顯示 */}
      <Tabs className="mt-4 md:hidden" active={tab} onChange={setTab}
        tabs={[
          { id: 'items', label: '配方' },
          { id: 'label', label: '營養標示與過敏原' },
          { id: 'steps', label: '步驟與烘烤', hidden: !(r.steps?.length || r.bakes?.length || r.links?.length) },
          { id: 'cost', label: '成本與毛利', hidden: !canCost },
        ]} />

      {/* 面板:手機照 tab 切換(hidden),桌面 md:block 全開,列印 print:block 全開。
          桌面兩欄配置(配方+步驟 左|營養標示 右,成本全寬底部)——配方跟
          標示併排互相對照是真實使用情境。用 grid 定位而非搬 DOM:標示
          right col row-span-2,步驟排配方正下方;print:block 蓋掉 grid,
          列印維持單欄、DOM 順序(配方→標示→步驟)不變。 */}
      <div className="md:grid md:grid-cols-[1.4fr_1fr] md:grid-rows-[auto_1fr] md:gap-x-10 print:block">

      {/* ── 配方 ── */}
      <div className={(tab === 'items' ? '' : 'hidden ') + 'min-w-0 md:col-start-1 md:row-start-1 md:block print:block'}>
        <div className="hidden pt-6 md:block print:block">
          <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">配方</div>
        </div>
        {(r.storage?.length > 0 || mold) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            {mold && (
              <>
                <span className="text-xs font-bold tracking-[.08em] text-ink-soft">模具</span>
                <span className="rounded-md border border-line bg-white px-2.5 py-0.5">🥮 {mold.name}</span>
              </>
            )}
            {r.storage?.length > 0 && (
              <>
                <span className="text-xs font-bold tracking-[.08em] text-ink-soft">保存</span>
                {r.storage.map((s, i) => (
                  <span key={i} className="rounded-md border border-line bg-white px-2.5 py-0.5">
                    🧊 {[s.method, s.days].filter(Boolean).join(' ')}
                  </span>
                ))}
              </>
            )}
            <span className="text-xs font-bold tracking-[.08em] text-ink-soft">份數</span>
            <span className="rounded-md border border-line bg-white px-2.5 py-0.5 font-mono">{s} 份</span>
          </div>
        )}

        <table className="ltable mt-4 max-w-2xl">
          <thead>
            <tr>
              <th>材料</th><th className="num">用量 g</th>
              {canCost && <th className="num">成本</th>}
              <th className="num">熱量</th>
            </tr>
          </thead>
          <tbody>
            {groupByLayer(c.rows).map((sec, si, all) => {
              const hasLayers = all.length > 1 || sec.layer
              const subG = sec.rows.reduce((a, r) => a + r.g, 0)
              const subC = sec.rows.reduce((a, r) => a + (r.cost || 0), 0)
              return (
                <FragmentSection key={si} sec={sec} hasLayers={hasLayers} subG={subG} subC={subC} showCost={canCost} />
              )
            })}
            <tr className="total">
              <td>合計({fmt(c.grams)} g)</td><td></td>
              {canCost && <td className="num">${fmt(c.cost, 0)}</td>}
              <td className="num">{fmt(c.tot.kcal)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-ink-soft">
          每份約 {fmt(labelGrams / s)} g{hasFinished ? '(成品實秤)' : '(生料估算)'} · {fmt(c.tot.kcal / s)} 大卡/份
        </p>
      </div>

      {/* ── 營養標示與過敏原(桌面:右欄,縱跨兩列)── */}
      <div className={(tab === 'label' ? '' : 'hidden ') + 'min-w-0 md:col-start-2 md:row-span-2 md:row-start-1 md:block print:block'}>
        <div className="hidden pt-6 md:block print:block">
          <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">營養標示與過敏原</div>
        </div>
        <div className="mt-4 flex flex-col gap-6">
          <div>
            <div className="nlabel">
              <h4>營養標示</h4>
              <div className="meta">本品每份 {fmt(labelGrams / s)} 公克 · 本包裝含 {s} 份</div>
              <table>
                <tbody>
                  <tr className="hd"><td></td><td className="num">每份</td><td className="num">每100公克</td><td className="num">每日參考值%</td></tr>
                  {NUTR.map(([k, zh, unit, d, dv]) => (
                    <tr key={k}>
                      <td>{zh}</td>
                      <td className="num">{fmt(c.tot[k] / s, d)} {unit}</td>
                      <td className="num">{fmt((c.tot[k] * 100) / Math.max(labelGrams, 1), d)} {unit}</td>
                      <td className="num">{dv ? fmt((c.tot[k] / s / dv) * 100) + '%' : '＊'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="meta">＊參考值未訂定。{DV_NOTE}</div>
            </div>
            <button className="btn btn-sm mt-2 print:hidden" onClick={downloadLabel}>
              ⬇ 下載營養標示圖片
            </button>
          </div>
          <div>
            {(al.has.length > 0 || al.may.length > 0) && (
              <div className="max-w-[340px] rounded-md border border-line bg-white px-3 py-2 text-[12.5px] leading-relaxed">
                <b className="text-ink">過敏原資訊</b>
                {al.has.length > 0 && <div>本產品含有:<b>{al.has.join('、')}</b></div>}
                {al.may.length > 0 && <div className="text-ink-soft">本產品可能含有:{al.may.join('、')}</div>}
              </div>
            )}
            {c.noNutr.length > 0 && (
              <p className="mt-2 max-w-[340px] text-xs text-warn">
                ⚠ 下列材料尚無營養資料,以 0 計算:{c.noNutr.join('、')}
              </p>
            )}
            {canCost && c.noPrice.length > 0 && (
              <p className="mt-2 max-w-[340px] text-xs text-warn">
                ⚠ 下列材料你還沒設定採購價,成本以 0 計算:{c.noPrice.join('、')}
              </p>
            )}
            <p className="mt-2 max-w-[340px] text-xs text-ink-soft">
              {hasFinished
                ? '本表依材料主檔數值與成品實秤重量理論試算,僅供研發參考,不具法律效力。'
                : '本表依材料主檔生料數值理論試算,僅供研發參考,不具法律效力;烘焙水分蒸發會使成品每 100 公克實際值高於估算。'}
              依《食品安全衛生管理法》第 28 條,商業販售之標示不得不實(第 45 條:違者處 4 萬~400 萬元罰鍰),
              正式標示應以實際檢驗或供應商數據為準;量產上架建議送 SGS、台美檢驗等公正單位化驗。
            </p>
          </div>
        </div>
      </div>

      {/* ── 步驟與烘烤(桌面:接在配方正下方,左欄)── */}
      <div className={(tab === 'steps' ? '' : 'hidden ') + 'min-w-0 md:col-start-1 md:row-start-2 md:block print:block'}>
        {(r.steps?.length > 0 || r.bakes?.length > 0 || r.links?.length > 0) && (
          <div className="hidden pt-8 md:block print:block">
            <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">步驟與烘烤</div>
          </div>
        )}
        {(r.bakes?.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-xs font-bold tracking-[.08em] text-ink-soft">烘烤</span>
            {r.bakes.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-ink-soft">→</span>}
                <span className="rounded-md border border-line bg-white px-2.5 py-0.5 font-mono">
                  🔥 {[b.temp, b.time].filter(Boolean).join(' ')}
                  {b.note && <span className="ml-1 font-sans text-ink-soft">({b.note})</span>}
                </span>
              </span>
            ))}
          </div>
        )}
        {(r.steps?.length > 0) && (
          <ol className="mt-5 max-w-2xl space-y-5">
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
        )}
        {(r.links?.length > 0) && (
          <div className="mt-6 max-w-[420px]">
            <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">參考食譜</div>
            <ul className="mt-2 space-y-1.5">
              {r.links.map((l, i) => (
                <li key={i} className="text-[13px] leading-snug">
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-ink underline decoration-line underline-offset-2 hover:text-yolk hover:decoration-yolk">
                    {/youtu\.?be/i.test(l.url) ? '▶' : '🔗'} {l.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      </div>{/* /桌面兩欄 grid */}

      {/* ── 成本與毛利(只有本人/站長,全寬底部)── */}
      {canCost && (
        <div className={(tab === 'cost' ? '' : 'hidden ') + 'md:block print:block'}>
          <div className="hidden pt-8 md:block print:block">
            <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">成本與毛利</div>
          </div>
          <div className="mt-4 grid max-w-3xl grid-cols-2 overflow-hidden rounded-[10px] border border-line bg-white sm:grid-cols-3 lg:grid-cols-6">
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
            <Cell n={fmt(labelGrams / s)} l={hasFinished ? '每份 g(成品)' : '每份約 g(生料)'} />
          </div>
          <p className="mt-2 text-[12px] text-ink-soft">
            成本與毛利只有你自己(與站長)看得到,訪客與其他使用者不會看到這個分頁。售價在「編輯」裡修改。
          </p>
          <div className="mt-4 border-t border-line pt-3">
            <button className="btn btn-sm" onClick={copyLabelLink}>
              {labelLinkCopied ? '✓ 連結已複製' : '🏷 取得標示卡連結(給客人看的公開頁)'}
            </button>
            <p className="mt-1.5 max-w-xl text-[12px] text-ink-soft">
              標示卡只顯示營養標示/過敏原/內容物/保存資訊,不含成本毛利,配方改了自動更新。
              注意:連結/QR code 是補充資訊,依法不能取代包裝上的實體標示。
            </p>
          </div>
        </div>
      )}
    </>
  )
}
