import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LS_CACHE, DEFAULT_CAT_ORDER, DEFAULT_ALLERGENS, DEFAULT_ING_CAT_ORDER } from './config.js'
import { calc, metrics, allergenSummary } from './lib/calc.js'
import { loadData, pushData } from './lib/api.js'
import { recipePath, ingPath, moldPath } from './lib/slug.js'
import Sidebar from './components/Sidebar.jsx'
import Landing from './components/Landing.jsx'
import Detail from './components/Detail.jsx'
import IngredientsView from './components/IngredientsView.jsx'
import IngredientDetail from './components/IngredientDetail.jsx'
import ChangelogView from './components/ChangelogView.jsx'
import MoldsView from './components/MoldsView.jsx'
import TrashView from './components/TrashView.jsx'
import RecipeEditView from './components/RecipeEditView.jsx'
import IngredientEditView from './components/IngredientEditView.jsx'
import ShoppingDialog from './components/ShoppingDialog.jsx'
import MoldDetail from './components/MoldDetail.jsx'
import MoldEditView from './components/MoldEditView.jsx'
import ScaleDialog from './components/ScaleDialog.jsx'
import LoginView from './components/LoginView.jsx'
import RegisterView from './components/RegisterView.jsx'
import MeView from './components/MeView.jsx'
import AdminUsersView from './components/AdminUsersView.jsx'
import LabelView from './components/LabelView.jsx'
import ToastHost from './components/ToastHost.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Skeleton from './components/Skeleton.jsx'
import { toast } from './lib/toast.js'
import { confirmDialog } from './lib/confirm.js'
import { exportBackupJSON } from './lib/exportData.js'
import { consumeTokenFromQuery, getGoogleUser, googleLogout, getAuthToken } from './lib/googleAuth.js'
import { canEditRecipe } from './lib/permissions.js'

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(LS_CACHE))
    if (Array.isArray(c?.ingredients) && Array.isArray(c?.recipes)) return c
  } catch { /* 快取壞掉就當沒有 */ }
  return { ingredients: [], recipes: [], molds: [], settings: null }
}

