import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AUTH_KEY, LS_CACHE, DEFAULT_CAT_ORDER, DEFAULT_ALLERGENS, DEFAULT_ING_CAT_ORDER } from './config.js'
import { calc, metrics, allergenSummary } from './lib/calc.js'
import { loadData, pushData, verifyPassword } from './lib/api.js'
import { recipePath } from './lib/slug.js'
import Sidebar from './components/Sidebar.jsx'
import Landing from './components/Landing.jsx'
import Detail from './components/Detail.jsx'
import IngredientsView from './components/IngredientsView.jsx'
import ChangelogView from './components/ChangelogView.jsx'
import MoldsView from './components/MoldsView.jsx'
import TrashView from './components/TrashView.jsx'
import RecipeDialog from './components/RecipeDialog.jsx'
import IngredientDialog from './components/IngredientDialog.jsx'
import ShoppingDialog from './components/ShoppingDialog.jsx'
import MoldDialog from './components/MoldDialog.jsx'
import ScaleDialog from './components/ScaleDialog.jsx'
import LoginDialog from './components/LoginDialog.jsx'
import ToastHost from './components/ToastHost.jsx'
import Skeleton from './components/Skeleton.jsx'
import { toast } from './lib/toast.js'
import { exportBackupJSON } from './lib/exportData.js'

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
    if (parts[0] === 'r') return { view: 'recipe', urlSelId: parts[1] ? decodeURIComponent(parts[1]) : null }
    if (['ings', 'molds', 'trash', 'changelog'].includes(parts[0])) return { view: parts[0], urlSelId: null }
    return { view: 'landing', urlSelId: null }
  }, [location.pathname])
  const [auth, setAuth] = useState(() => localStorage.getItem(AUTH_KEY) || '')
  const isEditor = !!auth

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

  /* ---- 開站讀 API(成功就更新離線快取) ---- */
  const refresh = useCallback(async () => {
    const d = await loadData()
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

  /* ---- 寫入:按儲存直接寫資料庫,成功後以伺服器回讀為準 ---- */
  const authRef = useRef(auth)
  useEffect(() => { authRef.current = auth }, [auth])

  const write = useCallback(async ({ upserts, deletes, restores }) => {
    if (!authRef.current) throw new Error('尚未登入')
    try {
      await pushData(authRef.current, upserts || {}, deletes || {}, restores || {})
    } catch (err) {
      if (err.message === '密碼錯誤') {
        setAuth('')
        localStorage.removeItem(AUTH_KEY)
        throw new Error('密碼失效,請重新登入')
      }
      throw err
    }
    await refresh()
  }, [refresh])

  /* ---- 登入 / 登出:LoginDialog 送出密碼 → doLogin 驗證,錯誤顯示在對話框內(不用 alert) ---- */
  const doLogin = useCallback(async pw => {
    const ok = await verifyPassword(pw)
    if (ok) {
      setAuth(pw)
      localStorage.setItem(AUTH_KEY, pw)
    }
    return ok
  }, [])
  const logout = useCallback(() => {
    setAuth('')
    localStorage.removeItem(AUTH_KEY)
  }, [])
  /* enterAfter:首頁「登入編輯」登入成功後直接進站,不用登入完再按一次「進入瀏覽」 */
  const openLogin = (enterAfter = false) => setDlg({ type: 'login', enterAfter })

  /* ---- 資料操作(全部以 _id 為 key;新資料由前端產生 UUID) ----
     save 由對話框 await,失敗時對話框留在原地顯示錯誤 */
  const saveRecipe = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    if (doc.sortOrder == null) doc.sortOrder = Math.max(0, ...RCP.map(r => r.sortOrder || 0)) + 10
    await write({ upserts: { recipes: [doc] } })
    navigate(recipePath(doc))
    setDlg(null)
  }
  const saveIng = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    await write({ upserts: { ingredients: [{ ...orig, ...obj, _id }] } })
    setDlg(null)
  }
  const deleteRecipe = async r => {
    if (!confirm(`刪除「${r.name}」?(軟刪除,可從資料庫救回)`)) return
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
      navigate(recipePath(dup))
      setDlg({ type: 'recipe', recipe: dup })
    } catch (err) { toast('複製失敗:' + err.message, { type: 'error' }) }
  }
  const saveMold = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    await write({ upserts: { molds: [{ ...orig, ...obj, _id }] } })
    setDlg(null)
  }
  const deleteMold = async id => {
    const mold = MOLDS.find(m => m._id === id)
    if (!mold) return
    const used = RCP.filter(r => r.moldId === id).map(r => r.name)
    const msg = used.length
      ? `「${mold.name}」被 ${used.length} 道食譜綁定(${used.slice(0, 5).join('、')}${used.length > 5 ? '…' : ''}),刪除後這些食譜要重新指定模具。確定刪除?`
      : `刪除「${mold.name}」?`
    if (!confirm(msg)) return
    try {
      await write({ deletes: { molds: [id] } })
    } catch (err) { toast('刪除失敗:' + err.message, { type: 'error' }) }
  }
  const deleteIng = async id => {
    const ing = ING[id]
    if (!ing) return
    const used = RCP.filter(r => r.items.some(it => it.ingredientId === id)).map(r => r.name)
    const msg = used.length
      ? `「${ing.name}」被 ${used.length} 道食譜使用(${used.slice(0, 5).join('、')}${used.length > 5 ? '…' : ''}),刪除後這些食譜會顯示缺料。確定刪除?`
      : `刪除「${ing.name}」?`
    if (!confirm(msg)) return
    try {
      await write({ deletes: { ingredients: [id] } })
    } catch (err) { toast('刪除失敗:' + err.message, { type: 'error' }) }
  }
  /* type: 'ingredients'|'recipes'|'molds' */
  const restoreItem = (type, id) => write({ restores: { [type]: [id] } })

  /* ---- 鍵盤:↑↓ 切換、/ 搜尋 ---- */
  const searchRef = useRef(null)
  useEffect(() => {
    const onKey = e => {
      if (dlg) return
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
  }, [dlg, flat, selected, RCP, navigate])

  /* 冷啟動(無快取)資料還在讀時秀骨架屏;有快取則沿用現行「先顯示快取,背景刷新」 */
  const coldLoading = view !== 'landing' && dataSource === '讀取中…' && RCP.length === 0

  return (
    <>
      {view === 'landing' ? (
        <Landing RCP={RCP} ING={ING} MOLDS={MOLDS}
          onEnter={() => navigate('/r')}
          onLogin={() => openLogin(true)} />
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
            onLogin={() => openLogin(false)} onLogout={logout}
            onSelect={id => { const r = RCP.find(x => x._id === id); if (r) navigate(recipePath(r)) }}
            onNewRecipe={() => setDlg({ type: 'recipe', recipe: null })}
            onToggleIngs={() => navigate(view === 'ings' ? '/r' : '/ings')}
            ingsMode={view === 'ings'}
            onToggleMolds={() => navigate(view === 'molds' ? '/r' : '/molds')}
            moldsMode={view === 'molds'}
            onShopping={() => setDlg({ type: 'shopping' })}
            onExportJSON={() => exportBackupJSON(base)}
            onChangelog={() => navigate('/changelog')}
            onTrash={() => navigate(view === 'trash' ? '/r' : '/trash')}
            trashMode={view === 'trash'}
          />
          <main className="min-w-0 px-4 pb-20 pt-5 md:px-9 md:pt-7">
            {view === 'changelog' ? (
              <ChangelogView />
            ) : view === 'trash' ? (
              <TrashView auth={auth} onRestore={restoreItem} />
            ) : view === 'molds' ? (
              <MoldsView molds={MOLDS} isEditor={isEditor}
                onEdit={id => setDlg({ type: 'mold', id })}
                onAdd={() => setDlg({ type: 'mold', id: null })}
                onDelete={deleteMold} />
            ) : view === 'ings' ? (
              <IngredientsView ING={ING} RCP={RCP} ingCatOrder={ingCatOrder} isEditor={isEditor}
                onEdit={id => setDlg({ type: 'ing', id })}
                onAdd={() => setDlg({ type: 'ing', id: null })}
                onDelete={deleteIng} />
            ) : selected ? (
              <Detail recipe={selected} ING={ING} isEditor={isEditor}
                mold={MOLDS.find(m => m._id === selected.moldId) || null}
                onEdit={() => setDlg({ type: 'recipe', recipe: selected })}
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

          {dlg?.type === 'recipe' && (
            <RecipeDialog recipe={dlg.recipe} ING={ING} RCP={RCP} molds={MOLDS}
              onSave={saveRecipe} onClose={() => setDlg(null)} />
          )}
          {dlg?.type === 'ing' && (
            <IngredientDialog ing={dlg.id ? ING[dlg.id] : null}
              allergenList={allergenList} ingCatOrder={ingCatOrder}
              onSave={saveIng} onClose={() => setDlg(null)} />
          )}
          {dlg?.type === 'shopping' && (
            <ShoppingDialog ING={ING} RCP={RCP} ingCatOrder={ingCatOrder} onClose={() => setDlg(null)} />
          )}
          {dlg?.type === 'mold' && (
            <MoldDialog mold={dlg.id ? MOLDS.find(m => m._id === dlg.id) : null}
              onSave={saveMold} onClose={() => setDlg(null)} />
          )}
          {dlg?.type === 'scale' && selected && (
            <ScaleDialog recipe={selected} ING={ING} molds={MOLDS} onClose={() => setDlg(null)} />
          )}
        </div>
      )}

      {dlg?.type === 'login' && (
        <LoginDialog
          onClose={() => setDlg(null)}
          onSubmit={async pw => {
            const ok = await doLogin(pw)
            if (ok) { setDlg(null); if (dlg.enterAfter) navigate('/r') }
            return ok
          }}
        />
      )}
      <ToastHost />
    </>
  )
}
