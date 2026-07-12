import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithPassword, startGoogleLogin, getGoogleUser } from '../lib/googleAuth.js'
import { toast } from '../lib/toast.js'

/* 登入頁(取代 LoginDialog + 側欄測試表單)。沒有站長密碼欄位——
   Google 登入到你自己的帳號就是站長權限(role:"owner" 由資料庫決定)。 */
export default function LoginView({ onAuthChange }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!email || !password) return
    setBusy(true)
    try {
      await loginWithPassword(email, password)
      onAuthChange()
      /* 還沒設暱稱 → 引導去個人頁取暱稱(真名/email 永不公開) */
      navigate(getGoogleUser()?.displayName ? '/explore' : '/me')
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[380px] flex-col justify-center gap-6 px-5 py-10">
      <div>
        <h1 className="font-serif text-[26px] font-bold tracking-[.06em]">登入</h1>
        <p className="mt-1 text-[13px] text-ink-soft">登入後可以建立/編輯自己的食譜、材料、模具。</p>
      </div>

      <button className="btn btn-primary" onClick={startGoogleLogin}>使用 Google 登入</button>

      <div className="flex items-center gap-2 text-[12px] text-ink-soft">
        <div className="h-px flex-1 bg-line" /> 或用信箱密碼 <div className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="field">
          <label htmlFor="login-email">信箱</label>
          <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="login-password">密碼</label>
          <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? '登入中…' : '登入'}
        </button>
      </form>

      <p className="text-center text-[13px] text-ink-soft">
        還沒有帳號?<button className="underline hover:text-ink" onClick={() => navigate('/register')}>註冊</button>
      </p>
      <button className="text-center text-[12px] text-ink-soft underline hover:text-ink" onClick={() => navigate('/explore')}>
        ← 先逛逛,不登入
      </button>
    </div>
  )
}
