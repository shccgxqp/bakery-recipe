import { useRef } from 'react'

/* 共用分頁籤(食譜詳細頁/個人頁共用,見 docs/design-guide.md Part 3 備忘)。
   視覺走帳本規線語彙:tablist 底線 2px,選中籤 border-ink + 粗體,
   不用圓角卡片/陰影。鍵盤 ←→ 循環切換,aria-selected 對應。
   面板由父層管理(建議用 hidden class 而非 unmount,列印時 print:block
   全部顯示,不破壞現有「列印食譜卡」整頁輸出)。 */
export default function Tabs({ tabs, active, onChange, className = '' }) {
  const refs = useRef({})
  const visible = tabs.filter(t => !t.hidden)

  const onKey = e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const idx = visible.findIndex(t => t.id === active)
    const next = e.key === 'ArrowRight'
      ? visible[(idx + 1) % visible.length]
      : visible[(idx - 1 + visible.length) % visible.length]
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <div role="tablist" onKeyDown={onKey}
      className={'flex flex-wrap gap-x-1 border-b-2 border-line print:hidden ' + className}>
      {visible.map(t => {
        const sel = t.id === active
        return (
          <button key={t.id} type="button" role="tab" aria-selected={sel}
            ref={el => { refs.current[t.id] = el }}
            tabIndex={sel ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={
              '-mb-[2px] border-b-2 px-3 py-1.5 text-[13.5px] tracking-[.04em] ' +
              (sel
                ? 'border-ink font-bold text-ink'
                : 'border-transparent text-ink-soft hover:border-line hover:text-ink')
            }>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
