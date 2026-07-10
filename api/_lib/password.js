/* 密碼雜湊:Node 內建 scrypt(adaptive KDF),不裝 bcrypt/argon2 這類套件,
   跟 authToken.js 手刻風格一致。存成 "<salt hex>:<hash hex>",驗證用
   timingSafeEqual 比對(不能用 === ,避免時間側錄攻擊)。 */

import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const KEY_LEN = 64

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scryptAsync(password, salt, KEY_LEN)
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, hashHex] = stored.split(':')
  const hash = await scryptAsync(password, salt, KEY_LEN)
  const stored_ = Buffer.from(hashHex, 'hex')
  if (stored_.length !== hash.length) return false
  return timingSafeEqual(hash, stored_)
}
