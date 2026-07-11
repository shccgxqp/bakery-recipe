/* POST /api/auth/register {email, password, displayName?}
   信箱+密碼註冊。同一個 email 如果之前只用 Google 登入過(沒設過密碼),
   這裡幫它「補設密碼」變成兩種都能登入,而不是拒絕或建重複帳號——
   帳號整合靠 email 一致,不是靠登入方式。 */

import { randomUUID } from 'crypto'
import { getDb, cors, readBody } from '../_lib/mongo.js'
import { hashPassword } from '../_lib/password.js'
import { signToken } from '../_lib/authToken.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })

  const body = readBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''

  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: '信箱格式不對' })
  if (password.length < 8) return res.status(400).json({ ok: false, error: '密碼至少要 8 碼' })
  if (!body.tosAccepted) return res.status(400).json({ ok: false, error: '請先閱讀並同意服務條款' })

  try {
    const db = await getDb()
    const col = db.collection('users')
    const existing = await col.findOne({ email })
    const now = new Date().toISOString()

    if (existing) {
      if (existing.passwordHash) {
        return res.status(409).json({ ok: false, error: '這個信箱已經註冊過了,請直接登入。' })
      }
      const passwordHash = await hashPassword(password)
      await col.updateOne({ _id: existing._id }, { $set: { passwordHash, tosAcceptedAt: now, updatedAt: now } })
      const token = signToken(
        { sub: existing._id, email, displayName: existing.displayName || '', role: existing.role || 'user' },
        process.env.AUTH_SECRET,
      )
      return res.status(200).json({ ok: true, token })
    }

    const _id = randomUUID()
    const passwordHash = await hashPassword(password)
    await col.insertOne({
      _id, email, passwordHash, googleSub: null, emailVerified: false,
      displayName, role: 'user', failedAttempts: 0, lockedUntil: null,
      tosAcceptedAt: now, createdAt: now, updatedAt: now,
    })
    const token = signToken({ sub: _id, email, displayName, role: 'user' }, process.env.AUTH_SECRET)
    res.status(200).json({ ok: true, token })
  } catch (err) {
    const msg = err.code === 11000 ? '這個信箱已經註冊過了' : err.message
    res.status(err.code === 11000 ? 409 : 500).json({ ok: false, error: msg })
  }
}
