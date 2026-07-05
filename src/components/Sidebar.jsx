import { calc, fmt } from '../lib/calc.js'

export default function Sidebar({
  groups, ING, RCP, selected, query, setQuery, searchRef,
  dataSource, editCount, syncStat, hasScript, ingsMode,
  onSelect, onNewRecipe, onToggleIngs, onPush, onExport, onReset,
}) {
  return (
    <aside className="flex flex-col border-r border-line bg-paper-deep md:sticky md:top-0 md:h-screen">
      <div className="border-b-[3px] border-ink px-4.5 pb-3.5 pt-5.5">
        <h1 className="font-serif text-[22px] font-bold tracking-[.06em]">烘焙帳本</h1>
        <small className="block text-xs text-ink-soft">配方 · 成本 · 營養,一頁看完</small>
      </div>

      <div className="px-3.5 pb-1 pt-3">
        <input
          ref={searchRef} type="search" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋甜點…" aria-label="搜尋甜點"
          className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13.5px] placeholder:text-ink-soft"
        />
      </div>

      <div className="max-h-[44vh] flex-1 overflow-y-auto pb-3 pt-1.5 md:max-h-none">
        {groups.cats.length === 0 && (
          <p className="p-4 text-[13px] text-ink-soft">找不到符合的甜點。</p>
        )}
        {groups.cats.map(cat => (
          <div key={cat} className="px-3.5 pb-1 pt-3.5">
            <div className="mb-1 flex items-baseline justify-between border-b border-ink px-1 pb-1 text-[11.5px] font-bold tracking-[.14em] text-ink-soft">
              <span>{cat}</span>
              <span className="font-mono font-medium tracking-normal">{groups.g[cat].length}</span>
            </div>
            {groups.g[cat].map(r => {
              const c = calc(r, ING)
              const sel = r.name === selected
              return (
                <button
                  key={r.name} id={'ri-' + r.name}
                  onClick={() => onSelect(r.name)}
                  aria-current={sel}
                  className={
                    'flex w-full items-center justify-between gap-2 rounded-md border-l-[3px] py-1.5 pl-3 pr-2.5 text-left text-sm ' +
                    (sel
                      ? 'border-yolk bg-white font-bold shadow-[0_1px_0_var(--color-line),0_-1px_0_var(--color-line)]'
                      : 'border-transparent hover:bg-yolk-soft')
                  }
                >
                  <span>{r.name}</span>
                  <span className={'whitespace-nowrap font-mono text-xs ' + (sel ? 'text-yolk' : 'text-ink-soft')}>
                    ${fmt(c.cost / (r.servings || 1), 1)}/份
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-3.5">
        {hasScript ? (
          <div className="rounded-lg border border-yolk bg-yolk-soft px-2.5 py-2 text-[12.5px] leading-relaxed">
            雲端同步:<b className="text-yolk">{syncStat}</b>
            {editCount > 0 && <> · 待同步 {editCount} 筆</>}
            <div className="mt-1.5 flex gap-1.5">
              <button className="btn btn-sm flex-1" onClick={onPush}>⇪ 寫入 Google Sheet</button>
              {editCount > 0 && <button className="btn btn-sm btn-danger flex-1" onClick={onReset}>還原</button>}
            </div>
          </div>
        ) : editCount > 0 && (
          <div className="rounded-lg border border-yolk bg-yolk-soft px-2.5 py-2 text-[12.5px] leading-relaxed">
            本機有 <b className="text-yolk">{editCount}</b> 筆修改(只存在這台瀏覽器)。
            <div className="mt-1.5 flex gap-1.5">
              <button className="btn btn-sm flex-1" onClick={onExport}>匯出資料檔</button>
              <button className="btn btn-sm btn-danger flex-1" onClick={onReset}>全部還原</button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={onNewRecipe}>＋ 新增食譜</button>
          <button className={'btn flex-1 ' + (ingsMode ? 'btn-active' : '')} onClick={onToggleIngs}>材料主檔</button>
        </div>
        <div className="text-center font-mono text-[11.5px] tracking-[.04em] text-ink-soft">
          {RCP.length} 道甜點 · {Object.keys(ING).length} 種材料 · 資料:{dataSource}
        </div>
      </div>
    </aside>
  )
}
