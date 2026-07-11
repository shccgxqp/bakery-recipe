import { useNavigate } from 'react-router-dom'
import { fmt, NUTR } from '../lib/calc.js'
import { recipePath } from '../lib/slug.js'
import { ingCategoryColor } from '../lib/ingCategoryColors.js'
import { canEditShared } from '../lib/permissions.js'

/* 建立者顯示:公開頁面不能直接曝光 email(顯示名稱系統還沒做,見 roadmap
   「公開顯示名稱」待辦)——站長顯示「站長」,其他使用者先遮罩 email。 */
const OWNER_EMAIL = 'shccgxqp@gmail.com'
function displayCreator(id) {
  if (!id || id === 'owner' || id === OWNER_EMAIL) return '站長'
  const at = id.indexOf('@')
  return at > 0 ? `${id.slice(0, Math.min(2, at))}…${id.slice(at)}` : id
}
const dateOnly = d => (d ? String(d).slice(0, 10) : null)

/* 材料詳細頁(/ing/:id/:name):完整資料 + 建立者/日期溯源。
   列表頁只留核心欄位,細節都在這裡看(平台化大改造第 2 項)。 */
export default function IngredientDetail({ ing, RCP, googleUser, onEdit, onDelete }) {
  const navigate = useNavigate()

  if (!ing) {
    return (
      <>
        <p className="mt-10 text-sm text-ink-soft">找不到這筆材料,可能已被刪除或網址有誤。</p>
        <button className="btn btn-sm mt-3" onClick={() => navigate('/ings')}>← 回材料主檔</button>
      </>
    )
  }

  const p = ing.per100g
  const per100Price = ing.packGrams ? (ing.packPrice * 100) / ing.packGrams : null
  const usedBy = RCP.filter(r => r.items?.some(it => it.ingredientId === ing._id))
  const catColor = ingCategoryColor(ing.category || '未分類')
  const editable = canEditShared(ing, googleUser)

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b-[3px] border-ink pb-3">
        <button className="btn btn-sm" onClick={() => navigate('/ings')}>← 材料主檔</button>
        <h2 className="font-serif text-[28px] font-bold">{ing.name}</h2>
        {ing.spec && <span className="text-[14px] text-ink-soft">{ing.spec}</span>}
        <span className="rounded-[--radius-pill] px-2 py-0.5 text-[11.5px] font-bold"
          style={{ background: catColor + '22', color: 'var(--color-ink)' }}>
          <span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: catColor }} />
          {ing.category || '未分類'}
        </span>
        {editable && (
          <span className="ml-auto flex gap-2">
            <button className="btn btn-sm" onClick={() => onEdit(ing._id)}>✎ 編輯</button>
            <button className="btn btn-sm btn-danger" onClick={() => onDelete(ing._id)}>刪除</button>
          </span>
        )}
      </div>

      <div className="mt-5 grid max-w-4xl gap-x-10 gap-y-6 md:grid-cols-2">
        {/* 採購與單位 */}
        <section>
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">採購與成本</h3>
          <table className="ltable mt-2">
            <tbody>
              <tr><td>廠牌</td><td className="num">{ing.brand || '—'}</td></tr>
              <tr><td>採購價</td><td className="num">{ing.packPrice != null ? `$${fmt(ing.packPrice)}` : '—'}</td></tr>
              <tr><td>採購量</td><td className="num">{ing.packGrams != null ? `${fmt(ing.packGrams)} g` : '—'}</td></tr>
              <tr><td>每 100g 成本</td><td className="num">{per100Price != null ? `$${fmt(per100Price, 1)}` : '—'}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 營養(每 100g) */}
        <section>
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">營養(每 100 公克)</h3>
          {p ? (
            <table className="ltable mt-2">
              <tbody>
                {NUTR.map(([key, zh, unit, dec]) => (
                  <tr key={key}>
                    <td>{zh}</td>
                    <td className="num">{fmt(p[key] || 0, dec)} {unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-[13px] text-warn">尚無營養資料——用到這個材料的食譜,營養以 0 計並顯示警示。</p>
          )}
        </section>

        {/* 過敏原與成分 */}
        <section>
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">過敏原與成分</h3>
          <table className="ltable mt-2">
            <tbody>
              <tr><td>含有</td><td>{(ing.allergens || []).join('、') || '—'}</td></tr>
              <tr><td>可能含有</td><td>{(ing.mayContain || []).join('、') || '—'}</td></tr>
              {ing.subIngredients && <tr><td>成分(照包裝)</td><td className="text-[13px]">{ing.subIngredients}</td></tr>}
              <tr><td>標示登記日</td><td>{dateOnly(ing.labelDate) || '—'}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 使用中的食譜 */}
        <section>
          <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
            使用此材料的食譜({usedBy.length})
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
            <p className="mt-2 text-[13px] text-ink-soft">目前沒有食譜使用這個材料。</p>
          )}
        </section>
      </div>

      {ing.note && (
        <p className="mt-6 max-w-4xl text-[13px] text-ink-soft">備註:{ing.note}</p>
      )}

      {/* 溯源資訊 */}
      <div className="mt-8 max-w-4xl border-t border-dashed border-line pt-3 text-[12px] text-ink-soft">
        由 {displayCreator(ing.createdBy)} 建立
        {ing.createdAt && ` · ${dateOnly(ing.createdAt)}`}
        {ing.lastEditedBy && (
          <> · 最後由 {displayCreator(ing.lastEditedBy)} 於 {dateOnly(ing.lastEditedAt)} 修正</>
        )}
      </div>
    </>
  )
}
