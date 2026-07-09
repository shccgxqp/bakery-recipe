import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AUTH_KEY, LS_CACHE, DEFAULT_CAT_ORDER, DEFAULT_ALLERGENS, DEFAULT_ING_CAT_ORDER } from './config.js'
import { calc, metrics, allergenSummary } from './lib/calc.js'
import { loadData, pushData, verifyPassword } from './lib/api.js'
import Sidebar from './components/Sidebar.jsx'
import Detail from './components/Detail.jsx'
import IngredientsView from './components/IngredientsView.jsx'
import ChangelogView from './components/ChangelogView.jsx'
import MoldsView from './components/MoldsView.jsx'
import RecipeDialog from './components/RecipeDialog.jsx'
import IngredientDialog from './components/IngredientDialog.jsx'
import ShoppingDialog from './components/ShoppingDialog.jsx'
import MoldDialog from './components/MoldDialog.jsx'
import ScaleDialog from './components/ScaleDialog.jsx'
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
  const [view, setView] = useState('recipe') // recipe | ings | molds | changelog
  const [selId, setSelId] = useState(null)
  const [dlg, setDlg] = useState(null) // {type:'recipe'|'ing'|'mold'|'shopping'|'scale', ...}
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
  const selected = RCP.find(r => r._id === selId) || RCP.find(r => r._id === flat[0]) || null

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

  const write = useCallback(async ({ upserts, deletes }) => {
    if (!authRef.current) throw new Error('尚未登入')
    try {
      await pushData(authRef.current, upserts || {}, deletes || {})
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

  /* ---- 登入 / 登出 ---- */
  const login = useCallback(async () => {
    const pw = prompt('輸入編輯密碼:')
    if (!pw) return
    try {
      const ok = await verifyPassword(pw)
      if (!ok) { alert('密碼錯誤'); return }
      setAuth(pw)
      localStorage.setItem(AUTH_KEY, pw)
    } catch (err) {
      alert('驗證失敗:' + err.message)
    }
  }, [])
  const logout = useCallback(() => {
    setAuth('')
    localStorage.removeItem(AUTH_KEY)
  }, [])

  /* ---- 資料操作(全部以 _id 為 key;新資料由前端產生 UUID) ----
     save 由對話框 await,失敗時對話框留在原地顯示錯誤 */
  const saveRecipe = async (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    if (doc.sortOrder == null) doc.sortOrder = Math.max(0, ...RCP.map(r => r.sortOrder || 0)) + 10
    await write({ upserts: { recipes: [doc] } })
    setSelId(_id)
    setView('recipe')
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
      if (selId === r._id) setSelId(null)
    } catch (err) { alert('刪除失敗:' + err.message) }
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
    } catch (err) { alert('刪除失敗:' + err.message) }
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
    } catch (err) { alert('刪除失敗:' + err.message) }
  }

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
      setSelId(next)
      setView('recipe')
      document.getElementById('ri-' + next)?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dlg, flat, selected])

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[272px_minmax(0,1fr)] print:block">
      <Sidebar
        groups={groups} ING={ING} RCP={RCP}
        selected={view === 'recipe' ? selected?._id : null}
        query={query} setQuery={setQuery} searchRef={searchRef}
        sortBy={sortBy} setSortBy={setSortBy}
        allergenList={allergenList}
        excludeAllergens={excludeAllergens} setExcludeAllergens={setExcludeAllergens}
        dataSource={dataSource} isEditor={isEditor}
        onLogin={login} onLogout={logout}
        onSelect={id => { setSelId(id); setView('recipe') }}
        onNewRecipe={() => setDlg({ type: 'recipe', recipe: null })}
        onToggleIngs={() => setView(view === 'ings' ? 'recipe' : 'ings')}
        ingsMode={view === 'ings'}
        onToggleMolds={() => setView(view === 'molds' ? 'recipe' : 'molds')}
        moldsMode={view === 'molds'}
        onShopping={() => setDlg({ type: 'shopping' })}
        onExportJSON={() => exportBackupJSON(base)}
        onChangelog={() => setView('changelog')}
      />
      <main className="min-w-0 px-4 pb-20 pt-5 md:px-9 md:pt-7">
        {view === 'changelog' ? (
          <ChangelogView />
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
  )
}
