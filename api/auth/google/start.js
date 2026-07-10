/* GET /api/auth/google/start?return_to=<前端網址>
   組 Google 授權網址並 302 過去。return_to 限定在白名單網域(前端在 GitHub Pages,
   跨網域不能用 cookie session,所以走「網址帶 token」這條路——見 callback.js)。 */

import { cors } from '../../_lib/mongo.js'
import { signToken } from '../../_lib/authToken.js'

const ALLOWED_ORIGINS = ['https://shccgxqp.github.io', 'http://localhost:5173']

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const returnTo = typeof req.query.return_to === 'string' ? req.query.return_to : ''
  if (!returnTo || !ALLOWED_ORIGINS.some(o => returnTo.startsWith(o))) {
    return res.status(400).json({ ok: false, error: '無效的 return_to' })
  }

  /* state 簽 5 分鐘效期,防止 CSRF/竄改;不用伺服器端存 session,驗簽章就夠 */
  const state = signToken({ returnTo }, process.env.AUTH_SECRET, 300)
  const redirectUri = `https://${req.headers.host}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  res.end()
}
