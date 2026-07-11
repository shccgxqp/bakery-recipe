import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Tabs from './Tabs.jsx'
import Chip from './Chip.jsx'
import { fetchProfile, updateProfile } from '../lib/googleAuth.js'
import { recipePath, ingPath, moldPath } from '../lib/slug.js'
import { toast } from '../lib/toast.js'
import { fmt } from '../lib/calc.js'

/* 個人頁(/me):「烘焙師的帳本」——暱稱/工作室 + 貢獻統計(帳本表格語彙)+
   我的食譜/材料/模具真實清單。刻意不做 chef portfolio 那種大頭照 hero+
   見證區塊(見 docs/design-guide.md)。 */
export default function MeView({ googleUser, RCP, ING, MOLDS, onAuthChange }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [displayName, setDisplayName] = useState(googleUser?.displayName || '')
  const [studioName, setStudioName] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [recipeFilter, setRecipeFilter] = useState('all') // all | public | private

  const me = googleUser?.email

  /* 工作室名/網頁不在 token 裡,開頁跟伺服器拿一次補進表單 */
  useEffect(() => {
    if (!me) return
    fetchProfile()
      .then(p => {
        setDisplayName(prev => prev || p.displayName)
        setStudioName(p.studioName)
        setWebsite(p.website)
      })
      .catch(() => { /* 讀不到就讓使用者自己填,存檔時一樣會寫入 */ })
  }, [me])
  const myRecipes = useMemo(() => RCP.filter(r => r.ownerId === me), [RCP, me])
  const myIngs = useMemo(
    () => Object.values(ING).filter(i => i.createdBy === me || i.lastEditedBy === me),
    [ING, me],
  )
  const myMolds = useMemo(
    () => MOLDS.filter(m => m.createdBy === me || m.lastEditedBy === me),
    [MOLDS, me],
  )
  const pub = myRecipes.filter(r => r.public !== false)
  const priv = myRecipes.filter(r => r.public === false)
  const shownRecipes = recipeFilter === 'public' ? pub : recipeFilter === 'private' ? priv : myRecipes

  if (!googleUser) {
    return (
      <p className="mt-10 text-sm text-ink-soft">
        要登入才能看個人頁。
        <button className="ml-2 underline hover:text-ink" onClick={() => navigate('/login')}>去登入</button>
      </p>
    )
  }

  const noName = !googleUser.displayName

  const saveProfile = async e => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    try {
      await updateProfile({ displayName: displayName.trim(), studioName: studioName.trim(), website: website.trim() })
      onAuthChange()
      toast('個人資料已儲存', { type: 'success' })
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">
          {googleUser.displayName || '未命名烘焙師'}
        </h2>
        <span className="text-[13px] text-ink-soft">{googleUser.email}</span>
        {googleUser.role === 'owner' && (
          <span className="rounded-full bg-yolk-soft px-3 py-0.5 text-xs font-bold tracking-[.08em] text-yolk">站長</span>
        )}
      </div>

      {noName && (
        <div className="mt-4 max-w-2xl border-l-4 border-yolk bg-yolk-soft px-4 py-3 text-[13.5px]">
          <b>先幫自己取個暱稱吧!</b>暱稱是公開頁面上代表你的名字
          (食譜作者、材料建立者都顯示它),真名和 email 永遠不會公開。
        </div>
      )}

      <Tabs className="mt-4" active={tab} onChange={setTab}
        tabs={[
          { id: 'profile', label: '基本資料' },
          { id: 'recipes', label: `我的食譜(${myRecipes.length})` },
          { id: 'inventory', label: `我的材料/模具(${myIngs.length + myMolds.length})` },
        ]} />

      {/* ── 基本資料 ── */}
      <div className={tab === 'profile' ? '' : 'hidden'}>
        <div className="mt-5 grid max-w-4xl gap-x-10 gap-y-6 md:grid-cols-2">
          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <div className="field">
              <label htmlFor="me-name">公開暱稱(必填)</label>
              <input id="me-name" value={displayName} maxLength={30}
                onChange={e => setDisplayName(e.target.value)} required
                placeholder="例:小巷烘焙師" />
            </div>
            <div className="field">
              <label htmlFor="me-studio">工作室名稱(選填)</label>
              <input id="me-studio" value={studioName} maxLength={40}
                onChange={e => setStudioName(e.target.value)} placeholder="例:焙啾啾工作室" />
            </div>
            <div className="field">
              <label htmlFor="me-web">個人網頁/社群連結(選填)</label>
              <input id="me-web" type="url" value={website} maxLength={200}
                onChange={e => setWebsite(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <button className="btn btn-primary" disabled={saving} type="submit">
                {saving ? '儲存中…' : '儲存個人資料'}
              </button>
            </div>
          </form>

          <section>
            <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">貢獻統計</h3>
            <table className="ltable mt-2">
              <tbody>
                <tr><td>公開食譜</td><td className="num">{fmt(pub.length)} 道</td></tr>
                <tr><td>私人食譜</td><td className="num">{fmt(priv.length)} 道</td></tr>
                <tr><td>建立/修正過的材料</td><td className="num">{fmt(myIngs.length)} 筆</td></tr>
                <tr><td>建立/修正過的模具</td><td className="num">{fmt(myMolds.length)} 筆</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>

      {/* ── 我的食譜 ── */}
      <div className={tab === 'recipes' ? '' : 'hidden'}>
        <div className="mt-4 flex gap-1.5">
          <Chip size="sm" active={recipeFilter === 'all'} onClick={() => setRecipeFilter('all')}>全部({myRecipes.length})</Chip>
          <Chip size="sm" active={recipeFilter === 'public'} onClick={() => setRecipeFilter('public')}>公開({pub.length})</Chip>
          <Chip size="sm" tone="warn" active={recipeFilter === 'private'} onClick={() => setRecipeFilter('private')}>🔒 私人({priv.length})</Chip>
        </div>
        {shownRecipes.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            還沒有食譜。<button className="underline hover:text-ink" onClick={() => navigate('/r/new')}>＋ 新增第一道</button>
          </p>
        ) : (
          <table className="ltable mt-3 max-w-2xl">
            <tbody>
              {shownRecipes.map(r => (
                <tr key={r._id}>
                  <td>
                    <button className="underline decoration-line underline-offset-2 hover:text-yolk"
                      onClick={() => navigate(recipePath(r))}>{r.name}</button>
                    {r.public === false && <span className="ml-1.5" title="私人食譜">🔒</span>}
                  </td>
                  <td className="text-[12.5px] text-ink-soft">{r.category || '未分類'}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn btn-sm" onClick={() => navigate(`/r/${r._id}/edit`)}>✎ 編輯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 我的材料/模具 ── */}
      <div className={tab === 'inventory' ? '' : 'hidden'}>
        <div className="mt-5 grid max-w-4xl gap-x-10 gap-y-6 md:grid-cols-2">
          <section>
            <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
              材料({myIngs.length})
            </h3>
            {myIngs.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-soft">還沒有建立或修正過材料。</p>
            ) : (
              <table className="ltable mt-2">
                <tbody>
                  {myIngs.map(i => (
                    <tr key={i._id}>
                      <td>
                        <button className="underline decoration-line underline-offset-2 hover:text-yolk"
                          onClick={() => navigate(ingPath(i))}>{i.name}</button>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn btn-sm" onClick={() => navigate(`/ing/${i._id}/edit`)}>✎</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section>
            <h3 className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
              模具({myMolds.length})
            </h3>
            {myMolds.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-soft">還沒有建立或修正過模具。</p>
            ) : (
              <table className="ltable mt-2">
                <tbody>
                  {myMolds.map(m => (
                    <tr key={m._id}>
                      <td>
                        <button className="underline decoration-line underline-offset-2 hover:text-yolk"
                          onClick={() => navigate(moldPath(m))}>{m.name}</button>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn btn-sm" onClick={() => navigate(`/mold/${m._id}/edit`)}>✎</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
