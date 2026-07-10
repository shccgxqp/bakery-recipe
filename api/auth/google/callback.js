/* GET /api/auth/google/callback?code=...&state=...
   Google 導回來的落點:驗 state → 拿 code 跟 Google 換 id_token → 驗證 →
   用 email 查/建 users 文件(帳號整合靠 email,不是靠登入方式)→
   簽一組跟信箱密碼登入同格式的 token → 302 回前端,網址帶 ?token=...
   (不是 #,HashRouter 的 # 是路由用的,query string 才不會撞在一起)。 */

import { randomUUID } from 'crypto'
import { getDb, cors } from '../../_lib/mongo.js'
import { signToken, verifyToken } from '../../_lib/authToken.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { code, state } = req.query
  const statePayload = typeof state === 'string' ? verifyToken(state, process.env.AUTH_SECRET) : null
  if (typeof code !== 'string' || !statePayload?.returnTo) {
    res.status(400).send('登入失敗:請求無效(state 驗證失敗或缺少授權碼),請重新登入。')
    return
  }

  try {
    const redirectUri = `https://${req.headers.host}/api/auth/google/callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.id_token) throw new Error(tokenJson.error_description || '跟 Google 換權杖失敗')

    /* 用 Google 的 tokeninfo 端點驗證 id_token(簽章+效期它幫忙驗,不用自己拉 JWKS) */
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenJson.id_token)}`)
    const claims = await infoRes.json()
    if (!infoRes.ok || claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('id_token 驗證失敗')

    const email = (claims.email || '').toLowerCase()
    if (!email) throw new Error('這個 Google 帳號沒有 email,無法登入')

    const db = await getDb()
    const col = db.collection('users')
    const now = new Date().toISOString()
    let user = await col.findOne({ email })

    if (user) {
      const patch = { googleSub: claims.sub, updatedAt: now }
      if (!user.displayName && claims.name) patch.displayName = claims.name
      await col.updateOne({ _id: user._id }, { $set: patch })
      user = { ...user, ...patch }
    } else {
      user = {
        _id: randomUUID(), email, passwordHash: null, googleSub: claims.sub,
        emailVerified: claims.email_verified === 'true' || claims.email_verified === true,
        displayName: claims.name || '', role: 'user', failedAttempts: 0, lockedUntil: null,
        createdAt: now, updatedAt: now,
      }
      await col.insertOne(user)
    }

    const ourToken = signToken(
      { sub: user._id, email: user.email, displayName: user.displayName || '', role: user.role || 'user', picture: claims.picture || '' },
      process.env.AUTH_SECRET,
      60 * 60 * 24 * 30, // 30 天
    )

    const url = new URL(statePayload.returnTo)
    url.searchParams.set('token', ourToken)
    res.writeHead(302, { Location: url.toString() })
    res.end()
  } catch (err) {
    res.status(500).send('登入失敗:' + err.message)
  }
}
