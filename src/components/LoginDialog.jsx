import { useState } from 'react'
import Dialog from './Dialog.jsx'

/* 登入編輯:取代原生 prompt(),跟站內其他對話框同一套風格+focus trap */
export default function LoginDialog({ onSubmit, onClose }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!pw) return
    setChecking(true)
    setError('')
    try {
      const ok = await onSubmit(pw)
      if (!ok) setError('密碼錯誤,再試一次。')
    } catch (err) {
      setError('驗證失敗:' + err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <Dialog
      title="登入編輯"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={checking}>取消</button>
          <button type="submit" form="login-form" className="btn btn-primary" disabled={checking || !pw}>
            {checking ? '驗證中…' : '登入'}
          </button>
        </>
      }
    >
      <form id="login-form" onSubmit={submit}>
        <div className="field">
          <label>編輯密碼</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus required />
        </div>
        {error && <p className="mt-2 text-[13px] text-warn">{error}</p>}
      </form>
    </Dialog>
  )
}
