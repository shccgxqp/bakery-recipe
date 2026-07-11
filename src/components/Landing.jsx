import { calc, metrics, allergenSummary, fmt, NUTR } from '../lib/calc.js'
import { APP_VERSION } from '../config.js'

/* 首頁功能亮點卡用的簡單線稿 icon,跟裝飾性 emoji 分開,呼應站內帳本的簡樸風格 */
const ICONS = {
  cost: <path d="M4 4h16M4 12h16M4 20h10" strokeLinecap="round" />,
  label: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" /></>,
  mold: <><circle cx="9" cy="9" r="6" /><circle cx="16" cy="16" r="4.2" /></>,
  allergen: <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z" />,
}

function FeatureIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7 text-yolk">
      {ICONS[name]}
    </svg>
  )
}

const FEATURES = [
  ['cost', '成本 / 毛利即時試算', '改一個材料價格,所有用到它的食譜成本、毛利率立刻重算,不用一道一道手動改。'],
  ['label', '台灣營養標示合規', '8 項法定標示 + 每日參考值%自動產生,下載版自動烙印免責聲明與浮水印。'],
  ['mold', '模具容積換算', '模具規格庫查得到,6 吋配方換 8 吋模、圓模換方模,倍率用容積算,不是憑感覺放大。'],
  ['allergen', '過敏原即時篩選', '材料標一次過敏原,所有用到它的食譜自動聯集顯示,列表還能一鍵排除。'],
]

/* 挑一道有定價、有綁模具的真實食譜當首頁示範卡,沒有就退回第一道有定價的食譜 */
function pickSample(RCP) {
  return RCP.find(r => r.name === '焦糖伯爵紅茶蛋糕')
    || RCP.find(r => r.price > 0)
    || RCP[0]
    || null
}

const MINI_NUTR_KEYS = ['kcal', 'protein', 'fat', 'sodium']

