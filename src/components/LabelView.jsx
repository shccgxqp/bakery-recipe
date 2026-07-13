import { useEffect, useState } from 'react'
import { fetchLabel } from '../lib/api.js'
import { fmt } from '../lib/calc.js'

/* 對外營養標示卡(/label/:id/:name):給客人/包裝 QR 連過來看的獨立頁,
   不用登入、無側欄。只顯示法規要求內容(營養8項/過敏原/內容物/保存),
   成本毛利配方通通沒有(資料由 /api/label 端點供給,那些欄位不出後端)。
   合規(見 docs/legal/compliance.md 第五節):標示卡區塊帶淡斜向浮水印、
   頁尾常駐免責+「本頁不可取代包裝上的法定標示」,對觀看者不設同意牆
   (觀看者不是受規範當事人);建立者的同意在產生連結時記錄於伺服器。 */
export default function LabelView({ id }) {
  const [label, setLabel] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetchLabel(id).then(setLabel).catch(e => setErr(e.message))
  }, [id])

  if (err) {
    return (
      <div className="mx-auto max-w-[420px] px-5 py-16 text-center text-sm text-ink-soft">
        讀取失敗:{err}
      </div>
    )
  }
  if (!label) {
    return <div className="mx-auto max-w-[420px] px-5 py-16 text-center text-sm text-ink-soft">讀取中…</div>
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[460px] flex-col px-5 py-8">
      <header className="border-b-[3px] border-ink pb-3">
        <h1 className="font-serif text-[24px] font-bold">{label.name}</h1>
        <p className="mt-0.5 text-[12px] text-ink-soft">焙啾啾 · 產品資訊卡(參考用)</p>
      </header>

      {/* 標示卡本體:淡斜向浮水印墊底,截圖也帶著走(合規鐵律) */}
      <div className="relative mt-5">
        <div aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          <span className="rotate-[-24deg] whitespace-nowrap text-[15px] font-bold tracking-[.3em] text-ink/10">
            試算參考值 · 非法定標示 · 試算參考值
          </span>
        </div>

        <div className="nlabel !max-w-none">
          <h4>營養標示</h4>
          <div className="meta">本品每份 {fmt(label.perServingGrams)} 公克 · 本包裝含 {label.servings} 份</div>
          <table>
            <tbody>
              <tr className="hd"><td></td><td className="num">每份</td><td className="num">每100公克</td><td className="num">每日參考值%</td></tr>
              {label.nutrition.map(n => (
                <tr key={n.key}>
                  <td>{n.zh}</td>
                  <td className="num">{fmt(n.perServing, n.dec)} {n.unit}</td>
                  <td className="num">{fmt(n.per100g, n.dec)} {n.unit}</td>
                  <td className="num">{n.dvPercent != null ? fmt(n.dvPercent) + '%' : '＊'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="meta">＊參考值未訂定。{label.dvNote}</div>
        </div>
      </div>

      {label.contents.length > 0 && (
        <section className="mt-5">
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">內容物(依重量遞減)</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed">{label.contents.join('、')}</p>
        </section>
      )}

      {(label.allergens.has.length > 0 || label.allergens.may.length > 0) && (
        <section className="mt-5">
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">過敏原資訊</h3>
          <div className="mt-2 text-[13.5px] leading-relaxed">
            {label.allergens.has.length > 0 && <p>本產品含有:<b>{label.allergens.has.join('、')}</b></p>}
            {label.allergens.may.length > 0 && <p className="text-ink-soft">本產品可能含有:{label.allergens.may.join('、')}</p>}
          </div>
        </section>
      )}

      {label.storage?.length > 0 && (
        <section className="mt-5">
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">保存</h3>
          <p className="mt-2 text-[13.5px]">
            {label.storage.map(s => [s.method, s.days].filter(Boolean).join(' ')).join('、')}
          </p>
        </section>
      )}

      {label.noNutr.length > 0 && (
        <p className="mt-4 text-[11.5px] text-warn">
          ⚠ 下列材料尚無營養資料,以 0 計算:{label.noNutr.join('、')}
        </p>
      )}

      {/* 常駐免責 footer:不可關閉(合規鐵律,網頁常駐顯示版) */}
      <footer className="mt-8 border-t-2 border-ink pt-3 text-[11.5px] leading-relaxed text-ink-soft">
        <p>
          <b className="text-ink">本頁為理論試算之參考資訊,不具法律效力,且不能取代商品包裝上的法定標示。</b>
          依《食品安全衛生管理法》第 22 條,包裝食品之標示應載明於包裝之上;本頁數值依材料資料
          理論加總,實際成品受製程、水分蒸發影響會有誤差,正式標示應以實際檢驗數據為準。
        </p>
        <p className="mt-1.5">
          內容物與過敏原由配方即時計算;配方更新時本頁自動更新
          {label.updatedAt ? `(資料時間 ${String(label.updatedAt).slice(0, 10)})` : ''}。
        </p>
      </footer>
    </div>
  )
}
