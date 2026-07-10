/* 手刻的簽章 token(不是完整 JWT 標準庫,夠這裡用):header.payload.signature,
   HMAC-SHA256。帳號系統第一階段用它簽 Google 登入結果、簽 OAuth state
   (跨網域,不能用 cookie session,見 docs/roadmap.md 第 2 項)。 */

import { createHmac, timingSafeEqual } from 'crypto'

const b64url = input => Buffer.from(input).toString('base64url')
const fromB64url = str => Buffer.from(str, 'base64url')
const hmac = (data, secret) => b64url(createHmac('sha256', secret).update(data).digest())

export function signToken(payload, secret, expiresInSec = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = { ...payload, iat: now, exp: now + expiresInSec }
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`
  return `${data}.${hmac(data, secret)}`
}

export function verifyToken(token, secret) {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const expected = hmac(`${h}.${p}`, secret)
  const sigBuf = fromB64url(s), expBuf = fromB64url(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const payload = JSON.parse(fromB64url(p).toString('utf8'))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
