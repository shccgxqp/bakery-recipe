import { useEffect } from 'react'

/* 共用對話框外框:蛋黃帳本風格 */
export default function Dialog({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[560px] flex-col border-[2.5px] border-ink bg-paper"
        onMouseDown={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="border-b-[6px] border-ink px-4.5 pb-2.5 pt-3.5 font-serif text-[19px] font-bold tracking-[.1em]">
          {title}
        </div>
        <div className="overflow-y-auto px-4.5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t-2 border-ink px-4.5 py-3">{footer}</div>
      </div>
    </div>
  )
}
