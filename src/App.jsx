import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AUTH_KEY, LS_EDITS, LS_CACHE, DEFAULT_CAT_ORDER, DEFAULT_ALLERGENS } from './config.js'
import { calc, metrics } from './lib/calc.js'
import { loadData, pushData, verifyPassword } from './lib/api.js'
import Sidebar from './components/Sidebar.jsx'
import Detail from './components/Detail.jsx'
import IngredientsView from './components/IngredientsView.jsx'
import RecipeDialog from './components/RecipeDialog.jsx'
import IngredientDialog from './components/IngredientDialog.jsx'

function loadEdits() {
  try {
    const e = JSON.parse(localStorage.getItem(LS_EDITS))
    return { ingredients: e?.ingredients || {}, recipes: e?.recipes || {} }
  } catch {
    return { ingredients: {}, recipes: {} }
  }
}

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(LS_CACHE))
    if (Array.isArray(c?.ingredients) && Array.isArray(c?.recipes)) return c
  } catch { /* 快取壞掉就當沒有 */ }
  return { ingredients: [], recipes: [], settings: null }
}

export default function App() {
  const [base, setBase] = useState(loadCache)
  const [edits, setEdits] = useState(loadEdits)
  const [dataSource, setDataSource] = useState('讀取中…')
  const [syncStat, setSyncStat] = useState('待命')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('category') // category | cost | margin | name
  const [view, setView] = useState('recipe') // recipe | ings
  const [selId, setSelId] = useState(null)
  const [dlg, setDlg] = useState(null) // {type:'recipe',recipe|null} | {type:'ing',id|null}
  const [auth, setAuth] = useState(() => localStorage.getItem(AUTH_KEY) || '')
  const isEditor = !!auth

  const catOrder = base.settings?.catOrder || DEFAULT_CAT_ORDER
  const allergenList = base.settings?.allergenList || DEFAULT_ALLERGENS

  /* ---- 兩層合併(以 _id 為 key):base + edits → 有效資料 ---- */
  const ING = useMemo(() => {
    const out = {}
    for (const i of base.ingredients) if (!(i._id in edits.ingredients)) out[i._id] = i
    for (const [id, v] of Object.entries(edits.ingredients)) if (v) out[id] = v
    return out
  }, [base, edits])

  const RCP = useMemo(() => {
    const out = []
    const seen = new Set()
    for (const r of base.recipes) {
      seen.add(r._id)
      if (r._id in edits.recipes) {
        const e = edits.recipes[r._id]
        if (e) out.push(e)
      } else out.push(r)
    }
    for (const [id, v] of Object.entries(edits.recipes)) if (v && !seen.has(id)) out.push(v)
    return out
  }, [base, edits])

  const editCount = Object.keys(edits.ingredients).length + Object.keys(edits.recipes).length

  /* ---- 分類分組(含搜尋 + 排序) ----
     sortBy==='category': 依分類分組,組內照原順序(預設)
     其他:不分組,單一清單依指標排序,缺值(如未定價)沉底 */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = RCP.filter(r => !q || r.name.toLowerCase().includes(q))

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
  }, [RCP, ING, query, sortBy, catOrder])

  const flat = useMemo(() => groups.cats.flatMap(c => groups.g[c].map(r => r._id)), [groups])
  const selected = RCP.find(r => r._id === selId) || RCP.find(r => r._id === flat[0]) || null

  /* ---- localStorage 持久化 ---- */
  useEffect(() => { localStorage.setItem(LS_EDITS, JSON.stringify(edits)) }, [edits])

  /* ---- 開站讀 API(成功就更新離線快取) ---- */
  useEffect(() => {
    localStorage.removeItem('bakery-edits-v1') // 舊版暫存格式,不相容,直接清掉
    loadData()
      .then(d => {
        setBase(d)
        localStorage.setItem(LS_CACHE, JSON.stringify(d))
        setDataSource('雲端 ✓')
      })
      .catch(err => {
        console.warn('API 讀取失敗,使用離線快取:', err.message)
        setDataSource(loadCache().ingredients.length ? '離線快取' : '無資料(離線)')
      })
  }, [])

  /* ---- 雲端同步(debounce 1.5s):送出本機修改,成功後以伺服器回讀為準 ---- */
  const editsRef = useRef(edits)
  useEffect(() => { editsRef.current = edits }, [edits])

  const authRef = useRef(auth)
  useEffect(() => { authRef.current = auth }, [auth])

  const doPush = useCallback(async () => {
    if (!authRef.current) { setSyncStat('未登入,修改僅存本機'); return }
    setSyncStat('寫入中…')
    try {
      const e = editsRef.current
      const upserts = {
        ingredients: Object.values(e.ingredients).filter(Boolean),
        recipes: Object.values(e.recipes).filter(Boolean),
      }
      const deletes = {
        ingredients: Object.entries(e.ingredients).filter(([, v]) => !v).map(([id]) => id),
        recipes: Object.entries(e.recipes).filter(([, v]) => !v).map(([id]) => id),
      }
      await pushData(authRef.current, upserts, deletes)
      const d = await loadData()
      setBase(d)
      localStorage.setItem(LS_CACHE, JSON.stringify(d))
      setEdits({ ingredients: {}, recipes: {} })
      setDataSource('雲端 ✓')
      setSyncStat('已寫入 ✓ ' + new Date().toLocaleTimeString('zh-TW', { hour12: false }))
    } catch (err) {
      if (err.message === '密碼錯誤') {
        setAuth(''); localStorage.removeItem(AUTH_KEY)
        setSyncStat('密碼失效,請重新登入(修改已存本機)')
      } else {
        setSyncStat(`失敗:${err.message}(修改已存本機)`)
      }
    }
  }, [])

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

  const syncTimer = useRef(null)
  const touchSync = useCallback(() => {
    clearTimeout(syncTimer.current)
    setSyncStat('等待寫入…')
    syncTimer.current = setTimeout(doPush, 1500)
  }, [doPush])

  /* ---- 資料操作(全部以 _id 為 key;新資料由前端產生 UUID) ---- */
  const saveRecipe = (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    if (doc.sortOrder == null) doc.sortOrder = Math.max(0, ...RCP.map(r => r.sortOrder || 0)) + 10
    setEdits(prev => ({ ...prev, recipes: { ...prev.recipes, [_id]: doc } }))
    setSelId(_id)
    setView('recipe')
    setDlg(null)
    touchSync()
  }
  const deleteRecipe = r => {
    if (!confirm(`刪除「${r.name}」?(刪除後可請管理者從資料庫救回)`)) return
    setEdits(prev => ({ ...prev, recipes: { ...prev.recipes, [r._id]: null } }))
    if (selId === r._id) setSelId(null)
    touchSync()
  }
  const saveIng = (orig, obj) => {
    const _id = orig?._id || crypto.randomUUID()
    const doc = { ...orig, ...obj, _id }
    setEdits(prev => ({ ...prev, ingredients: { ...prev.ingredients, [_id]: doc } }))
    setDlg(null)
    touchSync()
  }
  const deleteIng = id => {
    const ing = ING[id]
    if (!ing) return
    const used = RCP.filter(r => r.items.some(it => it.ingredientId === id)).map(r => r.name)
    const msg = used.length
      ? `「${ing.name}」被 ${used.length} 道食譜使用(${used.slice(0, 5).join('、')}${used.length > 5 ? '…' : ''}),刪除後這些食譜會顯示缺料。確定刪除?`
      : `刪除「${ing.name}」?`
    if (!confirm(msg)) return
    setEdits(prev => ({ ...prev, ingredients: { ...prev.ingredients, [id]: null } }))
    touchSync()
  }
  const resetEdits = () => {
    if (!confirm(`清除全部 ${editCount} 筆本機修改,回到雲端資料?`)) return
    setEdits({ ingredients: {}, recipes: {} })
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
        dataSource={dataSource} editCount={editCount} syncStat={syncStat}
        isEditor={isEditor}
        onLogin={login} onLogout={logout}
        onSelect={id => { setSelId(id); setView('recipe') }}
        onNewRecipe={() => setDlg({ type: 'recipe', recipe: null })}
        onToggleIngs={() => setView(view === 'ings' ? 'recipe' : 'ings')}
        ingsMode={view === 'ings'}
        onPush={doPush} onReset={resetEdits}
      />
      <main className="min-w-0 px-4 pb-20 pt-5 md:px-9 md:pt-7">
        {view === 'ings' ? (
          <IngredientsView ING={ING} isEditor={isEditor}
            onEdit={id => setDlg({ type: 'ing', id })}
            onAdd={() => setDlg({ type: 'ing', id: null })}
            onDelete={deleteIng} />
        ) : selected ? (
          <Detail recipe={selected} ING={ING} isEditor={isEditor}
            onEdit={() => setDlg({ type: 'recipe', recipe: selected })}
            onDelete={() => deleteRecipe(selected)} />
        ) : (
          <p className="mt-10 text-sm text-ink-soft">請從左側選一道甜點,或按「＋ 新增食譜」。</p>
        )}
        <p className="mt-7 hidden text-xs text-ink-soft md:block print:hidden">
          小技巧:<kbd>↑</kbd> <kbd>↓</kbd> 在清單中切換甜點,<kbd>/</kbd> 跳到搜尋。
        </p>
      </main>

      {dlg?.type === 'recipe' && (
        <RecipeDialog recipe={dlg.recipe} ING={ING} RCP={RCP}
          onSave={saveRecipe} onClose={() => setDlg(null)} />
      )}
      {dlg?.type === 'ing' && (
        <IngredientDialog ing={dlg.id ? ING[dlg.id] : null} allergenList={allergenList}
          onSave={saveIng} onClose={() => setDlg(null)} />
      )}
    </div>
  )
}
