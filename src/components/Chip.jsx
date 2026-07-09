/* 共用切換樣式按鈕(過敏原勾選、排序、單位切換…全站同一套視覺,呼叫端自己管選取邏輯) */
const SIZES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-[12px]',
  lg: 'px-3 py-1 text-[13px]',
}

export default function Chip({ active, onClick, size = 'md', tone, children, ...rest }) {
  const toneClass = tone === 'warn'
    ? (active ? 'border-warn bg-warn/10 font-bold text-warn' : 'border-line text-ink-soft hover:border-warn')
    : (active ? 'border-ink bg-yolk-soft font-bold' : 'border-line text-ink-soft hover:border-yolk')
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-full border ${SIZES[size]} ${toneClass}`}
      {...rest}
    >
      {children}
    </button>
  )
}
