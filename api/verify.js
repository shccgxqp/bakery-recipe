/* POST /api/verify — 登入時驗證編輯密碼,body: { password } */

import { cors, checkPassword, readBody } from './_lib/mongo.js'

export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' })
  res.status(200).json({ ok: checkPassword(readBody(req).password) })
}
