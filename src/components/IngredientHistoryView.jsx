import { useNavigate } from 'react-router-dom'
import { fmt, NUTR } from '../lib/calc.js'
import { ingPath } from '../lib/slug.js'

const SOURCE_LABEL = {
  package_label: '實體包裝標示', manufacturer: '原廠／代理商', official_db: '政府公開資料庫', user_input: '使用者自行輸入', unknown: '尚未確認',
}
const STATUS_LABEL = { pending: '待確認', verified: '已查核', needs_review: '需要複核', outdated: '可能已過期' }
const dateOnly = d => (d ? String(d).slice(0, 10) : '—')

function VersionCard({ version, current }) {
  const p = version.per100g
  const evidence = version.evidence || []
  return (
    <article className={'rounded-[--radius-md] border p-4 ' + (current ? 'border-ink bg-paper' : 'border-line bg-white')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-serif text-xl font-bold">{current ? '目前生效資料' : `歷史版本 · 封存於 ${dateOnly(version.archivedAt)}`}</h3>
        <span className="text-[12px] font-bold text-ink-soft">{STATUS_LABEL[version.verification?.status] || '待確認'} · 最後查核 {dateOnly(version.verification?.latestVerifiedAt)}</span>
      </div>
      {!current && <p className="mt-1 text-[12px] text-ink-soft">封存原因：{version.reason || '材料資料更新'}</p>}
      <div className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
        <section>
          <h4 className="border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">品項與成分</h4>
          <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-y-1 text-[13px]">
            <dt className="text-ink-soft">名稱</dt><dd>{version.name || '—'}</dd>
            <dt className="text-ink-soft">廠牌／規格</dt><dd>{[version.brand, version.spec].filter(Boolean).join(' · ') || '—'}</dd>
            <dt className="text-ink-soft">含有過敏原</dt><dd>{(version.allergens || []).join('、') || '—'}</dd>
            <dt className="text-ink-soft">可能含有</dt><dd>{(version.mayContain || []).join('、') || '—'}</dd>
            <dt className="text-ink-soft">成分原文</dt><dd>{version.subIngredients || '—'}</dd>
          </dl>
        </section>
        <section>
          <h4 className="border-b border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">每 100g 營養</h4>
          {p ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              {NUTR.map(([key, zh, unit, dec]) => <div key={key} className="flex justify-between gap-2"><dt className="text-ink-soft">{zh}</dt><dd>{fmt(p[key] || 0, dec)} {unit}</dd></div>)}
            </dl>
          ) : <p className="mt-2 text-[13px] text-warn">尚無營養資料</p>}
        </section>
      </div>
      <section className="mt-4 border-t border-line pt-3">
        <h4 className="text-xs font-bold tracking-[.12em] text-ink-soft">資料來源</h4>
        {evidence.length ? <ul className="mt-2 space-y-1 text-[13px]">
          {evidence.map((item, index) => <li key={item.id || index}>
            <span className="font-bold">{SOURCE_LABEL[item.type] || '未分類來源'}</span>
            {item.title && <> · {item.title}</>}
            {item.url && <> · <a className="underline underline-offset-2 hover:text-yolk" href={item.url} target="_blank" rel="noreferrer">開啟來源</a></>}
            {item.reference && <span className="text-ink-soft"> · {item.reference}</span>}
            {item.checkedAt && <span className="text-ink-soft"> · 查核 {dateOnly(item.checkedAt)}</span>}
          </li>)}
        </ul> : <p className="mt-2 text-[13px] text-ink-soft">尚未登錄來源。</p>}
      </section>
    </article>
  )
}

export default function IngredientHistoryView({ ing }) {
  const navigate = useNavigate()
  if (!ing) return <p className="mt-10 text-sm text-ink-soft">找不到這筆材料，可能已被刪除或網址有誤。</p>
  const current = {
    name: ing.name, category: ing.category, brand: ing.brand, spec: ing.spec, per100g: ing.per100g,
    allergens: ing.allergens, mayContain: ing.mayContain, subIngredients: ing.subIngredients,
    labelDate: ing.labelDate, note: ing.note, evidence: ing.evidence, verification: ing.verification,
  }
  const history = [...(ing.history || [])].reverse()
  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <button className="btn btn-sm" onClick={() => navigate(ingPath(ing))}>← 回材料詳細</button>
        <h2 className="font-serif text-[28px] font-bold">{ing.name} 的資料歷史</h2>
      </div>
      <p className="mt-4 text-[13px] text-ink-soft">選食材與營養計算只使用目前生效資料。歷史版本僅供追溯，不能在一般搜尋中選取。</p>
      <div className="mt-5 space-y-4">
        <VersionCard version={current} current />
        {history.length ? history.map(version => <VersionCard key={version.id} version={version} />) : (
          <p className="rounded-[--radius-sm] border border-dashed border-line px-3 py-4 text-[13px] text-ink-soft">尚無歷史版本。未來變更營養、成分、過敏原、來源或品項資料時，系統會自動封存目前資料。</p>
        )}
      </div>
    </div>
  )
}
