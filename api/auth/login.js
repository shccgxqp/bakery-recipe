/* POST /api/auth/login {email, password}
   基本防爆力破解:連續失敗 5 次鎖 15 分鐘,鎖定/計數存在該 users 文件上,
   不用額外的 rate-limit 服務,這個規模夠用。 */

import { getDb, cors, readBody } from '../_lib/mongo.js'
import { verifyPassword } from '../_lib/password.js'
import { signToken } from '../_lib/authToken.js'

const LOCK_AFTER = 5
const LOCK_MINUTES = 15

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })

  const body = readBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) return res.status(400).json({ ok: false, error: '請輸入信箱與密碼' })

  try {
    const db = await getDb()
    const col = db.collection('users')
    const user = await col.findOne({ email })
    if (!user || !user.passwordHash) {
      return res.status(401).json({ ok: false, error: '信箱或密碼錯誤' })
    }
    if (user.suspended) return res.status(403).json({ ok: false, error: '這個帳號已被停用' })

    const now = new Date()
    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
      const mins = Math.ceil((new Date(user.lockedUntil) - now) / 60000)
      return res.status(423).json({ ok: false, error: `登入失敗次數過多,請 ${mins} 分鐘後再試。` })
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      const failedAttempts = (user.failedAttempts || 0) + 1
      const patch = { failedAttempts, updatedAt: now.toISOString() }
      if (failedAttempts >= LOCK_AFTER) {
        patch.lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60000).toISOString()
        patch.failedAttempts = 0
      }
      await col.updateOne({ _id: user._id }, { $set: patch })
      return res.status(401).json({ ok: false, error: '信箱或密碼錯誤' })
    }

    await col.updateOne({ _id: user._id }, { $set: { failedAttempts: 0, lockedUntil: null, updatedAt: now.toISOString() } })
    const token = signToken(
      { sub: user._id, email: user.email, displayName: user.displayName || '', role: user.role || 'user' },
      process.env.AUTH_SECRET,
    )
    res.status(200).json({ ok: true, token })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
