/* GET/POST /api/auth/me — 讀取/更新自己的公開個人資料(暱稱/工作室名/個人網頁)
   header: Authorization: Bearer <token>
   GET  → { ok, profile: { displayName, studioName, website } }
   POST body: { displayName, studioName, website }
   POST 回傳 { ok, token }:重簽一顆帶新 displayName 的 token(順便從資料庫
   重新讀 role——站長升權後存個人資料就能拿到 owner token,不用登出重登)。 */

import { getDb, cors, readBody } from '../_lib/mongo.js'
import { signToken, verifyToken } from '../_lib/authToken.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  }

  const authz = req.headers['authorization'] || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  const payload = token ? verifyToken(token, process.env.AUTH_SECRET) : null
  if (!payload?.email) return res.status(401).json({ ok: false, error: '尚未登入' })

  if (req.method === 'GET') {
    try {
      const db = await getDb()
      const user = await db.collection('users').findOne({ email: payload.email })
      if (!user) return res.status(404).json({ ok: false, error: '找不到帳號' })
      return res.status(200).json({
        ok: true,
        profile: { displayName: user.displayName || '', studioName: user.studioName || '', website: user.website || '' },
      })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  const body = readBody(req)
  const displayName = String(body.displayName ?? '').trim().slice(0, 30)
  const studioName = String(body.studioName ?? '').trim().slice(0, 40)
  const website = String(body.website ?? '').trim().slice(0, 200)
  if (!displayName) return res.status(400).json({ ok: false, error: '暱稱不能是空的' })
  if (website && !/^https?:\/\//.test(website)) {
    return res.status(400).json({ ok: false, error: '個人網頁要以 http(s):// 開頭' })
  }

  try {
    const db = await getDb()
    const col = db.collection('users')
    const user = await col.findOne({ email: payload.email })
    if (!user) return res.status(404).json({ ok: false, error: '找不到帳號' })
    if (user.suspended) return res.status(403).json({ ok: false, error: '這個帳號已被停用' })

    await col.updateOne(
      { _id: user._id },
      { $set: { displayName, studioName, website, updatedAt: new Date().toISOString() } },
    )

    const fresh = signToken(
      { sub: user._id, email: user.email, displayName, role: user.role || 'user', picture: payload.picture || '' },
      process.env.AUTH_SECRET,
      60 * 60 * 24 * 30,
    )
    res.status(200).json({ ok: true, token: fresh })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
