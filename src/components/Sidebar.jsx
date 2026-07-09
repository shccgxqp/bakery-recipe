import { useState } from 'react'
import { calc, metrics, fmt } from '../lib/calc.js'
import { APP_VERSION } from '../config.js'
import Chip from './Chip.jsx'

const SORTS = [
  ['category', '分類'],
  ['cost', '成本'],
  ['margin', '利潤率'],
  ['name', '名稱'],
]

export default function Sidebar({
  groups, ING, RCP, selected, query, setQuery, searchRef,
  sortBy, setSortBy,
  allergenList, excludeAllergens, setExcludeAllergens,
  dataSource, ingsMode, moldsMode, trashMode, isEditor,
  onLogin, onLogout,
  onSelect, onNewRecipe, onToggleIngs, onToggleMolds,
  onShopping, onExportJSON, onChangelog, onTrash,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [allergyOpen, setAllergyOpen] = useState(false)
  const toggleAllergen = a => setExcludeAllergens(prev => {
    const next = new Set(prev)
    next.has(a) ? next.delete(a) : next.add(a)
    return next
  })

  return (
    <aside className="flex flex-col border-r border-line bg-paper-deep print:hidden md:sticky md:top-0 md:h-screen">
      <div className="flex items-start justify-between gap-2 border-b-[3px] border-ink px-4.5 pb-3.5 pt-5.5">
        <div>
          <h1 className="font-serif text-[22px] font-bold tracking-[.06em]">烘焙帳本</h1>
          <small className="block text-xs text-ink-soft">配方 · 成本 · 營養,一頁看完</small>
        </div>
        <button
          className="btn btn-sm shrink-0 md:hidden"
          onClick={() => setCollapsed(v => !v)}
          aria-expanded={!collapsed}
        >
          {collapsed ? '▸ 展開清單' : '▾ 收起清單'}
        </button>
      </div>

      <div className={(collapsed ? 'hidden ' : '') + 'md:contents'}>
      <div className="px-3.5 pb-1 pt-3">
        <input
          ref={searchRef} type="search" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋甜點…" aria-label="搜尋甜點"
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13.5px] placeholder:text-ink-soft"
        />
      </div>

      <div className="flex flex-wrap gap-1 px-3.5 pb-2 pt-2">
        {SORTS.map(([key, label]) => (
          <Chip key={key} size="sm" active={sortBy === key} onClick={() => setSortBy(key)}>{label}</Chip>
        ))}
        <Chip size="sm" tone="warn" active={excludeAllergens.size > 0} onClick={() => setAllergyOpen(v => !v)}>
          ⚠ 排除過敏原{excludeAllergens.size > 0 ? `(${excludeAllergens.size})` : ''}
        </Chip>
      </div>
      {allergyOpen && (
        <div className="flex flex-wrap gap-1 px-3.5 pb-2">
          {allergenList.map(a => (
            <Chip key={a} size="sm" tone="warn" active={excludeAllergens.has(a)} onClick={() => toggleAllergen(a)}>{a}</Chip>
          ))}
        </div>
      )}

      <div className="no-scrollbar max-h-[44vh] flex-1 overflow-y-auto pb-3 pt-1 md:max-h-none">
        {groups.cats.length === 0 && (
          <p className="p-4 text-[13px] text-ink-soft">找不到符合的甜點。</p>
        )}
        {groups.cats.map(cat => (
          <div key={cat} className="px-3.5 pb-1 pt-3.5">
            {!groups.flat && (
              <div className="mb-1 flex items-baseline justify-between border-b border-ink px-1 pb-1 text-[11.5px] font-bold tracking-[.14em] text-ink-soft">
                <span>{cat}</span>
                <span className="font-mono font-medium tracking-normal">{groups.g[cat].length}</span>
              </div>
            )}
            {groups.g[cat].map(r => {
              const c = calc(r, ING)
              const per = c.cost / (r.servings || 1)
              const m = groups.flat ? metrics(r, ING) : null
              const sel = r._id === selected
              return (
                <button
                  key={r._id} id={'ri-' + r._id}
                  onClick={() => onSelect(r._id)}
                  aria-current={sel}
                  className={
                    'flex w-full items-center justify-between gap-2 rounded-md border-l-[3px] py-1.5 pl-3 pr-2.5 text-left text-sm ' +
                    (sel
                      ? 'border-yolk bg-white font-bold shadow-[0_1px_0_var(--color-line),0_-1px_0_var(--color-line)]'
                      : 'border-transparent hover:bg-yolk-soft')
                  }
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{r.name}</span>
                    {groups.flat && (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-yolk-soft px-1.5 py-px text-[10px] font-normal text-ink-soft">
                        {r.category || '未分類'}
                      </span>
                    )}
                  </span>
                  <span className={'whitespace-nowrap font-mono text-xs ' + (sel ? 'text-yolk' : 'text-ink-soft')}>
                    {sortBy === 'margin'
                      ? (m.margin == null ? '未定價' : `${fmt(m.margin)}%`)
                      : `$${fmt(per, 1)}/份`}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-3.5">
        {isEditor && (
          <button className="btn btn-primary" onClick={onNewRecipe}>＋ 新增食譜</button>
        )}
        <div className="flex gap-2">
          <button className={'btn flex-1 ' + (ingsMode ? 'btn-active' : '')} onClick={onToggleIngs}>材料主檔</button>
          <button className={'btn flex-1 ' + (moldsMode ? 'btn-active' : '')} onClick={onToggleMolds}>模具庫</button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm flex-1" onClick={onShopping}>🛒 採購清單</button>
          <button className="btn btn-sm flex-1" onClick={onExportJSON} title="下載全部資料的 JSON 備份">⬇ 備份</button>
        </div>
        {isEditor && (
          <button className={'btn btn-sm ' + (trashMode ? 'btn-active' : '')} onClick={onTrash}>🗑 回收桶</button>
        )}
        <div className="text-center font-mono text-[11.5px] tracking-[.04em] text-ink-soft">
          {RCP.length} 道甜點 · {Object.keys(ING).length} 種材料 · 資料:{dataSource}
        </div>
        <button className="text-center font-mono text-[10.5px] text-ink-soft/70 underline decoration-dotted underline-offset-2 hover:text-ink"
          onClick={onChangelog} title="看每一版更新了什麼">
          v{APP_VERSION} · 更新紀錄
        </button>
        {isEditor ? (
          <button className="text-center text-[11.5px] text-ink-soft underline hover:text-ink" onClick={onLogout}>
            登出編輯模式
          </button>
        ) : (
          <button className="text-center text-[11.5px] text-ink-soft underline hover:text-ink" onClick={onLogin}>
            🔑 我是主人,登入編輯
          </button>
        )}
      </div>
      </div>
    </aside>
  )
}