export default function Landing({ RCP, ING, MOLDS, onEnter, onLogin }) {
  const sample = pickSample(RCP)
  const c = sample ? calc(sample, ING) : null
  const m = sample ? metrics(sample, ING) : null
  const al = sample ? allergenSummary(sample, ING) : { has: [], may: [] }
  const s = sample?.servings || 1
  const labelGrams = sample?.finishedGrams > 0 ? sample.finishedGrams : c?.grams || 1

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[21px] font-bold tracking-[.04em]">焙啾啾</span>
          <span className="border-l border-line pl-2.5 text-[12px] text-ink-soft">烘焙帳本 · 配方成本營養工具</span>
        </div>
        <button onClick={onLogin} className="text-[13.5px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink">
          🔑 登入編輯
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* ---------- Hero ---------- */}
        <section className="grid grid-cols-1 items-center gap-10 py-10 md:grid-cols-2 md:gap-14 md:py-16">
          <div>
            <p className="text-[12px] font-bold tracking-[.16em] text-yolk">個人烘焙工作室的營運帳本</p>
            <h1 className="mt-3.5 font-serif text-[34px] font-bold leading-[1.2] sm:text-[42px]">
              配方‧成本‧營養,<br /><span className="text-yolk">一頁看完。</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16.5px] text-ink-soft">
              從一份配方算到每一份的成本、毛利、台灣法定營養標示與過敏原——
              不用切三個 App、不用重算三次。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <button onClick={onEnter} className="btn btn-primary">進入瀏覽食譜 →</button>
              <button onClick={onEnter} className="text-[14px] text-ink-soft underline decoration-dashed decoration-line underline-offset-4 hover:text-ink">
                看目前有哪些食譜與材料
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-soft/80">
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-ok" />{RCP.length} 道食譜</span>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-ok" />{Object.keys(ING).length} 種材料</span>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-ok" />{MOLDS.length} 筆模具規格</span>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-ok" />符合食品安全衛生管理法標示規範</span>
            </div>
          </div>

          {sample && (
            <div className="relative">
              <div aria-hidden className="absolute inset-0 -z-10 translate-x-4 translate-y-6 rotate-3 rounded-sm bg-yolk-soft" />
              <div className="w-full max-w-[420px] -rotate-2 rounded-sm border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,24,19,.04),0_8px_24px_-12px_rgba(27,24,19,.25)]">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-[19px] font-bold">{sample.name}</h3>
                  <span className="rounded bg-yolk-soft px-1.5 py-0.5 font-mono text-[11px] text-yolk">{sample.category || '未分類'}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">
                  {[sample.note, `${s} 份`].filter(Boolean).join(' · ')}
                </p>
                <hr className="my-3.5 border-t-2 border-ink" />
                <table className="w-full text-[13px]">
                  <tbody>
                    <tr className="border-b border-line"><td className="py-1.5">材料成本</td><td className="py-1.5 text-right font-mono">${fmt(c.cost, 0)}</td></tr>
                    <tr className="border-b border-line"><td className="py-1.5">每份成本</td><td className="py-1.5 text-right font-mono">${fmt(m.per, 1)}</td></tr>
                    {sample.price > 0 && (
                      <tr className="border-b border-line"><td className="py-1.5">售價 / 份</td><td className="py-1.5 text-right font-mono">${fmt(sample.price)}</td></tr>
                    )}
                    {m.margin != null && (
                      <tr><td className="py-1.5 font-bold">毛利率</td><td className="py-1.5 text-right font-mono font-bold text-yolk">{fmt(m.margin)}%</td></tr>
                    )}
                  </tbody>
                </table>
                {(al.has.length > 0 || al.may.length > 0) && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {al.has.map(a => <span key={a} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-soft">{a}</span>)}
                    {al.may.map(a => <span key={a} className="rounded-full border border-warn/40 px-2 py-0.5 text-[11px] text-warn">可能含{a}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ---------- 功能 ---------- */}
      <section className="bg-paper-deep py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-[60ch]">
            <p className="text-[12px] font-bold tracking-[.16em] text-yolk">功能</p>
            <h2 className="mt-2.5 font-serif text-[26px] font-bold sm:text-[30px]">四件麻煩事,交給它自動算</h2>
            <p className="mt-3 text-[15px] text-ink-soft">不是另一個「食譜筆記本」——這些是開烘焙工作室每天都要重複算的東西。</p>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([icon, title, body]) => (
              <div key={title} className="flex flex-col gap-3 bg-paper p-6">
                <FeatureIcon name={icon} />
                <h3 className="text-[16px] font-bold">{title}</h3>
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 合規/信任 ---------- */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-[1.2fr_1fr] md:gap-12">
          <div>
            <p className="text-[12px] font-bold tracking-[.16em] text-yolk">為什麼可信賴</p>
            <h2 className="mt-2.5 font-serif text-[24px] font-bold sm:text-[28px]">標示不是抓個數字填填,是照法規算的。</h2>
            <p className="mt-3.5 max-w-[52ch] text-[15px] text-ink-soft">
              《食品安全衛生管理法》是這裡一切標示功能的最高準則。誤差容許、免責聲明、
              浮水印、下載前同意——每一項都對應法條,不是「大概標一下」的網路工具。
            </p>
            <div className="mt-5 border-l-[3px] border-yolk bg-white px-4.5 py-4 text-[13.5px] leading-relaxed text-ink-soft">
              本站標示是依材料資料理論加總的試算值,僅供研發與個人烘焙參考,不具法律效力——
              正式販售前,數據正確性與標示合規責任在烘焙業者/使用者自己,建議送 SGS、
              台美等公正單位實際化驗。凡輸出可能被印上包裝的內容,一律附斜向浮水印+
              圖內烙印免責聲明,下載前還要你按一次「我知道這只是參考值」,提醒自己再核對。
            </div>
          </div>
          {sample && (
            <div className="nlabel ml-auto max-w-[300px]">
              <h4>營養標示</h4>
              <div className="meta">每份 {fmt(labelGrams / s)} 公克 · 本包裝含 {s} 份</div>
              <table>
                <tbody>
                  <tr className="hd"><td></td><td className="num">每份</td><td className="num">每100g</td></tr>
                  {NUTR.filter(([k]) => MINI_NUTR_KEYS.includes(k)).map(([k, zh, unit, d]) => (
                    <tr key={k}>
                      <td>{zh}</td>
                      <td className="num">{fmt(c.tot[k] / s, d)}{unit === '毫克' ? 'mg' : unit === '大卡' ? '大卡' : 'g'}</td>
                      <td className="num">{fmt((c.tot[k] * 100) / Math.max(labelGrams, 1), d)}{unit === '毫克' ? 'mg' : unit === '大卡' ? '大卡' : 'g'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: 8, fontSize: 10.5, color: 'var(--color-ink-soft)', lineHeight: 1.5 }}>
                本標示由公開資料庫試算,僅供參考;販售用正式標示依法應以實際檢驗數據為準。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- 宗旨 / 收尾 CTA ---------- */}
      <section className="bg-paper-deep py-20 text-center sm:py-24">
        <div className="mx-auto max-w-2xl px-6">
          <p className="text-[12px] font-bold tracking-[.16em] text-yolk">不管你為什麼烘焙</p>
          <h2 className="mt-3.5 font-serif text-[24px] font-bold leading-[1.35] sm:text-[30px]">
            有人為了謀生,<br />有人為了興趣,<br />有人只是想分享喜悅。
          </h2>
          <p className="mx-auto mt-6 max-w-[56ch] text-[16px] leading-[1.85]">
            秤重、微調配方、看著成品一次次朝喜歡的口感靠近——這些都值得好好記錄。
            <b className="font-bold text-yolk">焙啾啾</b>取自「烘焙久久」:希望烘焙是一個能陪你很久的小興趣。
            累了就休息,想烘焙的時候,選一道喜歡的甜點,回來就好。
          </p>
          <p className="mx-auto mt-4 max-w-[56ch] text-[15px] text-ink-soft">
            不管是經營工作室算成本、把食譜分享給朋友、確認過敏原營養素,還是單純想研發新配方——這裡都想陪你走下去。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <button onClick={onEnter} className="btn btn-primary">進入瀏覽 →</button>
            <button onClick={onLogin} className="text-[14px] text-ink-soft underline decoration-dashed decoration-line underline-offset-4 hover:text-ink">
              🔑 登入編輯
            </button>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 text-[12.5px] text-ink-soft/80">
        <span>© 焙啾啾 bakejojo · 個人烘焙工作室工具</span>
        <span className="font-mono">v{APP_VERSION}</span>
      </footer>
    </div>
  )
}
