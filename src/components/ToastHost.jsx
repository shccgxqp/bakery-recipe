import { useEffect, useRef, useState } from 'react'
import { subscribeToast } from '../lib/toast.js'

const DURATION = 5000

/* 掛在 App.jsx 根層一次即可;取代全站的 alert()。
   error 用 role="alert"(打斷),其餘 role="status"(不打斷);滑鼠/鍵盤停留時暫停計時。 */
export default function ToastHost() {
  const [items, setItems] = useState([])
  const timers = useRef({})

  useEffect(() => subscribeToast(t => {
    setItems(prev => [...prev, t])
    schedule(t.id)
  }), [])

  const schedule = id => {
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => dismiss(id), DURATION)
  }
  const pause = id => clearTimeout(timers.current[id])
  const dismiss = id => setItems(prev => prev.filter(t => t.id !== id))

  if (!items.length) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 print:hidden">
      {items.map(t => (
        <div key={t.id}
          role={t.type === 'error' ? 'alert' : 'status'}
          aria-live={t.type === 'error' ? 'assertive' : 'polite'}
          onMouseEnter={() => pause(t.id)} onMouseLeave={() => schedule(t.id)}
          onFocus={() => pause(t.id)} onBlur={() => schedule(t.id)}
          className={
            'dlg-panel pointer-events-auto flex max-w-md items-start gap-3 rounded-md border px-4 py-3 text-[13.5px] shadow-[0_4px_16px_-4px_rgba(27,24,19,.35)] ' +
            (t.type === 'error' ? 'border-warn bg-white text-warn'
              : t.type === 'success' ? 'border-ok bg-white text-ok'
              : 'border-ink bg-ink text-paper')
          }
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="關閉通知"
            className="shrink-0 font-bold opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  )
}
