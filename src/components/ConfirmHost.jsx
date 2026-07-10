import { useEffect, useState } from 'react'
import Dialog from './Dialog.jsx'
import { subscribeConfirm, answerConfirm } from '../lib/confirm.js'

/* 掛在 App.jsx 根層一次即可;取代全站的 confirm()。body 可以是純文字
   (自動依換行拆成多段落)或 JSX,長版合規同意文字用這個顯示比原生 confirm 清楚。 */
export default function ConfirmHost() {
  const [state, setState] = useState(null)
  useEffect(() => subscribeConfirm(setState), [])
  if (!state) return null

  const { title = '請確認', body = '', confirmText = '確定', cancelText = '取消', danger = false } = state.req

  return (
    <Dialog
      title={title}
      onClose={() => answerConfirm(false)}
      footer={
        <>
          <button className="btn" onClick={() => answerConfirm(false)}>{cancelText}</button>
          <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={() => answerConfirm(true)}>
            {confirmText}
          </button>
        </>
      }
    >
      <div className="space-y-2">
        {typeof body === 'string'
          ? body.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} className="text-[13.5px] leading-relaxed text-ink">{line}</p>
          ))
          : body}
      </div>
    </Dialog>
  )
}
