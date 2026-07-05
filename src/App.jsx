import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { INGREDIENTS, RECIPES } from './data/base.js'
import { SHEET_ID, SCRIPT_URL, AUTH_KEY, CAT_ORDER, LS_KEY } from './config.js'
import { calc, metrics } from './lib/calc.js'
import { loadFromSheet } from './lib/sheet.js'
import { pushToSheet, verifyPassword } from './lib/sync.js'
import { exportFiles } from './lib/exportFiles.js'
import Sidebar from './components/Sidebar.jsx'
import Detail from './components/Detail.jsx'
import IngredientsView from './components/IngredientsView.jsx'
import RecipeDialog from './components/RecipeDialog.jsx'
import IngredientDialog from './components/IngredientDialog.jsx'

function loadEdits() {
  try {
    const e = JSON.parse(localStorage.getItem(LS_KEY))
    return { ingredients: e?.ingredients || {}, recipes: e?.recipes || {} }
  } catch {
    return { ingredients: {}, recipes: {} }
  }
}

export default function App() {
  const [base, setBase] = useState({ ing: INGREDIENTS, rcp: RECIPES })
  const [edits, setEdits] = useState(loadEdits)
  const [dataSource, setDataSource] = useState('內建檔案')
  const [syncStat, setSyncStat] = useState('待命')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('category') // category | cost | margin | name
  const [view, setView] = useState('recipe') // recipe | ings
  const [selName, setSelName] = useState(null)
  const [dlg, setDlg] = useState(null) // {type:'recipe',recipe}|{type:'recipe',recipe:null}|{type:'ing',name}
  const [auth, setAuth] = useState(() => localStorage.getItem(AUTH_KEY) || '')
  const isEditor = !!auth

  /* ---- 兩層合併:base + edits → 有效資料 ---- */
  const ING = useMemo(() => {
    const out = {}
    for (const n of Object.keys(base.ing)) if (!(n in edits.ingredients)) out[n] = base.ing[n]
    for (const [n, v] of Object.entries(edits.ingredients)) if (v) out[n] = v
    return out
  }, [base, edits])

  const RCP = useMemo(() => {
    const out = []
    for (const r of base.rcp) {
      if (r.name in edits.recipes) {
        const e = edits.recipes[r.name]
        if (e) out.push(e)
      } else out.push(r)
    }
    const baseNames = new Set(base.rcp.map(r => r.name))
    for (const [n, v] of Object.entries(edits.recipes)) if (v && !baseNames.has(n)) out.push(v)
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
        const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b)
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
  }, [RCP, ING, query, sortBy])

  const flat = useMemo(() => groups.cats.flatMap(c => groups.g[c].map(r => r.name)), [groups])
  const selected = RCP.find(r => r.name === selName) || RCP.find(r => r.name === flat[0]) || null

  /* ---- localStorage 持久化 ---- */
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(edits)) }, [edits])

  /* ---- 開站抓 Google Sheet ---- */
  useEffect(() => {
    loadFromSheet(SHEET_ID)
      .then(d => { setBase(d); setDataSource('Google Sheet ✓') })
      .catch(err => console.warn('Google Sheet 讀取失敗,使用內建資料:', err.message))
  }, [])

  /* ---- 雲端同步(debounce 1.5s) ---- */
  const latest = useRef({ ING, RCP })
  useEffect(() => { latest.current = { ING, RCP } }, [ING, RCP])

  const authRef = useRef(auth)
  useEffect(() => { authRef.current = auth }, [auth])

  const doPush = useCallback(async () => {
    if (!SCRIPT_URL) {
      alert('尚未設定 Apps Script 網址:部署 google-apps-script.gs 後,把 /exec 網址填入 src/config.js 的 SCRIPT_URL。')
      return
    }
    if (!authRef.current) { setSyncStat('未登入,修改僅存本機'); return }
    setSyncStat('寫入中…')
    try {
      const { ING: i, RCP: r } = latest.current
      await pushToSheet(SCRIPT_URL, authRef.current, i, r)
      setBase({ ing: structuredClone(i), rcp: structuredClone(r) })
      setEdits({ ingredients: {}, recipes: {} })
      setDataSource('Google Sheet ✓')
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
      const ok = await verifyPassword(SCRIPT_URL, pw)
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
    if (!SCRIPT_URL) return
    clearTimeout(syncTimer.current)
    setSyncStat('等待寫入…')
    syncTimer.current = setTimeout(doPush, 1500)
  }, [doPush])

  /* ---- 資料操作 ---- */
  const saveRecipe = (origName, obj) => {
    setEdits(prev => {
      const recipes = { ...prev.recipes }
      if (origName && origName !== obj.name) recipes[origName] = null
      recipes[obj.name] = obj
      return { ...prev, recipes }
    })
    setSelName(obj.name)
    setView('recipe')
    setDlg(null)
    touchSync()
  }
  const deleteRecipe = name => {
    if (!confirm(`刪除「${name}」?(可用「全部還原」找回原始資料)`)) return
    setEdits(prev => ({ ...prev, recipes: { ...prev.recipes, [name]: null } }))
    if (selName === name) setSelName(null)
    touchSync()
  }
  const saveIng = (origName, name, data) => {
    setEdits(prev => {
      const ingredients = { ...prev.ingredients }
      if (origName && origName !== name) ingredients[origName] = null
      ingredients[name] = data
      return { ...prev, ingredients }
    })
    setDlg(null)
    touchSync()
  }
  const deleteIng = name => {
    const used = RCP.filter(r => r.items.some(([n]) => n === name)).map(r => r.name)
    const msg = used.length
      ? `「${name}」被 ${used.length} 道食譜使用(${used.slice(0, 5).join('、')}${used.length > 5 ? '…' : ''}),刪除後這些食譜會顯示缺料。確定刪除?`
      : `刪除「${name}」?`
    if (!confirm(msg)) return
    setEdits(prev => ({ ...prev, ingredients: { ...prev.ingredients, [name]: null } }))
    touchSync()
  }
  const resetEdits = () => {
    if (!confirm(`清除全部 ${editCount} 筆本機修改,回到原始資料?`)) return
    setEdits({ ingredients: {}, recipes: {} })
  }

  /* ---- 鍵盤:↑↓ 切換、/ 搜尋 ---- */
  const searchRef = useRef(null)
  useEffect(() => {
    const onKey = e => {
      if (dlg) return
      if (e.target.tagName === 'INPUT') {
        if (e.key === 'Escape') { setQuery(''); e.target.blur() }
        return
      }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (!flat.length) return
      e.preventDefault()
      const pos = flat.indexOf(selected?.name)
      const next = e.key === 'ArrowDown'
        ? flat[Math.min(pos + 1, flat.length - 1)]
        : flat[Math.max(pos - 1, 0)]
      setSelName(next)
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
        selected={view === 'recipe' ? selected?.name : null}
        query={query} setQuery={setQuery} searchRef={searchRef}
        sortBy={sortBy} setSortBy={setSortBy}
        dataSource={dataSource} editCount={editCount} syncStat={syncStat}
        hasScript={!!SCRIPT_URL} isEditor={isEditor}
        onLogin={login} onLogout={logout}
        onSelect={name => { setSelName(name); setView('recipe') }}
        onNewRecipe={() => setDlg({ type: 'recipe', recipe: null })}
        onToggleIngs={() => setView(view === 'ings' ? 'recipe' : 'ings')}
        ingsMode={view === 'ings'}
        onPush={doPush} onExport={() => exportFiles(ING, RCP)} onReset={resetEdits}
      />
      <main className="min-w-0 px-4 pb-20 pt-5 md:px-9 md:pt-7">
        {view === 'ings' ? (
          <IngredientsView ING={ING} isEditor={isEditor}
            onEdit={name => setDlg({ type: 'ing', name })}
            onAdd={() => setDlg({ type: 'ing', name: null })}
            onDelete={deleteIng} />
        ) : selected ? (
          <Detail recipe={selected} ING={ING} isEditor={isEditor}
            onEdit={() => setDlg({ type: 'recipe', recipe: selected })}
            onDelete={() => deleteRecipe(selected.name)} />
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
        <IngredientDialog name={dlg.name} ING={ING}
          onSave={saveIng} onClose={() => setDlg(null)} />
      )}
    </div>
  )
}