export default function App() {
  const [base, setBase] = useState(loadCache)
  const [dataSource, setDataSource] = useState('讀取中…')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('category') // category | cost | margin | name
  const [excludeAllergens, setExcludeAllergens] = useState(() => new Set())
  const [dlg, setDlg] = useState(null) // {type:'recipe'|'ing'|'mold'|'shopping'|'scale'|'login', ...}

  /* 網址是唯一真相來源(HashRouter,不用等 roadmap 第 6 項後補);
     /r/:id/:name 的 id 才是定位依據,name 只是分享連結好看,讀取時不看它 */
  const location = useLocation()
  const navigate = useNavigate()
  const { view, urlSelId } = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length === 0) return { view: 'landing', urlSelId: null }
    if (parts[0] === 'r') {
      if (parts[1] === 'new') return { view: 'recipe-new', urlSelId: null }
      if (parts[1] && parts[2] === 'edit') return { view: 'recipe-edit', urlSelId: decodeURIComponent(parts[1]) }
      return { view: 'recipe', urlSelId: parts[1] ? decodeURIComponent(parts[1]) : null }
    }
    if (parts[0] === 'ing' && parts[1]) {
      if (parts[1] === 'new') return { view: 'ing-new', urlSelId: null }
      if (parts[2] === 'edit') return { view: 'ing-edit', urlSelId: decodeURIComponent(parts[1]) }
      return { view: 'ing-detail', urlSelId: decodeURIComponent(parts[1]) }
    }
    if (parts[0] === 'mold' && parts[1]) {
      if (parts[1] === 'new') return { view: 'mold-new', urlSelId: null }
      if (parts[2] === 'edit') return { view: 'mold-edit', urlSelId: decodeURIComponent(parts[1]) }
      return { view: 'mold-detail', urlSelId: decodeURIComponent(parts[1]) }
    }
    if (parts[0] === 'label' && parts[1]) return { view: 'label', urlSelId: decodeURIComponent(parts[1]) }
    if (parts[0] === 'admin' && parts[1] === 'users') return { view: 'admin-users', urlSelId: null }
    if (['ings', 'molds', 'trash', 'changelog', 'login', 'register', 'me'].includes(parts[0])) return { view: parts[0], urlSelId: null }
    return { view: 'landing', urlSelId: null }
  }, [location.pathname])

  /* 帳號系統(見 docs/roadmap.md 第 2 項 phase 4)——沒有站長密碼了,身份完全
     來自登入 token(Google 或信箱密碼),role:"owner" 判斷交給後端 users 表。
     isEditor 這次刻意不分身份細顯示:登入者都看得到編輯按鈕,沒有權限的
     操作交給 API 擋 + toast 顯示錯誤(見 src/lib/permissions.js 的逐項判斷)。 */
  const [googleUser, setGoogleUser] = useState(null)
  const refreshAuthUser = () => setGoogleUser(getGoogleUser())
  useEffect(() => {
    const justLoggedIn = consumeTokenFromQuery()
    refreshAuthUser()
    /* Google 登入剛導回來且還沒設暱稱 → 引導去個人頁取暱稱(政策:真名/email 永不公開) */
    if (justLoggedIn && !getGoogleUser()?.displayName) navigate('/me')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const isEditor = !!googleUser

  const catOrder = base.settings?.catOrder || DEFAULT_CAT_ORDER
  const allergenList = base.settings?.allergenList || DEFAULT_ALLERGENS
  const ingCatOrder = base.settings?.ingCatOrder || DEFAULT_ING_CAT_ORDER

  const ING = useMemo(() => {
    const out = {}
    for (const i of base.ingredients) out[i._id] = i
    return out
  }, [base])
  const RCP = base.recipes
  const MOLDS = base.molds || []

  /* ---- 分類分組(含搜尋 + 排序) ----
     sortBy==='category': 依分類分組,組內照原順序(預設)
     其他:不分組,單一清單依指標排序,缺值(如未定價)沉底 */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = RCP
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => {
        if (excludeAllergens.size === 0) return true
        const { has, may } = allergenSummary(r, ING)
        return ![...has, ...may].some(a => excludeAllergens.has(a))
      })

    if (sortBy === 'category') {
      const g = {}
      for (const r of list) {
        const c = r.category || '未分類'
        ;(g[c] = g[c] || []).push(r)
      }
      const cats = Object.keys(g).sort((a, b) => {
        const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
      return { g, cats, flat: false }
    }

    const withMetric = list.map(r => ({ r, m: metrics(r, ING) }))
    withMetric.sort((a, b) => {
      if (sortBy === 'name') return a.r.name.localeCompare(b.r.name, 'zh-Hant')
      if (sortBy === 'cost') return b.m.per - a.m.per
      // margin:高到低,null(未定價)沉底
      if (a.m.margin == null && b.m.margin == null) return 0
      if (a.m.margin == null) return 1
      if (b.m.margin == null) return -1
      return b.m.margin - a.m.margin
    })
    return { g: { 全部: withMetric.map(x => x.r) }, cats: ['全部'], flat: true }
  }, [RCP, ING, query, sortBy, catOrder, excludeAllergens])

  const flat = useMemo(() => groups.cats.flatMap(c => groups.g[c].map(r => r._id)), [groups])
  const selected = RCP.find(r => r._id === urlSelId) || RCP.find(r => r._id === flat[0]) || null

  /* ---- 開站讀 API(成功就更新離線快取)。token 直接從 localStorage 讀
     (getAuthToken() 每次呼叫都拿最新值,不會有 React state 非同步的落後問題)---- */
  const refresh = useCallback(async () => {
    const d = await loadData(getAuthToken())
    setBase(d)
    localStorage.setItem(LS_CACHE, JSON.stringify(d))
    setDataSource('雲端 ✓')
  }, [])

  useEffect(() => {
    localStorage.removeItem('bakery-edits-v1') // 歷史暫存格式,已不使用
    localStorage.removeItem('bakery-edits-v2')
    refresh().catch(err => {
      console.warn('API 讀取失敗,使用離線快取:', err.message)
      setDataSource(loadCache().ingredients.length ? '離線快取(唯讀)' : '無資料(離線)')
    })
  }, [refresh])

  const write = useCallback(async ({ upserts, deletes, restores }) => {
    const token = getAuthToken()
    if (!token) throw new Error('尚未登入')
    try {
      await pushData(token, upserts || {}, deletes || {}, restores || {})
    } catch (err) {
      if (err.message === '尚未登入') {
        googleLogout()
        setGoogleUser(null)
        throw new Error('登入已失效,請重新登入')
      }
      throw err
    }
    await refresh()
  }, [refresh])

  /* ---- 登入 / 登出:LoginView/RegisterView 內自己呼叫 postAuth 存 token,
     成功後呼叫這個 onAuthChange 讓 App 重新讀 googleUser + 重新拉資料
     (私人食譜要跟著新身份一起出現/消失)。 ---- */
  const onAuthChange = useCallback(() => {
    refreshAuthUser()
    refresh().catch(err => toast('重新讀取失敗:' + err.message, { type: 'error' }))
  }, [refresh])
  const logout = useCallback(() => {
    googleLogout()
    setGoogleUser(null)
    refresh().catch(err => toast('重新讀取失敗:' + err.message, { type: 'error' }))
  }, [refresh])

  /* ---- 資料操作(全部以 _id 為 key;新資料由前端產生 UUID) ----
     save 由對話框 await,失敗時對話框留在原地顯示錯誤 */
  const saveRecipe = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    if (doc.sortOrder == null) doc.sortOrder = Math.max(0, ...RCP.map(r => r.sortOrder || 0)) + 10
    await write({ upserts: { recipes: [doc] } })
    navigate(recipePath(doc))
  }
  /* 食譜編輯頁的「快速新增材料」:最小欄位建檔(名稱+分類),其餘留待材料頁補;
     write() 會 refresh,新材料馬上出現在 ING 供 picker 顯示 */
  const quickAddIngredient = async (name, category) => {
    const _id = crypto.randomUUID()
    await write({
      upserts: {
        ingredients: [{
          _id, name, category, brand: '', spec: '', packPrice: 0, packGrams: 0.1,
          unitName: '', unitGrams: null, per100g: null, allergens: [], mayContain: [],
          subIngredients: '', labelDate: null, note: '',
        }],
      },
    })
    return _id
  }
  /* 材料存檔(整頁編輯器):存完導到該材料的詳細頁 */
  const saveIng = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    await write({ upserts: { ingredients: [doc] } })
    navigate(ingPath(doc))
  }
  const deleteRecipe = async r => {
    const ok = await confirmDialog({
      title: '刪除食譜', danger: true, confirmText: '刪除',
      body: `刪除「${r.name}」?(軟刪除,可從資料庫救回)`,
    })
    if (!ok) return
    try {
      await write({ deletes: { recipes: [r._id] } })
      if (urlSelId === r._id) navigate('/r')
    } catch (err) { toast('刪除失敗:' + err.message, { type: 'error' }) }
  }
  /* 複製食譜:立即存檔(不怕使用者取消編輯白做工),存完直接開編輯讓使用者改名/調整 */
  const duplicateRecipe = async r => {
    const existing = new Set(RCP.map(x => x.name))
    let name = `${r.name}(複製)`
    for (let n = 2; existing.has(name); n++) name = `${r.name}(複製${n})`
    const _id = crypto.randomUUID()
    const { _id: _old, createdAt, updatedAt, deletedAt, ...rest } = r
    const dup = { ...rest, _id, name, sortOrder: (r.sortOrder || 0) + 1 }
    try {
      await write({ upserts: { recipes: [dup] } })
      navigate(`/r/${dup._id}/edit`)
    } catch (err) { toast('複製失敗:' + err.message, { type: 'error' }) }
  }
  /* 模具存檔(整頁編輯器):存完導到該模具的詳細頁 */
  const saveMold = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    await write({ upserts: { molds: [doc] } })
    navigate(moldPath(doc))
  }
  const deleteMold = async id => {
    const mold = MOLDS.find(m => m._id === id)
    if (!mold) return
    const used = RCP.filter(r => r.moldId === id).map(r => r.name)
    const msg = used.length
      ? `「${mold.name}」被 ${used.length} 道食譜綁定(${used.slice(0, 5).join('、')}${used.length > 5 ? '…' : ''}),刪除後這些食譜要重新指定模具。確定刪除?`
      : `刪除「${mold.name}」?`
    const ok = await confirmDialog({ title: '刪除模具', danger: true, confirmText: '刪除', body: msg })
    if (!ok) return
    try {
      await write({ deletes: { molds: [id] } })
      if (view === 'mold-detail') navigate('/molds')
    } catch (err) { toast('刪除失敗:' + err.message, { type: 'error' }) }
  }
  const deleteIng = async id => {
    const ing = ING[id]
    if (!ing) return
    const used = RCP.filter(r => r.items.some(it => it.ingredientId === id)).map(r => r.name)
    const msg = used.length
      ? `「${ing.name}」被 ${used.length} 道食譜使用(${used.slice(0, 5).join('、')}${used.length > 5 ? '…' : ''}),刪除後這些食譜會顯示缺料。確定刪除?`
      : `刪除「${ing.name}」?`
    const ok = await confirmDialog({ title: '刪除材料', danger: true, confirmText: '刪除', body: msg })
    if (!ok) return
    try {
      await write({ deletes: { ingredients: [id] } })
      if (view === 'ing-detail') navigate('/ings')
    } catch (err) { toast('刪除失敗:' + err.message, { type: 'error' }) }
  }
  /* type: 'ingredients'|'recipes'|'molds' */
  const restoreItem = (type, id) => write({ restores: { [type]: [id] } })

  /* ---- 鍵盤:↑↓ 切換、/ 搜尋(對話框開著或在編輯/新增頁時停用,
     不然在編輯頁按 ↑↓ 會切走頁面丟失未存檔內容)---- */
  const searchRef = useRef(null)
  const editingView = view.endsWith('-new') || view.endsWith('-edit')
  useEffect(() => {
    const onKey = e => {
      if (dlg || editingView) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') { setQuery(''); e.target.blur() }
        return
      }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (!flat.length) return
      e.preventDefault()
      const pos = flat.indexOf(selected?._id)
      const next = e.key === 'ArrowDown'
        ? flat[Math.min(pos + 1, flat.length - 1)]
        : flat[Math.max(pos - 1, 0)]
      const nextRecipe = RCP.find(r => r._id === next)
      if (nextRecipe) navigate(recipePath(nextRecipe))
      document.getElementById('ri-' + next)?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dlg, editingView, flat, selected, RCP, navigate])

  /* 冷啟動(無快取)資料還在讀時秀骨架屏;有快取則沿用現行「先顯示快取,背景刷新」 */
  const coldLoading = view !== 'landing' && dataSource === '讀取中…' && RCP.length === 0

  return (
    <>
      {view === 'landing' ? (
        <Landing RCP={RCP} ING={ING} MOLDS={MOLDS}
          onEnter={() => navigate('/r')}
          onLogin={() => navigate('/login')} />
      ) : view === 'login' ? (
        <LoginView onAuthChange={onAuthChange} />
      ) : view === 'register' ? (
        <RegisterView onAuthChange={onAuthChange} />
      ) : view === 'label' ? (
        <LabelView id={urlSelId} />
      ) : coldLoading ? (
        <Skeleton />
      ) : (
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-[272px_minmax(0,1fr)] print:block">
          <Sidebar
            groups={groups} ING={ING} RCP={RCP}
            selected={view === 'recipe' ? selected?._id : null}
            query={query} setQuery={setQuery} searchRef={searchRef}
            sortBy={sortBy} setSortBy={setSortBy}
            allergenList={allergenList}
            excludeAllergens={excludeAllergens} setExcludeAllergens={setExcludeAllergens}
            dataSource={dataSource} isEditor={isEditor}
            onLogin={() => navigate('/login')} onLogout={logout} onMe={() => navigate('/me')}
            onAdmin={() => navigate('/admin/users')}
            onSelect={id => { const r = RCP.find(x => x._id === id); if (r) navigate(recipePath(r)) }}
            onNewRecipe={() => navigate('/r/new')}
            onToggleIngs={() => navigate(view === 'ings' ? '/r' : '/ings')}
            ingsMode={view === 'ings'}
            onToggleMolds={() => navigate(view === 'molds' ? '/r' : '/molds')}
            moldsMode={view === 'molds'}
            onShopping={() => setDlg({ type: 'shopping' })}
            onExportJSON={() => exportBackupJSON(base)}
            onChangelog={() => navigate('/changelog')}
            onTrash={() => navigate(view === 'trash' ? '/r' : '/trash')}
            trashMode={view === 'trash'}
            googleUser={googleUser}
          />
          <main className="min-w-0 px-4 pb-20 pt-5 md:px-9 md:pt-7">
            {view === 'changelog' ? (
              <ChangelogView />
            ) : view === 'me' ? (
              <MeView googleUser={googleUser} RCP={RCP} ING={ING} MOLDS={MOLDS}
                onAuthChange={refreshAuthUser} />
            ) : view === 'admin-users' ? (
              <AdminUsersView googleUser={googleUser} />
            ) : view === 'recipe-new' ? (
              isEditor ? (
                <RecipeEditView recipe={null} ING={ING} RCP={RCP} molds={MOLDS}
                  ingCatOrder={ingCatOrder} onSave={saveRecipe} onQuickAddIngredient={quickAddIngredient} />
              ) : (
                <p className="mt-10 text-sm text-ink-soft">
                  要登入才能新增食譜。
                  <button className="ml-2 underline hover:text-ink" onClick={() => navigate('/login')}>去登入</button>
                </p>
              )
            ) : view === 'recipe-edit' ? (
              !RCP.find(x => x._id === urlSelId) ? (
                <p className="mt-10 text-sm text-ink-soft">找不到這道食譜,可能已被刪除或網址有誤。</p>
              ) : !canEditRecipe(RCP.find(x => x._id === urlSelId), googleUser) ? (
                <p className="mt-10 text-sm text-ink-soft">只有作者本人能編輯這道食譜。</p>
              ) : (
                <RecipeEditView key={urlSelId} recipe={RCP.find(x => x._id === urlSelId)}
                  ING={ING} RCP={RCP} molds={MOLDS}
                  ingCatOrder={ingCatOrder} onSave={saveRecipe} onQuickAddIngredient={quickAddIngredient} />
              )
            ) : view === 'trash' ? (
              <TrashView onRestore={restoreItem} />
            ) : view === 'mold-new' ? (
              isEditor ? (
                <MoldEditView mold={null} molds={MOLDS} onSave={saveMold} />
              ) : (
                <p className="mt-10 text-sm text-ink-soft">
                  要登入才能新增模具。
                  <button className="ml-2 underline hover:text-ink" onClick={() => navigate('/login')}>去登入</button>
                </p>
              )
            ) : view === 'mold-edit' ? (
              MOLDS.find(m => m._id === urlSelId) ? (
                <MoldEditView key={urlSelId} mold={MOLDS.find(m => m._id === urlSelId)}
                  molds={MOLDS} onSave={saveMold} />
              ) : (
                <p className="mt-10 text-sm text-ink-soft">找不到這個模具,可能已被刪除或網址有誤。</p>
              )
            ) : view === 'mold-detail' ? (
              <MoldDetail mold={MOLDS.find(m => m._id === urlSelId) || null} RCP={RCP} googleUser={googleUser}
                onEdit={id => navigate(`/mold/${id}/edit`)}
                onDelete={deleteMold} />
            ) : view === 'molds' ? (
              <MoldsView molds={MOLDS} isEditor={isEditor}
                onEdit={id => navigate(`/mold/${id}/edit`)}
                onAdd={() => navigate('/mold/new')}
                onDelete={deleteMold} />
            ) : view === 'ing-new' ? (
              isEditor ? (
                <IngredientEditView ing={null} ING={ING}
                  allergenList={allergenList} ingCatOrder={ingCatOrder} onSave={saveIng} />
              ) : (
                <p className="mt-10 text-sm text-ink-soft">
                  要登入才能新增材料。
                  <button className="ml-2 underline hover:text-ink" onClick={() => navigate('/login')}>去登入</button>
                </p>
              )
            ) : view === 'ing-edit' ? (
              ING[urlSelId] ? (
                <IngredientEditView key={urlSelId} ing={ING[urlSelId]} ING={ING}
                  allergenList={allergenList} ingCatOrder={ingCatOrder} onSave={saveIng} />
              ) : (
                <p className="mt-10 text-sm text-ink-soft">找不到這筆材料,可能已被刪除或網址有誤。</p>
              )
            ) : view === 'ing-detail' ? (
              <IngredientDetail ing={ING[urlSelId] || null} RCP={RCP} googleUser={googleUser}
                onEdit={id => navigate(`/ing/${id}/edit`)}
                onDelete={deleteIng} />
            ) : view === 'ings' ? (
              <IngredientsView ING={ING} RCP={RCP} ingCatOrder={ingCatOrder} isEditor={isEditor}
                onEdit={id => navigate(`/ing/${id}/edit`)}
                onAdd={() => navigate('/ing/new')}
                onDelete={deleteIng} />
            ) : selected ? (
              <Detail recipe={selected} ING={ING} isEditor={isEditor} googleUser={googleUser}
                mold={MOLDS.find(m => m._id === selected.moldId) || null}
                onEdit={() => navigate(`/r/${selected._id}/edit`)}
                onDelete={() => deleteRecipe(selected)}
                onDuplicate={() => duplicateRecipe(selected)}
                onScale={() => setDlg({ type: 'scale' })} />
            ) : (
              <p className="mt-10 text-sm text-ink-soft">請從左側選一道甜點,或按「＋ 新增食譜」。</p>
            )}
            <p className="mt-7 hidden text-xs text-ink-soft md:block print:hidden">
              小技巧:<kbd>↑</kbd> <kbd>↓</kbd> 在清單中切換甜點,<kbd>/</kbd> 跳到搜尋。
            </p>
          </main>

          {dlg?.type === 'shopping' && (
            <ShoppingDialog ING={ING} RCP={RCP} ingCatOrder={ingCatOrder} onClose={() => setDlg(null)} />
          )}
          {dlg?.type === 'scale' && selected && (
            <ScaleDialog recipe={selected} ING={ING} molds={MOLDS} onClose={() => setDlg(null)} />
          )}
        </div>
      )}

      <ToastHost />
      <ConfirmHost />
    </>
  )
}
