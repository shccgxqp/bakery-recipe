import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerWithPassword } from '../lib/googleAuth.js'
import { toast } from '../lib/toast.js'

export default function RegisterView({ onAuthChange }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tosAccepted, setTosAccepted] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!email || !password || !tosAccepted) return
    setBusy(true)
    try {
      await registerWithPassword(email, password, displayName, tosAccepted)
      onAuthChange()
      /* 註冊時沒填暱稱 → 引導去個人頁補(真名/email 永不公開) */
      navigate(displayName.trim() ? '/r' : '/me')
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[380px] flex-col justify-center gap-6 px-5 py-10">
      <div>
        <h1 className="font-serif text-[26px] font-bold tracking-[.06em]">註冊</h1>
        <p className="mt-1 text-[13px] text-ink-soft">用信箱密碼建立帳號(密碼至少 8 碼)。</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="field">
          <label htmlFor="reg-email">信箱</label>
          <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="reg-name">暱稱(選填)</label>
          <input id="reg-name" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="reg-password">密碼</label>
          <input id="reg-password" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
        </div>

        <div className="text-[12.5px] leading-relaxed">
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" className="mt-0.5" checked={tosAccepted}
              onChange={e => setTosAccepted(e.target.checked)} required />
            <span>我已閱讀並同意服務條款(見下)</span>
          </label>
          <details className="mt-1.5 rounded-[--radius-sm] border border-line bg-paper-deep px-3 py-2 text-ink-soft">
            <summary className="cursor-pointer font-bold">服務條款(點開閱讀)</summary>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>本站營養標示為依材料資料理論加總之試算值,僅供研發與個人烘焙參考,不具法律效力。</li>
              <li>實際成品受製程、食材差異、水分蒸發影響,數值可能明顯誤差;本站不保證符合《食品安全衛生管理法》及相關遵行事項之抽驗標準。</li>
              <li>將本站數據用於商業販售、包裝或廣告,一切法律責任(含標示不實之行政裁罰)由使用者自行承擔;正式量產應送 SGS、台美檢驗等公正單位實際化驗。</li>
            </ol>
          </details>
        </div>

        <button className="btn btn-primary" disabled={busy || !tosAccepted} type="submit">
          {busy ? '註冊中…' : '註冊'}
        </button>
      </form>

      <p className="text-center text-[13px] text-ink-soft">
        已經有帳號?<button className="underline hover:text-ink" onClick={() => navigate('/login')}>登入</button>
      </p>
    </div>
  )
}
