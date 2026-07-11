/* POST /api/auth/terms — 記錄使用者同意條款的時間(善盡提醒義務的鐵證,
   存伺服器而非 localStorage,見 docs/legal/compliance.md 第五節)
   header: Authorization: Bearer <token>
   body: { kind: 'label' }(標示卡免責同意;之後有別的條款種類再擴充白名單) */

import { getDb, cors, readBody } from '../_lib/mongo.js'
import { verifyToken } from '../_lib/authToken.js'

const KINDS = { label: 'labelTermsAcceptedAt' }

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })

  const authz = req.headers['authorization'] || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  const payload = token ? verifyToken(token, process.env.AUTH_SECRET) : null
  if (!payload?.email) return res.status(401).json({ ok: false, error: '尚未登入' })

  const field = KINDS[readBody(req).kind]
  if (!field) return res.status(400).json({ ok: false, error: '無效的條款種類' })

  try {
    const db = await getDb()
    const r = await db.collection('users').updateOne(
      { email: payload.email },
      { $set: { [field]: new Date().toISOString() } },
    )
    if (!r.matchedCount) return res.status(404).json({ ok: false, error: '找不到帳號' })
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
