import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/* 共用對話框外框:蛋黃帳本風格。開啟時鎖焦點在框內(Tab 循環),
   關閉時把焦點還給觸發按鈕——鍵盤/螢幕報讀使用者不會被拋到背景內容。 */
export default function Dialog({ title, onClose, children, footer }) {
  const panelRef = useRef(null)
  const prevFocus = useRef(null)

  useEffect(() => {
    prevFocus.current = document.activeElement
    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    ;(first || panel)?.focus()

    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled)
      if (!items.length) return
      const firstEl = items[0], lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocus.current?.focus?.()
    }
  }, [onClose])

  return (
    <div className="dlg-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="dlg-panel flex max-h-[85vh] w-full max-w-[560px] flex-col border-[2.5px] border-ink bg-paper"
        onMouseDown={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
        tabIndex={-1}
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
